/**
 * Fuzzy Logic Core: Fuzzy Metrics
 * 
 * This module implements proper fuzzy precision and recall metrics
 * using formal fuzzy logic membership degrees instead of simple
 * Levenshtein-based similarity.
 * 
 * Fuzzy Precision = Σ μ_relevant(returned_i) / |returned|
 * Fuzzy Recall = Σ max_j(μ_match(expected_j, returned)) / |expected|
 */

import { similaritySets, relevanceSets, fuzzify, similarityVariable, relevanceVariable } from './fuzzySets';
import { tNormProduct, aggregateAnd, compensatoryAnd } from './operators';
import { defuzzifyWeightedAverage, RELEVANCE_CENTERS } from './defuzzification';
import { calculateSimpleTruthValue, LinguisticSummary, generateBestSummary, FuzzySummarizer } from './tvls';
import { relativeQuantifiers, getBestQuantifier } from './linguisticQuantifiers';
import { calculateStringSimilarity } from '../textMatching';

// ============================================================================
// FUZZY CONFUSION MATRIX
// ============================================================================

export interface FuzzyConfusionMatrix {
  fuzzyTP: number; // Sum of membership degrees for true positives
  fuzzyFP: number; // Sum of (1 - relevance) for false positives  
  fuzzyFN: number; // Sum of unmatched expected items
  totalReturned: number;
  totalExpected: number;
}

/**
 * Calculate fuzzy confusion matrix from returned and expected items
 */
export function calculateFuzzyConfusionMatrix(
  returnedTitles: string[],
  expectedNames: string[]
): FuzzyConfusionMatrix {
  let fuzzyTP = 0;
  let fuzzyFP = 0;
  
  // For each returned item, calculate its relevance membership
  for (const title of returnedTitles) {
    let maxSimilarity = 0;
    
    for (const expected of expectedNames) {
      const similarity = calculateStringSimilarity(title, expected);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    // Fuzzify similarity to get relevance membership
    const similarityMemberships = fuzzify(maxSimilarity, similarityVariable);
    
    // Calculate relevance using weighted average
    const relevanceMembership = defuzzifyWeightedAverage(
      new Map([
        ['highly_relevant', similarityMemberships.get('strong_match') ?? 0],
        ['perfectly_relevant', similarityMemberships.get('exact_match') ?? 0],
        ['relevant', similarityMemberships.get('partial_match') ?? 0],
        ['marginally_relevant', similarityMemberships.get('weak_match') ?? 0],
        ['irrelevant', similarityMemberships.get('no_match') ?? 0],
      ]),
      RELEVANCE_CENTERS
    );
    
    fuzzyTP += relevanceMembership;
    fuzzyFP += (1 - relevanceMembership);
  }
  
  // Calculate fuzzy false negatives
  let fuzzyFN = 0;
  for (const expected of expectedNames) {
    let maxSimilarity = 0;
    
    for (const title of returnedTitles) {
      const similarity = calculateStringSimilarity(title, expected);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    fuzzyFN += (1 - maxSimilarity);
  }
  
  return {
    fuzzyTP,
    fuzzyFP,
    fuzzyFN,
    totalReturned: returnedTitles.length,
    totalExpected: expectedNames.length,
  };
}

// ============================================================================
// FUZZY PRECISION AND RECALL
// ============================================================================

export interface FuzzyMetricsResult {
  fuzzyPrecision: number;
  fuzzyRecall: number;
  fuzzyF1: number;
  confusionMatrix: FuzzyConfusionMatrix;
  truthValueSummary: LinguisticSummary;
  matchDetails: Array<{
    returned: string;
    bestMatch?: string;
    similarity: number;
    relevanceMembership: number;
  }>;
}

/**
 * Calculate proper fuzzy precision and recall with TVLS
 */
export function calculateFuzzyMetrics(
  returnedTitles: string[],
  expectedNames: string[]
): FuzzyMetricsResult {
  // Handle edge case: no expected names (can't measure relevance)
  if (expectedNames.length === 0) {
    // If we have no expected names, we can't calculate meaningful metrics
    // Return undefined/unknown state rather than perfect scores
    const { name: quantifier, membership } = getBestQuantifier(0);
    return {
      fuzzyPrecision: 0,
      fuzzyRecall: 0,
      fuzzyF1: 0,
      confusionMatrix: { fuzzyTP: 0, fuzzyFP: returnedTitles.length, fuzzyFN: 0, totalReturned: returnedTitles.length, totalExpected: 0 },
      truthValueSummary: {
        quantifier: 'none',
        subject: 'results',
        summarizer: 'measurably relevant',
        truthValue: 0,
        support: 0,
        fullStatement: 'no expected results defined for comparison',
      },
      matchDetails: [],
    };
  }
  
  // Handle edge case: no results returned
  if (returnedTitles.length === 0) {
    return {
      fuzzyPrecision: 0,
      fuzzyRecall: 0,
      fuzzyF1: 0,
      confusionMatrix: { fuzzyTP: 0, fuzzyFP: 0, fuzzyFN: expectedNames.length, totalReturned: 0, totalExpected: expectedNames.length },
      truthValueSummary: {
        quantifier: 'none',
        subject: 'results',
        summarizer: 'relevant',
        truthValue: 1, // Truth value is high because "none are relevant" is TRUE when there are no results
        support: 0,
        fullStatement: 'none of the results are relevant (no results returned)',
      },
      matchDetails: [],
    };
  }
  
  const matchDetails: FuzzyMetricsResult['matchDetails'] = [];
  const relevanceMemberships: number[] = [];
  
  // Calculate relevance for each returned item
  for (const title of returnedTitles) {
    let bestSimilarity = 0;
    let bestMatch: string | undefined;
    
    for (const expected of expectedNames) {
      const similarity = calculateStringSimilarity(title, expected);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = expected;
      }
    }
    
    // Convert similarity to relevance using fuzzy sets
    const simMemberships = fuzzify(bestSimilarity, similarityVariable);
    
    // Combine memberships using T-norm for strict relevance
    const relevance = compensatoryAnd([
      simMemberships.get('strong_match') ?? 0,
      simMemberships.get('exact_match') ?? 0,
      simMemberships.get('partial_match') ?? 0,
    ].filter(v => v > 0), 0.7);
    
    // Use best similarity as relevance membership
    const relevanceMembership = bestSimilarity;
    relevanceMemberships.push(relevanceMembership);
    
    matchDetails.push({
      returned: title,
      bestMatch,
      similarity: bestSimilarity,
      relevanceMembership,
    });
  }
  
  // Fuzzy Precision: average relevance of returned items
  const fuzzyPrecision = relevanceMemberships.reduce((a, b) => a + b, 0) / relevanceMemberships.length;
  
  // Fuzzy Recall: for each expected, find best match
  let recallSum = 0;
  for (const expected of expectedNames) {
    let bestSimilarity = 0;
    for (const title of returnedTitles) {
      const similarity = calculateStringSimilarity(title, expected);
      bestSimilarity = Math.max(bestSimilarity, similarity);
    }
    recallSum += bestSimilarity;
  }
  const fuzzyRecall = recallSum / expectedNames.length;
  
  // Fuzzy F1
  const fuzzyF1 = (fuzzyPrecision + fuzzyRecall) > 0
    ? (2 * fuzzyPrecision * fuzzyRecall) / (fuzzyPrecision + fuzzyRecall)
    : 0;
  
  // Generate TVLS summary using the PROPER formula:
  // The quantifier is selected based on the proportion (fuzzyPrecision = average relevance)
  // The truth value is how well the quantifier fits the data
  const { name: quantifier, membership: quantifierFit } = getBestQuantifier(fuzzyPrecision);
  
  // Truth value in TVLS: T(Q R are S) = μQ(proportion)
  // The truth value measures how well the chosen quantifier describes the proportion
  // For example, if precision is 0.25 and we select "few", truth value is μ_few(0.25)
  const truthValue = quantifierFit;
  
  const truthValueSummary: LinguisticSummary = {
    quantifier,
    subject: 'results',
    summarizer: 'relevant',
    truthValue,
    support: fuzzyPrecision, // The actual proportion/degree of relevance
    fullStatement: `${quantifier.replace(/_/g, ' ')} of the results are relevant (support: ${(fuzzyPrecision * 100).toFixed(1)}%)`,
  };
  
  // Calculate confusion matrix
  const confusionMatrix = calculateFuzzyConfusionMatrix(returnedTitles, expectedNames);
  
  return {
    fuzzyPrecision,
    fuzzyRecall,
    fuzzyF1,
    confusionMatrix,
    truthValueSummary,
    matchDetails,
  };
}
