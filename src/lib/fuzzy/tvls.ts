/**
 * Fuzzy Logic Core: Truth Value of Linguistic Summaries (TVLS)
 * 
 * This module implements the formal TVLS methodology for generating and
 * evaluating linguistic summaries of data.
 * 
 * A linguistic summary has the form: "Q of S are R"
 * - Q: Linguistic quantifier (e.g., "most", "few")
 * - S: Subject set / data (e.g., "activities")
 * - R: Summarizer / predicate (e.g., "suitable for families")
 * 
 * The truth value T measures how well the summary describes the data.
 * 
 * References:
 * - Kacprzyk, J., & Yager, R. R. (2001). "Linguistic Summaries of Databases under Imprecise Criteria"
 * - Zadeh, L. A. (1983). "A Computational Approach to Fuzzy Quantifiers in Natural Languages"
 */

import { 
  LinguisticQuantifier, 
  relativeQuantifiers,
  getBestQuantifier,
  formatQuantifierName 
} from './linguisticQuantifiers';
import { FuzzyVariable, FuzzySet, fuzzify } from './fuzzySets';
import { tNormMin, tNormProduct, aggregateAnd } from './operators';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LinguisticSummary {
  quantifier: string;
  subject: string;
  summarizer: string;
  truthValue: number;
  support: number; // Proportion of elements satisfying summarizer
  fullStatement: string;
}

export interface SummaryQuality {
  truthValue: number;
  degreeOfImprecision: number;
  degreeOfCovering: number;
  degreeOfAppropriateness: number;
  lengthQuality: number;
  overallQuality: number;
}

export interface FuzzySummarizer {
  name: string;
  evaluate: (item: any) => number;
}

// ============================================================================
// CORE TVLS CALCULATIONS
// ============================================================================

/**
 * Calculate the truth value of a simple linguistic summary
 * 
 * Simple protoform: "Q of S are R"
 * 
 * Formula: T(S) = μQ(Σ μR(xi) / n)
 * where:
 * - μQ is the quantifier membership function
 * - μR(xi) is the summarizer membership for element i
 * - n is the total number of elements
 * 
 * @param quantifier - The linguistic quantifier
 * @param memberships - Summarizer membership values for each element
 */
export function calculateSimpleTruthValue(
  quantifier: LinguisticQuantifier,
  memberships: number[]
): number {
  if (memberships.length === 0) return 0;
  
  // Calculate sigma-count (fuzzy cardinality)
  const sigmaCount = memberships.reduce((a, b) => a + b, 0);
  
  // Calculate proportion
  const proportion = sigmaCount / memberships.length;
  
  // Apply quantifier membership function
  return quantifier.membershipFunction(proportion);
}

/**
 * Calculate the truth value with a qualifier (extended protoform)
 * 
 * Extended protoform: "Q of S which are W are R"
 * 
 * Formula: T(S) = μQ(Σ (μW(xi) ∧ μR(xi)) / Σ μW(xi))
 * where:
 * - μW is the qualifier (filter) membership
 * - ∧ is a T-norm (typically minimum)
 */
export function calculateQualifiedTruthValue(
  quantifier: LinguisticQuantifier,
  qualifierMemberships: number[],
  summarizerMemberships: number[]
): number {
  if (qualifierMemberships.length !== summarizerMemberships.length) {
    throw new Error('Membership arrays must have the same length');
  }
  
  if (qualifierMemberships.length === 0) return 0;
  
  // Calculate numerator: Σ (μW(xi) ∧ μR(xi))
  let numerator = 0;
  for (let i = 0; i < qualifierMemberships.length; i++) {
    numerator += tNormMin(qualifierMemberships[i], summarizerMemberships[i]);
  }
  
  // Calculate denominator: Σ μW(xi)
  const denominator = qualifierMemberships.reduce((a, b) => a + b, 0);
  
  if (denominator === 0) return 0;
  
  // Calculate proportion
  const proportion = numerator / denominator;
  
  // Apply quantifier membership function
  return quantifier.membershipFunction(proportion);
}

/**
 * Calculate truth value for compound summarizers (AND)
 * 
 * "Q of S are R1 and R2"
 */
export function calculateCompoundTruthValueAnd(
  quantifier: LinguisticQuantifier,
  membershipArrays: number[][]
): number {
  if (membershipArrays.length === 0) return 0;
  
  const n = membershipArrays[0].length;
  const compoundMemberships: number[] = [];
  
  for (let i = 0; i < n; i++) {
    const values = membershipArrays.map(arr => arr[i]);
    compoundMemberships.push(aggregateAnd(values, tNormMin));
  }
  
  return calculateSimpleTruthValue(quantifier, compoundMemberships);
}

/**
 * Calculate truth value for compound summarizers (OR)
 * 
 * "Q of S are R1 or R2"
 */
export function calculateCompoundTruthValueOr(
  quantifier: LinguisticQuantifier,
  membershipArrays: number[][]
): number {
  if (membershipArrays.length === 0) return 0;
  
  const n = membershipArrays[0].length;
  const compoundMemberships: number[] = [];
  
  for (let i = 0; i < n; i++) {
    const values = membershipArrays.map(arr => arr[i]);
    // T-conorm (max for OR)
    compoundMemberships.push(Math.max(...values));
  }
  
  return calculateSimpleTruthValue(quantifier, compoundMemberships);
}

// ============================================================================
// SUMMARY QUALITY MEASURES
// ============================================================================

/**
 * Calculate the degree of imprecision (T2)
 * 
 * Measures how fuzzy the summarizer is.
 * Lower imprecision = more specific = higher quality
 * 
 * Formula: T2 = 1 - (|supp(R)| / |domain(R)|)
 */
export function calculateDegreeOfImprecision(
  memberships: number[],
  threshold: number = 0.01
): number {
  const support = memberships.filter(m => m >= threshold).length;
  const domainSize = memberships.length;
  
  if (domainSize === 0) return 0;
  
  return 1 - (support / domainSize);
}

/**
 * Calculate the degree of covering (T3)
 * 
 * Measures what proportion of the data is covered by the summarizer
 * 
 * Formula: T3 = |{xi : μR(xi) > 0}| / n
 */
export function calculateDegreeOfCovering(
  memberships: number[],
  threshold: number = 0.01
): number {
  if (memberships.length === 0) return 0;
  
  const covered = memberships.filter(m => m >= threshold).length;
  return covered / memberships.length;
}

/**
 * Calculate the degree of appropriateness (T4)
 * 
 * Measures how well the summarizer describes the data distribution
 * 
 * Formula: T4 = |supp(R)| / n - T3
 * (Simplified version - full version considers multiple summarizers)
 */
export function calculateDegreeOfAppropriateness(
  memberships: number[],
  threshold: number = 0.01
): number {
  if (memberships.length === 0) return 0;
  
  const avgMembership = memberships.reduce((a, b) => a + b, 0) / memberships.length;
  const t3 = calculateDegreeOfCovering(memberships, threshold);
  
  // Appropriateness is high when average membership is close to coverage ratio
  return 1 - Math.abs(avgMembership - t3);
}

/**
 * Calculate the length quality (T5)
 * 
 * Shorter summaries are preferred (fewer summarizers in compound)
 * 
 * Formula: T5 = 2^(-|R|) where |R| is the number of summarizers
 */
export function calculateLengthQuality(numSummarizers: number): number {
  return Math.pow(2, -(numSummarizers - 1));
}

/**
 * Calculate overall summary quality
 * 
 * Fixed: handle edge cases properly to avoid 0 values when data is sparse
 */
export function calculateSummaryQuality(
  truthValue: number,
  memberships: number[],
  numSummarizers: number = 1
): SummaryQuality {
  // Handle empty or single-element arrays
  if (memberships.length === 0) {
    return {
      truthValue,
      degreeOfImprecision: 0,
      degreeOfCovering: 0,
      degreeOfAppropriateness: 0,
      lengthQuality: calculateLengthQuality(numSummarizers),
      overallQuality: 0,
    };
  }
  
  const t2 = calculateDegreeOfImprecision(memberships);
  const t3 = calculateDegreeOfCovering(memberships);
  const t4 = calculateDegreeOfAppropriateness(memberships);
  const t5 = calculateLengthQuality(numSummarizers);
  
  // Overall quality using weighted average instead of geometric mean
  // This avoids the problem of any 0 value making the whole product 0
  // Weights: T1 (truth value) = 0.4, T2-T4 = 0.15 each, T5 = 0.15
  const overall = (
    0.4 * truthValue +
    0.15 * t2 +
    0.15 * t3 +
    0.15 * t4 +
    0.15 * t5
  );
  
  return {
    truthValue,
    degreeOfImprecision: t2,
    degreeOfCovering: t3,
    degreeOfAppropriateness: t4,
    lengthQuality: t5,
    overallQuality: overall,
  };
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

/**
 * Generate all valid linguistic summaries for a dataset
 * 
 * @param items - The data items to summarize
 * @param summarizers - Available summarizers
 * @param subject - Description of the subject set
 * @param minTruthValue - Minimum truth value threshold
 */
export function generateSummaries(
  items: any[],
  summarizers: FuzzySummarizer[],
  subject: string = 'results',
  minTruthValue: number = 0.5
): LinguisticSummary[] {
  const summaries: LinguisticSummary[] = [];
  
  for (const summarizer of summarizers) {
    // Calculate memberships for each item
    const memberships = items.map(item => summarizer.evaluate(item));
    
    // Calculate support (sigma-count / n)
    const support = memberships.length > 0
      ? memberships.reduce((a, b) => a + b, 0) / memberships.length
      : 0;
    
    // Try each quantifier
    for (const quantifier of relativeQuantifiers) {
      const truthValue = calculateSimpleTruthValue(quantifier, memberships);
      
      if (truthValue >= minTruthValue) {
        const qName = formatQuantifierName(quantifier.name);
        summaries.push({
          quantifier: quantifier.name,
          subject,
          summarizer: summarizer.name,
          truthValue,
          support,
          fullStatement: `${qName} of the ${subject} are ${summarizer.name}`,
        });
      }
    }
  }
  
  // Sort by truth value (descending)
  return summaries.sort((a, b) => b.truthValue - a.truthValue);
}

/**
 * Generate the best summary for a specific summarizer
 */
export function generateBestSummary(
  items: any[],
  summarizer: FuzzySummarizer,
  subject: string = 'results'
): LinguisticSummary {
  const memberships = items.map(item => summarizer.evaluate(item));
  
  const support = memberships.length > 0
    ? memberships.reduce((a, b) => a + b, 0) / memberships.length
    : 0;
  
  const { name: quantifierName, membership: truthValue } = getBestQuantifier(support);
  const qName = formatQuantifierName(quantifierName);
  
  return {
    quantifier: quantifierName,
    subject,
    summarizer: summarizer.name,
    truthValue,
    support,
    fullStatement: `${qName} of the ${subject} are ${summarizer.name}`,
  };
}

// ============================================================================
// PREDEFINED SUMMARIZERS FOR SWISSQUEST
// ============================================================================

export const swissQuestSummarizers: FuzzySummarizer[] = [
  {
    name: 'easy',
    evaluate: (activity: any) => {
      const diff = activity.difficulty?.toLowerCase();
      if (diff === 'easy') return 1.0;
      if (diff === 'medium') return 0.3;
      return 0;
    },
  },
  {
    name: 'suitable for families',
    evaluate: (activity: any) => {
      const suitable = activity.suitableFor || [];
      if (suitable.includes('Families')) return 1.0;
      if (suitable.includes('Children')) return 0.8;
      return 0;
    },
  },
  {
    name: 'outdoor activities',
    evaluate: (activity: any) => {
      const type = (activity.experienceType || '').toLowerCase();
      if (type.includes('outdoor') || type.includes('nature')) return 1.0;
      if (type.includes('adventure')) return 0.7;
      return 0;
    },
  },
  {
    name: 'quick visits',
    evaluate: (activity: any) => {
      const time = activity.neededTime?.toLowerCase() || '';
      if (time.includes('< 1') || time.includes('less than 1')) return 1.0;
      if (time.includes('1 - 2')) return 0.7;
      if (time.includes('2 - 4')) return 0.3;
      return 0;
    },
  },
  {
    name: 'highly relevant',
    evaluate: (activity: any) => {
      // Uses the relevance score if available
      return activity._relevanceScore ?? 0;
    },
  },
];

/**
 * Generate comprehensive summaries for search results
 */
export function summarizeSearchResults(
  activities: any[],
  subject: string = 'search results'
): LinguisticSummary[] {
  return generateSummaries(activities, swissQuestSummarizers, subject, 0.5);
}
