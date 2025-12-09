// Semantic NLP using TF-IDF for improved matching
import { buildCorpus, queryToTFIDF, findBestMatch, type TFIDFCorpus } from './tfidf';

export interface ParsedQuery {
  experienceType?: string;
  neededTime?: string;
  difficulty?: string;
  suitableFor?: string;
  keywords: string[];
}

// Extended category definitions with richer semantic descriptions
const EXPERIENCE_TYPE_DOCS = [
  { id: 'cultural', text: 'cultural culture museum art history historic heritage architecture landmark monument gallery exhibition tradition festival theater opera concert classical music' },
  { id: 'outdoor', text: 'outdoor nature hiking mountain alpine skiing biking adventure trail trek climbing rock forest lake river waterfall scenic view panorama wilderness camping' },
  { id: 'gastronomy', text: 'food dining restaurant culinary wine cheese gastronomy chocolate fondue raclette gourmet cuisine tasting menu cooking kitchen chef delicacy local specialty swiss' },
  { id: 'shopping', text: 'shopping shop boutique market store mall retail fashion watches jewelry luxury brand souvenir gift craft artisan handmade' },
  { id: 'wellness', text: 'wellness spa relax thermal bath sauna massage therapy treatment health resort peaceful calm serene rejuvenate unwind stress relief meditation yoga' },
];

const NEEDED_TIME_DOCS = [
  { id: 'lessthan1hour', text: 'quick short brief less than hour under hour fast rapid speedy fifteen minutes thirty minutes half hour quick visit quick stop' },
  { id: 'between1_2hours', text: 'one hour two hours couple hours maximum hours max hours moderate time reasonable duration not too long' },
  { id: 'between2_4hours', text: 'three hours four hours half day afternoon morning several hours extended visit' },
  { id: 'between4_8hours', text: 'full day whole day eight hours day trip entire day complete day long excursion' },
  { id: 'morethan1day', text: 'multiple days weekend week overnight stay several days extended trip long journey multi day' },
];

const DIFFICULTY_DOCS = [
  { id: 'low', text: 'easy simple not difficult beginner accessible gentle relaxed leisurely light effortless straightforward comfortable basic introductory suitable for all anyone can do' },
  { id: 'medium', text: 'moderate medium average intermediate some experience needed reasonable effort regular fitness level' },
  { id: 'high', text: 'difficult challenging hard advanced strenuous demanding tough expert experienced required physical fitness athletic intense extreme' },
];

const SUITABLE_FOR_DOCS = [
  { id: 'family', text: 'family families kids children kid child toddler baby infant young ones little ones parents mom dad family friendly child friendly educational fun for kids playground' },
  { id: 'groups', text: 'group groups team teams party corporate event company colleagues friends gathering tour group organized' },
  { id: 'individual', text: 'solo individual alone myself single traveler independent personal private one person' },
  { id: 'seniors', text: 'elderly senior seniors older grandparents retired elder mature age accessible low mobility comfortable pace gentle' },
  { id: 'couples', text: 'couple couples romantic romance partner date honeymoon anniversary love intimate two people together special occasion' },
];

// Pre-built corpora for each category
let experienceCorpus: TFIDFCorpus;
let timeCorpus: TFIDFCorpus;
let difficultyCorpus: TFIDFCorpus;
let suitableCorpus: TFIDFCorpus;

// Initialize corpora (lazy initialization)
function initCorpora() {
  if (!experienceCorpus) {
    experienceCorpus = buildCorpus(EXPERIENCE_TYPE_DOCS);
    timeCorpus = buildCorpus(NEEDED_TIME_DOCS);
    difficultyCorpus = buildCorpus(DIFFICULTY_DOCS);
    suitableCorpus = buildCorpus(SUITABLE_FOR_DOCS);
  }
}

// Match query against a corpus with confidence threshold
function matchCategory(
  query: string,
  corpus: TFIDFCorpus,
  threshold: number = 0.08,
  categoryName?: string
): { id: string | undefined; score: number } {
  const queryVec = queryToTFIDF(query, corpus);
  const match = findBestMatch(queryVec, corpus, threshold);
  
  if (categoryName && match) {
    console.log(`[TF-IDF] ${categoryName}: matched "${match.id}" (score: ${match.score.toFixed(3)})`);
  }
  
  return { id: match?.id, score: match?.score || 0 };
}

export function parseQuerySemantic(query: string): ParsedQuery {
  initCorpora();
  
  console.log(`\n[TF-IDF Semantic Parser] Processing: "${query}"`);
  
  const result: ParsedQuery = {
    keywords: [],
  };

  // Use TF-IDF semantic matching for each category
  const expMatch = matchCategory(query, experienceCorpus, 0.08, 'experienceType');
  result.experienceType = expMatch.id;
  const timeMatch = matchCategory(query, timeCorpus, 0.1, 'neededTime');
  result.neededTime = timeMatch.id;
  
  const diffMatch = matchCategory(query, difficultyCorpus, 0.1, 'difficulty');
  result.difficulty = diffMatch.id;
  
  const suitableMatch = matchCategory(query, suitableCorpus, 0.08, 'suitableFor');
  result.suitableFor = suitableMatch.id;
  
  console.log('[TF-IDF] Final parsed result:', result);

  // Extract keywords (words longer than 3 chars, excluding common stop words)
  const stopWords = new Set([
    'want', 'looking', 'find', 'need', 'would', 'like', 'please', 'show',
    'give', 'what', 'where', 'when', 'which', 'that', 'this', 'with',
    'from', 'have', 'some', 'about', 'more', 'very', 'just', 'also',
    'into', 'them', 'than', 'been', 'could', 'should', 'would', 'there',
    'their', 'will', 'each', 'make', 'can', 'the', 'and', 'for'
  ]);
  
  result.keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  return result;
}

// Export for testing/debugging
export function getMatchScores(query: string): {
  experienceType: { id: string; score: number }[];
  neededTime: { id: string; score: number }[];
  difficulty: { id: string; score: number }[];
  suitableFor: { id: string; score: number }[];
} {
  initCorpora();
  
  const { findAllMatches } = require('./tfidf');
  
  return {
    experienceType: findAllMatches(queryToTFIDF(query, experienceCorpus), experienceCorpus),
    neededTime: findAllMatches(queryToTFIDF(query, timeCorpus), timeCorpus),
    difficulty: findAllMatches(queryToTFIDF(query, difficultyCorpus), difficultyCorpus),
    suitableFor: findAllMatches(queryToTFIDF(query, suitableCorpus), suitableCorpus),
  };
}
