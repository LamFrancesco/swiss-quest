/**
 * Fuzzy Logic Core: Linguistic Quantifiers
 * 
 * This module implements linguistic quantifiers as fuzzy sets over [0, 1].
 * Quantifiers are used to express proportions in linguistic summaries,
 * such as "few", "some", "many", "most", "almost all".
 * 
 * References:
 * - Zadeh, L. A. (1983). "A Computational Approach to Fuzzy Quantifiers in Natural Languages"
 * - Kacprzyk, J., & Yager, R. R. (2001). "Linguistic Summaries of Databases under Imprecise Criteria"
 */

import { 
  triangular, 
  trapezoidal, 
  leftShoulder, 
  rightShoulder,
  MembershipFunction 
} from './membershipFunctions';

// ============================================================================
// LINGUISTIC QUANTIFIER DEFINITIONS
// ============================================================================

export interface LinguisticQuantifier {
  name: string;
  membershipFunction: MembershipFunction;
  type: 'absolute' | 'relative';
  isMonotonic?: boolean; // true if increasing, false if decreasing
}

/**
 * Standard relative quantifiers (proportion-based)
 * Domain: [0, 1] representing proportion of elements
 */
export const relativeQuantifiers: LinguisticQuantifier[] = [
  {
    name: 'none',
    membershipFunction: (x: number) => leftShoulder(x, 0, 0.05),
    type: 'relative',
    isMonotonic: false,
  },
  {
    name: 'almost_none',
    membershipFunction: (x: number) => triangular(x, 0, 0.05, 0.15),
    type: 'relative',
    isMonotonic: false,
  },
  {
    name: 'few',
    membershipFunction: (x: number) => triangular(x, 0.05, 0.15, 0.35),
    type: 'relative',
    isMonotonic: false,
  },
  {
    name: 'some',
    membershipFunction: (x: number) => triangular(x, 0.2, 0.35, 0.5),
    type: 'relative',
  },
  {
    name: 'about_half',
    membershipFunction: (x: number) => triangular(x, 0.35, 0.5, 0.65),
    type: 'relative',
  },
  {
    name: 'many',
    membershipFunction: (x: number) => triangular(x, 0.5, 0.65, 0.8),
    type: 'relative',
    isMonotonic: true,
  },
  {
    name: 'most',
    membershipFunction: (x: number) => triangular(x, 0.65, 0.8, 0.95),
    type: 'relative',
    isMonotonic: true,
  },
  {
    name: 'almost_all',
    membershipFunction: (x: number) => triangular(x, 0.85, 0.95, 1.0),
    type: 'relative',
    isMonotonic: true,
  },
  {
    name: 'all',
    membershipFunction: (x: number) => rightShoulder(x, 0.95, 1.0),
    type: 'relative',
    isMonotonic: true,
  },
];

/**
 * Get a quantifier by name
 */
export function getQuantifier(name: string): LinguisticQuantifier | undefined {
  return relativeQuantifiers.find(q => q.name === name);
}

/**
 * Evaluate all quantifiers for a given proportion
 * Returns a map of quantifier name -> membership degree
 */
export function evaluateQuantifiers(proportion: number): Map<string, number> {
  const result = new Map<string, number>();
  
  for (const q of relativeQuantifiers) {
    result.set(q.name, q.membershipFunction(proportion));
  }
  
  return result;
}

/**
 * Get the best-fitting quantifier for a proportion
 */
export function getBestQuantifier(proportion: number): { name: string; membership: number } {
  let bestName = 'some';
  let bestMembership = 0;
  
  for (const q of relativeQuantifiers) {
    const membership = q.membershipFunction(proportion);
    if (membership > bestMembership) {
      bestMembership = membership;
      bestName = q.name;
    }
  }
  
  return { name: bestName, membership: bestMembership };
}

/**
 * Get multiple applicable quantifiers (above threshold)
 */
export function getApplicableQuantifiers(
  proportion: number,
  threshold: number = 0.3
): Array<{ name: string; membership: number }> {
  const results: Array<{ name: string; membership: number }> = [];
  
  for (const q of relativeQuantifiers) {
    const membership = q.membershipFunction(proportion);
    if (membership >= threshold) {
      results.push({ name: q.name, membership });
    }
  }
  
  return results.sort((a, b) => b.membership - a.membership);
}

// ============================================================================
// QUANTIFIER-GUIDED AGGREGATION (Yager's OWA)
// ============================================================================

/**
 * Generate OWA weights from a linguistic quantifier
 * 
 * For Regular Increasing Monotone (RIM) quantifiers:
 * wi = Q(i/n) - Q((i-1)/n)
 */
export function generateQuantifierWeights(
  quantifier: LinguisticQuantifier,
  n: number
): number[] {
  const weights: number[] = [];
  
  for (let i = 1; i <= n; i++) {
    const weight = quantifier.membershipFunction(i / n) - 
                   quantifier.membershipFunction((i - 1) / n);
    weights.push(weight);
  }
  
  // Normalize weights to sum to 1
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    return weights.map(w => w / sum);
  }
  
  // Fallback to uniform weights
  return Array(n).fill(1 / n);
}

/**
 * Quantifier-guided aggregation of fuzzy values
 * 
 * This implements Yager's quantifier-guided OWA operator:
 * QGA(a1, ..., an) = Σ wi * b(i)
 * where weights are derived from a linguistic quantifier
 */
export function quantifierGuidedAggregation(
  values: number[],
  quantifier: LinguisticQuantifier
): number {
  if (values.length === 0) return 0;
  
  // Sort values in descending order
  const sorted = [...values].sort((a, b) => b - a);
  
  // Generate weights from quantifier
  const weights = generateQuantifierWeights(quantifier, sorted.length);
  
  // Apply weighted sum
  return sorted.reduce((acc, val, i) => acc + weights[i] * val, 0);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a quantifier name for display
 */
export function formatQuantifierName(name: string): string {
  return name.replace(/_/g, ' ');
}

/**
 * Create a custom quantifier
 */
export function createQuantifier(
  name: string,
  type: 'triangular' | 'trapezoidal' | 'shoulder',
  params: number[]
): LinguisticQuantifier {
  let membershipFunction: MembershipFunction;
  
  switch (type) {
    case 'triangular':
      membershipFunction = (x: number) => triangular(x, params[0], params[1], params[2]);
      break;
    case 'trapezoidal':
      membershipFunction = (x: number) => trapezoidal(x, params[0], params[1], params[2], params[3]);
      break;
    case 'shoulder':
      // Left shoulder if params[0] < params[1], right shoulder otherwise
      if (params.length === 2 && params[0] < params[1]) {
        membershipFunction = (x: number) => leftShoulder(x, params[0], params[1]);
      } else {
        membershipFunction = (x: number) => rightShoulder(x, params[0], params[1]);
      }
      break;
    default:
      throw new Error(`Unknown quantifier type: ${type}`);
  }
  
  return {
    name,
    membershipFunction,
    type: 'relative',
  };
}
