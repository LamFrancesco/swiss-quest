/**
 * Fuzzy Logic Core: Membership Functions
 * 
 * This module implements formal membership functions as defined in fuzzy logic theory.
 * A membership function μ(x) maps a value x to a degree of membership in [0, 1].
 * 
 * References:
 * - Zadeh, L. A. (1965). "Fuzzy Sets"
 * - Klir, G. J., & Yuan, B. (1995). "Fuzzy Sets and Fuzzy Logic: Theory and Applications"
 */

/**
 * Triangular membership function
 * μ(x) = 0 if x <= a or x >= c
 * μ(x) = (x - a) / (b - a) if a < x < b
 * μ(x) = (c - x) / (c - b) if b <= x < c
 * 
 * @param x - Input value
 * @param a - Left foot (μ = 0)
 * @param b - Peak (μ = 1)
 * @param c - Right foot (μ = 0)
 */
export function triangular(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x < b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

/**
 * Trapezoidal membership function
 * μ(x) = 0 if x <= a or x >= d
 * μ(x) = (x - a) / (b - a) if a < x < b
 * μ(x) = 1 if b <= x <= c
 * μ(x) = (d - x) / (d - c) if c < x < d
 * 
 * @param x - Input value
 * @param a - Left foot (μ = 0)
 * @param b - Left shoulder (μ = 1)
 * @param c - Right shoulder (μ = 1)
 * @param d - Right foot (μ = 0)
 */
export function trapezoidal(x: number, a: number, b: number, c: number, d: number): number {
  if (x <= a || x >= d) return 0;
  if (x < b) return (x - a) / (b - a);
  if (x <= c) return 1;
  return (d - x) / (d - c);
}

/**
 * Gaussian membership function
 * μ(x) = exp(-((x - c)² / (2σ²)))
 * 
 * @param x - Input value
 * @param c - Center (peak, μ = 1)
 * @param sigma - Standard deviation (controls width)
 */
export function gaussian(x: number, c: number, sigma: number): number {
  return Math.exp(-Math.pow(x - c, 2) / (2 * Math.pow(sigma, 2)));
}

/**
 * Generalized Bell membership function
 * μ(x) = 1 / (1 + |((x - c) / a)|^(2b))
 * 
 * @param x - Input value
 * @param a - Width parameter
 * @param b - Slope parameter
 * @param c - Center
 */
export function generalizedBell(x: number, a: number, b: number, c: number): number {
  return 1 / (1 + Math.pow(Math.abs((x - c) / a), 2 * b));
}

/**
 * Sigmoid (S-shaped) membership function
 * μ(x) = 1 / (1 + exp(-a(x - c)))
 * 
 * @param x - Input value
 * @param a - Slope parameter (positive = rising, negative = falling)
 * @param c - Crossover point (μ = 0.5)
 */
export function sigmoid(x: number, a: number, c: number): number {
  return 1 / (1 + Math.exp(-a * (x - c)));
}

/**
 * Left shoulder (Z-shaped) membership function
 * Full membership until a, then decreases to 0 at b
 * 
 * @param x - Input value
 * @param a - Right edge of shoulder (μ = 1)
 * @param b - Foot (μ = 0)
 */
export function leftShoulder(x: number, a: number, b: number): number {
  if (x <= a) return 1;
  if (x >= b) return 0;
  return (b - x) / (b - a);
}

/**
 * Right shoulder (S-shaped) membership function
 * Zero membership until a, then increases to 1 at b
 * 
 * @param x - Input value
 * @param a - Foot (μ = 0)
 * @param b - Left edge of shoulder (μ = 1)
 */
export function rightShoulder(x: number, a: number, b: number): number {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

/**
 * Pi-shaped membership function (combination of S and Z curves)
 * 
 * @param x - Input value
 * @param a - Left foot
 * @param b - Left peak
 * @param c - Right peak
 * @param d - Right foot
 */
export function piShaped(x: number, a: number, b: number, c: number, d: number): number {
  if (x <= a || x >= d) return 0;
  if (x <= b) return rightShoulder(x, a, b);
  if (x <= c) return 1;
  return leftShoulder(x, c, d);
}

/**
 * Membership function type definition
 */
export type MembershipFunction = (x: number) => number;

/**
 * Create a parameterized membership function
 */
export interface MembershipFunctionDefinition {
  type: 'triangular' | 'trapezoidal' | 'gaussian' | 'generalizedBell' | 'sigmoid' | 'leftShoulder' | 'rightShoulder' | 'piShaped';
  params: number[];
  name: string;
}

/**
 * Create a membership function from a definition
 */
export function createMembershipFunction(def: MembershipFunctionDefinition): MembershipFunction {
  switch (def.type) {
    case 'triangular':
      return (x: number) => triangular(x, def.params[0], def.params[1], def.params[2]);
    case 'trapezoidal':
      return (x: number) => trapezoidal(x, def.params[0], def.params[1], def.params[2], def.params[3]);
    case 'gaussian':
      return (x: number) => gaussian(x, def.params[0], def.params[1]);
    case 'generalizedBell':
      return (x: number) => generalizedBell(x, def.params[0], def.params[1], def.params[2]);
    case 'sigmoid':
      return (x: number) => sigmoid(x, def.params[0], def.params[1]);
    case 'leftShoulder':
      return (x: number) => leftShoulder(x, def.params[0], def.params[1]);
    case 'rightShoulder':
      return (x: number) => rightShoulder(x, def.params[0], def.params[1]);
    case 'piShaped':
      return (x: number) => piShaped(x, def.params[0], def.params[1], def.params[2], def.params[3]);
    default:
      throw new Error(`Unknown membership function type: ${def.type}`);
  }
}
