/**
 * Fuzzy Logic Core: Fuzzy Set Definitions
 * 
 * This module defines formal fuzzy sets with explicit membership functions
 * for all semantic dimensions used in Swiss tourism activity classification.
 * 
 * Each fuzzy set is defined with:
 * - A name (linguistic label)
 * - A membership function
 * - Domain bounds
 */

import { 
  triangular, 
  trapezoidal, 
  leftShoulder, 
  rightShoulder, 
  gaussian,
  MembershipFunction 
} from './membershipFunctions';

// ============================================================================
// FUZZY SET TYPE DEFINITIONS
// ============================================================================

export interface FuzzySet {
  name: string;
  membershipFunction: MembershipFunction;
  domain: [number, number];
}

export interface FuzzyVariable {
  name: string;
  domain: [number, number];
  sets: FuzzySet[];
}

// ============================================================================
// CONFIDENCE FUZZY VARIABLE
// Domain: [0, 1]
// ============================================================================

export const confidenceSets: FuzzySet[] = [
  {
    name: 'very_low',
    membershipFunction: (x: number) => leftShoulder(x, 0.1, 0.25),
    domain: [0, 1],
  },
  {
    name: 'low',
    membershipFunction: (x: number) => triangular(x, 0.1, 0.25, 0.4),
    domain: [0, 1],
  },
  {
    name: 'medium',
    membershipFunction: (x: number) => triangular(x, 0.3, 0.5, 0.7),
    domain: [0, 1],
  },
  {
    name: 'high',
    membershipFunction: (x: number) => triangular(x, 0.6, 0.75, 0.9),
    domain: [0, 1],
  },
  {
    name: 'very_high',
    membershipFunction: (x: number) => rightShoulder(x, 0.75, 0.9),
    domain: [0, 1],
  },
];

export const confidenceVariable: FuzzyVariable = {
  name: 'confidence',
  domain: [0, 1],
  sets: confidenceSets,
};

// ============================================================================
// SIMILARITY FUZZY VARIABLE (for text matching)
// Domain: [0, 1]
// ============================================================================

export const similaritySets: FuzzySet[] = [
  {
    name: 'no_match',
    membershipFunction: (x: number) => leftShoulder(x, 0.15, 0.3),
    domain: [0, 1],
  },
  {
    name: 'weak_match',
    membershipFunction: (x: number) => triangular(x, 0.2, 0.35, 0.5),
    domain: [0, 1],
  },
  {
    name: 'partial_match',
    membershipFunction: (x: number) => triangular(x, 0.4, 0.55, 0.7),
    domain: [0, 1],
  },
  {
    name: 'strong_match',
    membershipFunction: (x: number) => triangular(x, 0.6, 0.75, 0.9),
    domain: [0, 1],
  },
  {
    name: 'exact_match',
    membershipFunction: (x: number) => rightShoulder(x, 0.8, 0.95),
    domain: [0, 1],
  },
];

export const similarityVariable: FuzzyVariable = {
  name: 'similarity',
  domain: [0, 1],
  sets: similaritySets,
};

// ============================================================================
// DIFFICULTY FUZZY VARIABLE
// Domain: [0, 1] where 0 = easiest, 1 = hardest
// ============================================================================

export const difficultySets: FuzzySet[] = [
  {
    name: 'very_easy',
    membershipFunction: (x: number) => leftShoulder(x, 0.1, 0.25),
    domain: [0, 1],
  },
  {
    name: 'easy',
    membershipFunction: (x: number) => triangular(x, 0.1, 0.25, 0.45),
    domain: [0, 1],
  },
  {
    name: 'medium',
    membershipFunction: (x: number) => triangular(x, 0.35, 0.5, 0.65),
    domain: [0, 1],
  },
  {
    name: 'difficult',
    membershipFunction: (x: number) => triangular(x, 0.55, 0.75, 0.9),
    domain: [0, 1],
  },
  {
    name: 'very_difficult',
    membershipFunction: (x: number) => rightShoulder(x, 0.75, 0.9),
    domain: [0, 1],
  },
];

export const difficultyVariable: FuzzyVariable = {
  name: 'difficulty',
  domain: [0, 1],
  sets: difficultySets,
};

// ============================================================================
// TIME NEEDED FUZZY VARIABLE
// Domain: [0, 1] where 0 = shortest, 1 = longest
// Mapped from actual durations: 0-1h=0.1, 1-2h=0.25, half-day=0.5, full-day=0.75, multi-day=0.9
// ============================================================================

export const timeNeededSets: FuzzySet[] = [
  {
    name: 'very_short',
    membershipFunction: (x: number) => leftShoulder(x, 0.1, 0.2),
    domain: [0, 1],
  },
  {
    name: 'short',
    membershipFunction: (x: number) => triangular(x, 0.1, 0.25, 0.4),
    domain: [0, 1],
  },
  {
    name: 'half_day',
    membershipFunction: (x: number) => triangular(x, 0.35, 0.5, 0.65),
    domain: [0, 1],
  },
  {
    name: 'full_day',
    membershipFunction: (x: number) => triangular(x, 0.55, 0.75, 0.85),
    domain: [0, 1],
  },
  {
    name: 'multi_day',
    membershipFunction: (x: number) => rightShoulder(x, 0.75, 0.9),
    domain: [0, 1],
  },
];

export const timeNeededVariable: FuzzyVariable = {
  name: 'time_needed',
  domain: [0, 1],
  sets: timeNeededSets,
};

// ============================================================================
// SUITABILITY FUZZY VARIABLE
// Domain: [0, 1] where 0 = not suitable, 1 = perfectly suitable
// ============================================================================

export const suitabilitySets: FuzzySet[] = [
  {
    name: 'not_suitable',
    membershipFunction: (x: number) => leftShoulder(x, 0.15, 0.3),
    domain: [0, 1],
  },
  {
    name: 'somewhat_suitable',
    membershipFunction: (x: number) => triangular(x, 0.2, 0.4, 0.6),
    domain: [0, 1],
  },
  {
    name: 'suitable',
    membershipFunction: (x: number) => triangular(x, 0.5, 0.7, 0.85),
    domain: [0, 1],
  },
  {
    name: 'highly_suitable',
    membershipFunction: (x: number) => rightShoulder(x, 0.7, 0.9),
    domain: [0, 1],
  },
];

export const suitabilityVariable: FuzzyVariable = {
  name: 'suitability',
  domain: [0, 1],
  sets: suitabilitySets,
};

// ============================================================================
// RELEVANCE FUZZY VARIABLE (for search results)
// Domain: [0, 1]
// ============================================================================

export const relevanceSets: FuzzySet[] = [
  {
    name: 'irrelevant',
    membershipFunction: (x: number) => leftShoulder(x, 0.2, 0.35),
    domain: [0, 1],
  },
  {
    name: 'marginally_relevant',
    membershipFunction: (x: number) => triangular(x, 0.25, 0.4, 0.55),
    domain: [0, 1],
  },
  {
    name: 'relevant',
    membershipFunction: (x: number) => triangular(x, 0.45, 0.6, 0.75),
    domain: [0, 1],
  },
  {
    name: 'highly_relevant',
    membershipFunction: (x: number) => triangular(x, 0.65, 0.8, 0.92),
    domain: [0, 1],
  },
  {
    name: 'perfectly_relevant',
    membershipFunction: (x: number) => rightShoulder(x, 0.85, 0.95),
    domain: [0, 1],
  },
];

export const relevanceVariable: FuzzyVariable = {
  name: 'relevance',
  domain: [0, 1],
  sets: relevanceSets,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Fuzzify a crisp value against a fuzzy variable
 * Returns membership degrees for all fuzzy sets in the variable
 */
export function fuzzify(value: number, variable: FuzzyVariable): Map<string, number> {
  const result = new Map<string, number>();
  
  for (const set of variable.sets) {
    const membership = set.membershipFunction(value);
    result.set(set.name, membership);
  }
  
  return result;
}

/**
 * Get the dominant fuzzy set (highest membership) for a value
 */
export function getDominantSet(value: number, variable: FuzzyVariable): { name: string; membership: number } {
  let maxMembership = 0;
  let dominantName = variable.sets[0].name;
  
  for (const set of variable.sets) {
    const membership = set.membershipFunction(value);
    if (membership > maxMembership) {
      maxMembership = membership;
      dominantName = set.name;
    }
  }
  
  return { name: dominantName, membership: maxMembership };
}

/**
 * Get linguistic interpretation of a fuzzy value
 * Returns a human-readable description based on membership degrees
 */
export function getLinguisticInterpretation(
  value: number, 
  variable: FuzzyVariable,
  threshold: number = 0.3
): string[] {
  const memberships = fuzzify(value, variable);
  const interpretations: string[] = [];
  
  for (const [name, membership] of memberships) {
    if (membership >= threshold) {
      interpretations.push(name.replace(/_/g, ' '));
    }
  }
  
  return interpretations.length > 0 ? interpretations : [getDominantSet(value, variable).name.replace(/_/g, ' ')];
}

// ============================================================================
// MAPPING FUNCTIONS: Convert API values to fuzzy domain values
// ============================================================================

/**
 * Map difficulty API values to fuzzy domain [0, 1]
 */
export function mapDifficultyToFuzzy(difficulty: string): number {
  const mapping: Record<string, number> = {
    'easy': 0.2,
    'medium': 0.5,
    'difficult': 0.8,
  };
  return mapping[difficulty.toLowerCase()] ?? 0.5;
}

/**
 * Map time needed API values to fuzzy domain [0, 1]
 */
export function mapTimeNeededToFuzzy(timeNeeded: string): number {
  const mapping: Record<string, number> = {
    '< 1 h': 0.1,
    '1 - 2 h': 0.25,
    '2 - 4 h': 0.4,
    '> 4 h': 0.6,
    'half a day': 0.5,
    'a day': 0.75,
    'several days': 0.9,
  };
  return mapping[timeNeeded.toLowerCase()] ?? 0.5;
}

/**
 * Map experience type to fuzzy membership scores
 * Returns a map of experience type -> membership degree
 */
export function mapExperienceTypeToFuzzy(experienceType: string): Map<string, number> {
  const result = new Map<string, number>();
  const type = experienceType.toLowerCase();
  
  // Primary categories with fuzzy membership
  const categories = ['outdoor', 'culture', 'culinary', 'wellness', 'adventure', 'family'];
  
  for (const category of categories) {
    if (type.includes(category)) {
      result.set(category, 1.0);
    } else {
      // Cross-category relationships with partial membership
      if (category === 'adventure' && (type.includes('outdoor') || type.includes('sport'))) {
        result.set(category, 0.6);
      } else if (category === 'family' && (type.includes('easy') || type.includes('accessible'))) {
        result.set(category, 0.5);
      } else if (category === 'wellness' && type.includes('relax')) {
        result.set(category, 0.7);
      } else {
        result.set(category, 0.0);
      }
    }
  }
  
  return result;
}
