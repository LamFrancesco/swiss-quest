// NLP using TF-IDF + Embeddings semantic matching for Swiss tourism activities
// Re-exports from semantic implementation for improved matching

import { parseQuerySemantic, parseQuerySemanticAsync, initSemanticParser, getMatchScores } from './nlpSemantic';

export interface ConfidenceScores {
  experienceType?: number;
  neededTime?: number;
  difficulty?: number;
  suitableFor?: number;
}

export interface ParsedQuery {
  experienceType?: string;
  neededTime?: string;
  difficulty?: string;
  suitableFor?: string;
  keywords: string[];
  confidence?: ConfidenceScores;
  avgConfidence?: number;
}

// Legacy exact keyword matching (kept for reference/fallback)
const EXPERIENCE_TYPES = {
  cultural: ['cultural', 'culture', 'museum', 'art', 'history', 'historic', 'heritage'],
  outdoor: ['outdoor', 'nature', 'hiking', 'mountain', 'alpine', 'skiing', 'biking', 'adventure'],
  gastronomy: ['food', 'dining', 'restaurant', 'culinary', 'wine', 'cheese', 'gastronomy', 'chocolate'],
  shopping: ['shopping', 'shop', 'boutique', 'market'],
  wellness: ['wellness', 'spa', 'relax', 'thermal'],
};

const NEEDED_TIME = {
  lessthan1hour: ['quick', 'short', 'brief', 'less than 1 hour', 'under 1 hour', 'less than an hour'],
  between1_2hours: ['1 hour', '2 hours', 'couple hours', 'maximum 2 hours', 'max 2 hours'],
  between2_4hours: ['3 hours', '4 hours', 'half day', 'afternoon'],
  between4_8hours: ['full day', 'whole day', '8 hours'],
  morethan1day: ['multiple days', 'weekend', 'week'],
};

const DIFFICULTY = {
  low: ['easy', 'simple', 'not difficult', 'not too difficult', 'beginner', 'accessible', 'gentle', 'relaxed', 'leisurely', 'light'],
  medium: ['moderate', 'medium', 'average', 'intermediate'],
  high: ['difficult', 'challenging', 'hard', 'advanced', 'strenuous', 'demanding'],
};

const SUITABLE_FOR = {
  family: ['family', 'families', 'kids', 'children', 'kid', 'child'],
  groups: ['group', 'groups', 'team', 'teams'],
  individual: ['solo', 'individual', 'alone', 'myself'],
  seniors: ['elderly', 'senior', 'seniors', 'older', 'grandparents', 'retired', 'elder'],
  couples: ['couple', 'couples', 'romantic', 'romance', 'partner', 'date', 'honeymoon'],
};

// Legacy exact keyword matching function
export function parseQueryKeyword(query: string): ParsedQuery {
  const lowerQuery = query.toLowerCase();
  const result: ParsedQuery = {
    keywords: [],
  };

  // Extract experience type
  for (const [type, keywords] of Object.entries(EXPERIENCE_TYPES)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      result.experienceType = type;
      break;
    }
  }

  // Extract needed time
  for (const [time, keywords] of Object.entries(NEEDED_TIME)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      result.neededTime = time;
      break;
    }
  }

  // Extract difficulty
  for (const [diff, keywords] of Object.entries(DIFFICULTY)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      result.difficulty = diff;
      break;
    }
  }

  // Extract suitable for
  for (const [suitable, keywords] of Object.entries(SUITABLE_FOR)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      result.suitableFor = suitable;
      break;
    }
  }

  // Extract general keywords
  result.keywords = query.split(' ').filter(word => word.length > 3);

  return result;
}

// Main parseQuery function - uses TF-IDF semantic matching (sync)
export function parseQuery(query: string): ParsedQuery {
  return parseQuerySemantic(query);
}

// Async version with embeddings support (preferred for higher accuracy)
export async function parseQueryAsync(query: string): Promise<ParsedQuery> {
  return parseQuerySemanticAsync(query);
}

// Initialize embeddings model
export { initSemanticParser };

// Export for debugging
export { getMatchScores };
