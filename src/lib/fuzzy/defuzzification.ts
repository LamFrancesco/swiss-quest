/**
 * Fuzzy Logic Core: Advanced Defuzzification Methods
 * 
 * This module provides standalone defuzzification functions that can be used
 * outside of the FIS, along with utilities for converting between fuzzy
 * and crisp representations.
 * 
 * References:
 * - Klir, G. J., & Yuan, B. (1995). "Fuzzy Sets and Fuzzy Logic: Theory and Applications"
 */

import { FuzzyVariable, FuzzySet } from './fuzzySets';

// ============================================================================
// DEFUZZIFICATION METHODS
// ============================================================================

/**
 * Center of Gravity (CoG) / Centroid defuzzification
 * 
 * The most commonly used method. Computes the center of area under
 * the aggregated membership function.
 * 
 * Formula: x* = ∫ x·μ(x)dx / ∫ μ(x)dx
 */
export function defuzzifyCentroid(
  memberships: Map<string, number>,
  variable: FuzzyVariable,
  resolution: number = 100
): number {
  const [min, max] = variable.domain;
  const step = (max - min) / resolution;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i <= resolution; i++) {
    const x = min + i * step;
    
    // Aggregate membership at this point
    let aggregatedMembership = 0;
    for (const set of variable.sets) {
      const setMembership = memberships.get(set.name) ?? 0;
      if (setMembership > 0) {
        const membershipAtX = set.membershipFunction(x);
        aggregatedMembership = Math.max(
          aggregatedMembership,
          Math.min(setMembership, membershipAtX)
        );
      }
    }
    
    numerator += x * aggregatedMembership;
    denominator += aggregatedMembership;
  }
  
  return denominator === 0 ? (min + max) / 2 : numerator / denominator;
}

/**
 * Weighted Average defuzzification
 * 
 * Faster than centroid when fuzzy sets are singletons or when
 * we can use representative values for each set.
 * 
 * Formula: x* = Σ wi·ci / Σ wi
 * where ci is the center of set i and wi is its membership weight
 */
export function defuzzifyWeightedAverage(
  memberships: Map<string, number>,
  setCenters: Map<string, number>
): number {
  let numerator = 0;
  let denominator = 0;
  
  for (const [setName, membership] of memberships) {
    if (membership > 0) {
      const center = setCenters.get(setName) ?? 0;
      numerator += membership * center;
      denominator += membership;
    }
  }
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Maximum membership defuzzification
 * 
 * Returns the x value where the aggregated membership function
 * reaches its maximum. If multiple maxima exist, returns the mean.
 */
export function defuzzifyMaximum(
  memberships: Map<string, number>,
  variable: FuzzyVariable,
  resolution: number = 100
): number {
  const [min, max] = variable.domain;
  const step = (max - min) / resolution;
  
  let maxMembership = 0;
  const maxPoints: number[] = [];
  
  for (let i = 0; i <= resolution; i++) {
    const x = min + i * step;
    
    let aggregatedMembership = 0;
    for (const set of variable.sets) {
      const setMembership = memberships.get(set.name) ?? 0;
      if (setMembership > 0) {
        const membershipAtX = set.membershipFunction(x);
        aggregatedMembership = Math.max(
          aggregatedMembership,
          Math.min(setMembership, membershipAtX)
        );
      }
    }
    
    if (aggregatedMembership > maxMembership) {
      maxMembership = aggregatedMembership;
      maxPoints.length = 0;
      maxPoints.push(x);
    } else if (aggregatedMembership === maxMembership && maxMembership > 0) {
      maxPoints.push(x);
    }
  }
  
  if (maxPoints.length === 0) return (min + max) / 2;
  return maxPoints.reduce((a, b) => a + b, 0) / maxPoints.length;
}

// ============================================================================
// SUGENO-STYLE DEFUZZIFICATION
// ============================================================================

/**
 * Sugeno weighted sum defuzzification
 * 
 * For Sugeno (TSK) systems where consequents are crisp values or functions
 * 
 * Formula: x* = Σ wi·zi / Σ wi
 * where zi is the output of rule i and wi is its firing strength
 */
export function defuzzifySugeno(
  ruleOutputs: Array<{ firingStrength: number; output: number }>
): number {
  let numerator = 0;
  let denominator = 0;
  
  for (const { firingStrength, output } of ruleOutputs) {
    numerator += firingStrength * output;
    denominator += firingStrength;
  }
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// ============================================================================
// LINGUISTIC OUTPUT GENERATION
// ============================================================================

/**
 * Convert a crisp value back to linguistic terms
 * Returns the fuzzy set with highest membership at the given value
 */
export function crispToLinguistic(
  value: number,
  variable: FuzzyVariable
): { term: string; membership: number } {
  let maxMembership = 0;
  let bestTerm = variable.sets[0].name;
  
  for (const set of variable.sets) {
    const membership = set.membershipFunction(value);
    if (membership > maxMembership) {
      maxMembership = membership;
      bestTerm = set.name;
    }
  }
  
  return { term: bestTerm, membership: maxMembership };
}

/**
 * Get all applicable linguistic terms for a crisp value
 * Returns terms where membership exceeds a threshold
 */
export function crispToMultipleLinguistic(
  value: number,
  variable: FuzzyVariable,
  threshold: number = 0.3
): Array<{ term: string; membership: number }> {
  const results: Array<{ term: string; membership: number }> = [];
  
  for (const set of variable.sets) {
    const membership = set.membershipFunction(value);
    if (membership >= threshold) {
      results.push({ term: set.name, membership });
    }
  }
  
  // Sort by membership descending
  return results.sort((a, b) => b.membership - a.membership);
}

/**
 * Generate a natural language description of a fuzzy value
 */
export function generateLinguisticDescription(
  value: number,
  variable: FuzzyVariable,
  variableLabel?: string
): string {
  const terms = crispToMultipleLinguistic(value, variable, 0.2);
  const label = variableLabel ?? variable.name;
  
  if (terms.length === 0) {
    return `${label} is undefined`;
  }
  
  if (terms.length === 1) {
    const { term, membership } = terms[0];
    const qualifier = membership >= 0.8 ? 'definitely' : 
                      membership >= 0.6 ? 'quite' :
                      membership >= 0.4 ? 'somewhat' : 'slightly';
    return `${label} is ${qualifier} ${term.replace(/_/g, ' ')}`;
  }
  
  // Multiple overlapping terms
  const primary = terms[0];
  const secondary = terms[1];
  
  if (primary.membership > 0.7) {
    return `${label} is ${primary.term.replace(/_/g, ' ')} (${(primary.membership * 100).toFixed(0)}%)`;
  }
  
  return `${label} is between ${primary.term.replace(/_/g, ' ')} and ${secondary.term.replace(/_/g, ' ')}`;
}

// ============================================================================
// UTILITY: PREDEFINED SET CENTERS FOR WEIGHTED AVERAGE
// ============================================================================

export const CONFIDENCE_CENTERS: Map<string, number> = new Map([
  ['very_low', 0.15],
  ['low', 0.3],
  ['medium', 0.5],
  ['high', 0.7],
  ['very_high', 0.85],
]);

export const SIMILARITY_CENTERS: Map<string, number> = new Map([
  ['no_match', 0.15],
  ['weak_match', 0.35],
  ['partial_match', 0.55],
  ['strong_match', 0.75],
  ['exact_match', 0.9],
]);

export const RELEVANCE_CENTERS: Map<string, number> = new Map([
  ['irrelevant', 0.1],
  ['marginally_relevant', 0.35],
  ['relevant', 0.55],
  ['highly_relevant', 0.75],
  ['perfectly_relevant', 0.9],
]);

export const DIFFICULTY_CENTERS: Map<string, number> = new Map([
  ['very_easy', 0.1],
  ['easy', 0.3],
  ['medium', 0.5],
  ['difficult', 0.7],
  ['very_difficult', 0.9],
]);

export const TIME_NEEDED_CENTERS: Map<string, number> = new Map([
  ['very_short', 0.1],
  ['short', 0.25],
  ['half_day', 0.5],
  ['full_day', 0.75],
  ['multi_day', 0.9],
]);
