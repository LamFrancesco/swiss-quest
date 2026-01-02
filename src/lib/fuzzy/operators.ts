/**
 * Fuzzy Logic Core: T-Norms and T-Conorms (Fuzzy Operators)
 * 
 * T-norms (triangular norms) implement fuzzy AND operations.
 * T-conorms (triangular conorms) implement fuzzy OR operations.
 * 
 * Properties of T-norms:
 * - Boundary: T(a, 1) = a
 * - Commutativity: T(a, b) = T(b, a)
 * - Associativity: T(a, T(b, c)) = T(T(a, b), c)
 * - Monotonicity: If a ≤ c and b ≤ d, then T(a, b) ≤ T(c, d)
 * 
 * References:
 * - Klement, E. P., Mesiar, R., & Pap, E. (2000). "Triangular Norms"
 */

// ============================================================================
// T-NORMS (Fuzzy AND / Intersection)
// ============================================================================

/**
 * Minimum T-norm (Gödel/Zadeh)
 * T_min(a, b) = min(a, b)
 * 
 * Most common T-norm, produces conservative estimates
 */
export function tNormMin(a: number, b: number): number {
  return Math.min(a, b);
}

/**
 * Algebraic Product T-norm
 * T_prod(a, b) = a * b
 * 
 * Stricter than minimum, penalizes multiple uncertain values
 */
export function tNormProduct(a: number, b: number): number {
  return a * b;
}

/**
 * Łukasiewicz T-norm (Bounded Product)
 * T_luk(a, b) = max(0, a + b - 1)
 * 
 * Strictest T-norm, can produce 0 even with positive inputs
 */
export function tNormLukasiewicz(a: number, b: number): number {
  return Math.max(0, a + b - 1);
}

/**
 * Drastic T-norm
 * T_drastic(a, b) = min(a, b) if max(a, b) = 1, else 0
 * 
 * Most extreme, requires full membership in at least one set
 */
export function tNormDrastic(a: number, b: number): number {
  if (a === 1) return b;
  if (b === 1) return a;
  return 0;
}

/**
 * Hamacher T-norm (parameterized)
 * T_ham(a, b; γ) = (a * b) / (γ + (1 - γ)(a + b - a * b))
 * 
 * @param gamma - Parameter (γ ≥ 0). γ = 0 gives product, γ → ∞ gives drastic
 */
export function tNormHamacher(a: number, b: number, gamma: number = 0): number {
  if (gamma === 0) {
    // Hamacher product
    if (a === 0 && b === 0) return 0;
    return (a * b) / (a + b - a * b);
  }
  const denom = gamma + (1 - gamma) * (a + b - a * b);
  return denom === 0 ? 0 : (a * b) / denom;
}

// ============================================================================
// T-CONORMS (Fuzzy OR / Union)
// ============================================================================

/**
 * Maximum T-conorm (Gödel/Zadeh)
 * S_max(a, b) = max(a, b)
 * 
 * Dual of minimum T-norm, produces optimistic estimates
 */
export function tConormMax(a: number, b: number): number {
  return Math.max(a, b);
}

/**
 * Algebraic Sum T-conorm (Probabilistic OR)
 * S_sum(a, b) = a + b - a * b
 * 
 * Dual of algebraic product
 */
export function tConormProbabilisticSum(a: number, b: number): number {
  return a + b - a * b;
}

/**
 * Łukasiewicz T-conorm (Bounded Sum)
 * S_luk(a, b) = min(1, a + b)
 * 
 * Dual of Łukasiewicz T-norm
 */
export function tConormLukasiewicz(a: number, b: number): number {
  return Math.min(1, a + b);
}

/**
 * Drastic T-conorm
 * S_drastic(a, b) = max(a, b) if min(a, b) = 0, else 1
 * 
 * Dual of drastic T-norm
 */
export function tConormDrastic(a: number, b: number): number {
  if (a === 0) return b;
  if (b === 0) return a;
  return 1;
}

// ============================================================================
// FUZZY NEGATION
// ============================================================================

/**
 * Standard fuzzy negation (Zadeh negation)
 * N(a) = 1 - a
 */
export function fuzzyNot(a: number): number {
  return 1 - a;
}

/**
 * Sugeno negation (parameterized)
 * N_λ(a) = (1 - a) / (1 + λ * a)
 * 
 * @param lambda - Parameter (λ > -1). λ = 0 gives standard negation
 */
export function fuzzyNotSugeno(a: number, lambda: number = 0): number {
  return (1 - a) / (1 + lambda * a);
}

// ============================================================================
// AGGREGATION OPERATORS
// ============================================================================

/**
 * Aggregate multiple fuzzy values using a T-norm
 */
export function aggregateAnd(
  values: number[],
  tNorm: (a: number, b: number) => number = tNormMin
): number {
  if (values.length === 0) return 1;
  return values.reduce((acc, val) => tNorm(acc, val), 1);
}

/**
 * Aggregate multiple fuzzy values using a T-conorm
 */
export function aggregateOr(
  values: number[],
  tConorm: (a: number, b: number) => number = tConormMax
): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, val) => tConorm(acc, val), 0);
}

/**
 * Ordered Weighted Averaging (OWA) operator
 * OWA(a1, ..., an) = Σ wi * b(i)
 * where b(i) is the i-th largest element and wi are ordered weights
 * 
 * @param values - Input fuzzy values
 * @param weights - Ordered weights (must sum to 1)
 */
export function owaOperator(values: number[], weights: number[]): number {
  if (values.length === 0) return 0;
  if (weights.length !== values.length) {
    // Generate uniform weights if not provided correctly
    const uniformWeight = 1 / values.length;
    weights = Array(values.length).fill(uniformWeight);
  }
  
  // Sort values in descending order
  const sorted = [...values].sort((a, b) => b - a);
  
  // Apply weighted sum
  return sorted.reduce((acc, val, i) => acc + weights[i] * val, 0);
}

/**
 * Generate OWA weights for different aggregation semantics
 */
export function generateOwaWeights(n: number, type: 'andlike' | 'orlike' | 'average'): number[] {
  const weights = new Array(n);
  
  switch (type) {
    case 'andlike':
      // Emphasize smallest values (like T-norm)
      for (let i = 0; i < n; i++) {
        weights[i] = (2 * (n - i)) / (n * (n + 1));
      }
      break;
    case 'orlike':
      // Emphasize largest values (like T-conorm)
      for (let i = 0; i < n; i++) {
        weights[i] = (2 * (i + 1)) / (n * (n + 1));
      }
      break;
    case 'average':
    default:
      // Equal weights (arithmetic mean)
      weights.fill(1 / n);
      break;
  }
  
  return weights;
}

/**
 * Compensatory AND operator (generalized mean)
 * Combines T-norm and arithmetic mean for balanced aggregation
 * 
 * @param values - Input fuzzy values
 * @param gamma - Compensation degree (0 = T-norm, 1 = arithmetic mean)
 */
export function compensatoryAnd(values: number[], gamma: number = 0.5): number {
  if (values.length === 0) return 1;
  
  const tNormResult = aggregateAnd(values, tNormProduct);
  const arithmeticMean = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Compensatory formula: (T-norm)^(1-γ) * (mean)^γ
  return Math.pow(tNormResult, 1 - gamma) * Math.pow(arithmeticMean, gamma);
}

// ============================================================================
// IMPLICATION OPERATORS (for fuzzy rules)
// ============================================================================

/**
 * Mamdani implication (min)
 * a → b = min(a, b)
 */
export function implicationMamdani(a: number, b: number): number {
  return Math.min(a, b);
}

/**
 * Larsen implication (product)
 * a → b = a * b
 */
export function implicationLarsen(a: number, b: number): number {
  return a * b;
}

/**
 * Kleene-Dienes implication
 * a → b = max(1 - a, b)
 */
export function implicationKleeneDienes(a: number, b: number): number {
  return Math.max(1 - a, b);
}

/**
 * Łukasiewicz implication
 * a → b = min(1, 1 - a + b)
 */
export function implicationLukasiewicz(a: number, b: number): number {
  return Math.min(1, 1 - a + b);
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TNorm = (a: number, b: number) => number;
export type TConorm = (a: number, b: number) => number;
export type FuzzyImplication = (a: number, b: number) => number;

export const TNORMS = {
  min: tNormMin,
  product: tNormProduct,
  lukasiewicz: tNormLukasiewicz,
  drastic: tNormDrastic,
  hamacher: tNormHamacher,
} as const;

export const TCONORMS = {
  max: tConormMax,
  probabilisticSum: tConormProbabilisticSum,
  lukasiewicz: tConormLukasiewicz,
  drastic: tConormDrastic,
} as const;

export const IMPLICATIONS = {
  mamdani: implicationMamdani,
  larsen: implicationLarsen,
  kleeneDienes: implicationKleeneDienes,
  lukasiewicz: implicationLukasiewicz,
} as const;
