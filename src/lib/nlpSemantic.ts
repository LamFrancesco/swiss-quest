// Semantic NLP using TF-IDF + Word Embeddings for improved matching
import { buildCorpus, queryToTFIDF, findBestMatch, type TFIDFCorpus } from './tfidf';
import { 
  initEmbeddings, 
  findBestMatchWithEmbeddings, 
  isEmbeddingsReady, 
  getEmbeddingsStatus 
} from './embeddings';

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

// Flag to track if we should use embeddings
let useEmbeddings = true;

// Extended category definitions with richer semantic descriptions (include word variations for stemming)
const EXPERIENCE_TYPE_DOCS = [
  { id: 'cultural', text: 'cultural culture museum art history historical historic heritage sightseeing sightsee architecture landmark monument gallery exhibition tradition festival theater opera concert classical music tour touring' },
  { id: 'outdoor', text: 'outdoor outdoors nature natural hiking hike mountain mountains alpine skiing ski biking bike adventure adventurous trail trek trekking climbing climb rock forest lake river waterfall scenic view panorama wilderness camping camp explore exploration' },
  { id: 'gastronomy', text: 'food dining dinner dine restaurant culinary wine cheese gastronomy chocolate fondue raclette gourmet cuisine tasting taste menu cooking cook kitchen chef delicacy local specialty swiss eating eat meal meals' },
  { id: 'shopping', text: 'shopping shop boutique market store mall retail fashion watches jewelry luxury brand souvenir gift craft artisan handmade buy buying purchase' },
  { id: 'wellness', text: 'wellness spa relax relaxing relaxation getaway retreat thermal bath bathing sauna massage therapy therapeutic treatment health healthy resort peaceful peace calm calming serene serenity rejuvenate rejuvenation unwind unwinding stress relief meditation meditate yoga tranquil tranquility escape escapism' },
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

// Match query against a corpus with confidence threshold (TF-IDF fallback)
function matchCategoryTFIDF(
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

// Match using embeddings with TF-IDF fallback
async function matchCategory(
  query: string,
  corpus: TFIDFCorpus,
  categoryType: 'experienceType' | 'neededTime' | 'difficulty' | 'suitableFor',
  tfidfThreshold: number = 0.08
): Promise<{ id: string | undefined; score: number; method: string }> {
  
  // Try embeddings first if available
  if (useEmbeddings && isEmbeddingsReady()) {
    const embeddingMatch = await findBestMatchWithEmbeddings(query, categoryType, 0.3);
    if (embeddingMatch) {
      console.log(`[Embeddings] ${categoryType}: matched "${embeddingMatch.id}" (score: ${embeddingMatch.score.toFixed(3)})`);
      return { id: embeddingMatch.id, score: embeddingMatch.score, method: 'embeddings' };
    }
  }
  
  // Fallback to TF-IDF
  const tfidfMatch = matchCategoryTFIDF(query, corpus, tfidfThreshold, categoryType);
  return { ...tfidfMatch, method: 'tfidf' };
}

// Async version using embeddings
export async function parseQuerySemanticAsync(query: string): Promise<ParsedQuery> {
  initCorpora();
  
  const status = getEmbeddingsStatus();
  console.log(`\n[Semantic Parser] Processing: "${query}" (embeddings: ${status})`);
  
  // Use async matching with embeddings
  const [expMatch, timeMatch, diffMatch, suitableMatch] = await Promise.all([
    matchCategory(query, experienceCorpus, 'experienceType', 0.08),
    matchCategory(query, timeCorpus, 'neededTime', 0.1),
    matchCategory(query, difficultyCorpus, 'difficulty', 0.1),
    matchCategory(query, suitableCorpus, 'suitableFor', 0.08),
  ]);

  // Build confidence scores
  const confidence: ConfidenceScores = {};
  const scores: number[] = [];
  
  if (expMatch.id) {
    confidence.experienceType = expMatch.score;
    scores.push(expMatch.score);
  }
  if (timeMatch.id) {
    confidence.neededTime = timeMatch.score;
    scores.push(timeMatch.score);
  }
  if (diffMatch.id) {
    confidence.difficulty = diffMatch.score;
    scores.push(diffMatch.score);
  }
  if (suitableMatch.id) {
    confidence.suitableFor = suitableMatch.score;
    scores.push(suitableMatch.score);
  }
  
  const avgConfidence = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const result: ParsedQuery = {
    experienceType: expMatch.id,
    neededTime: timeMatch.id,
    difficulty: diffMatch.id,
    suitableFor: suitableMatch.id,
    keywords: [],
    confidence,
    avgConfidence,
  };
  
  console.log('[Semantic Parser] Final result:', result);
  console.log(`[Semantic Parser] Confidence: exp=${confidence.experienceType?.toFixed(3)}, time=${confidence.neededTime?.toFixed(3)}, diff=${confidence.difficulty?.toFixed(3)}, suit=${confidence.suitableFor?.toFixed(3)}, avg=${avgConfidence.toFixed(3)}`);

  // Extract keywords
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

// Sync version using TF-IDF only (for backward compatibility)
export function parseQuerySemantic(query: string): ParsedQuery {
  initCorpora();
  
  console.log(`\n[TF-IDF Semantic Parser] Processing: "${query}"`);

  // Use TF-IDF matching only
  const expMatch = matchCategoryTFIDF(query, experienceCorpus, 0.08, 'experienceType');
  const timeMatch = matchCategoryTFIDF(query, timeCorpus, 0.1, 'neededTime');
  const diffMatch = matchCategoryTFIDF(query, difficultyCorpus, 0.1, 'difficulty');
  const suitableMatch = matchCategoryTFIDF(query, suitableCorpus, 0.08, 'suitableFor');
  
  // Build confidence scores
  const confidence: ConfidenceScores = {};
  const scores: number[] = [];
  
  if (expMatch.id) {
    confidence.experienceType = expMatch.score;
    scores.push(expMatch.score);
  }
  if (timeMatch.id) {
    confidence.neededTime = timeMatch.score;
    scores.push(timeMatch.score);
  }
  if (diffMatch.id) {
    confidence.difficulty = diffMatch.score;
    scores.push(diffMatch.score);
  }
  if (suitableMatch.id) {
    confidence.suitableFor = suitableMatch.score;
    scores.push(suitableMatch.score);
  }
  
  const avgConfidence = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const result: ParsedQuery = {
    experienceType: expMatch.id,
    neededTime: timeMatch.id,
    difficulty: diffMatch.id,
    suitableFor: suitableMatch.id,
    keywords: [],
    confidence,
    avgConfidence,
  };
  
  console.log('[TF-IDF] Final parsed result:', result);
  console.log(`[TF-IDF] Confidence: exp=${confidence.experienceType?.toFixed(3)}, time=${confidence.neededTime?.toFixed(3)}, diff=${confidence.difficulty?.toFixed(3)}, suit=${confidence.suitableFor?.toFixed(3)}, avg=${avgConfidence.toFixed(3)}`);

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

// Initialize embeddings (call on app start)
export async function initSemanticParser(): Promise<boolean> {
  console.log('[Semantic Parser] Initializing embeddings...');
  const success = await initEmbeddings();
  if (success) {
    console.log('[Semantic Parser] Embeddings ready - using transformer model');
  } else {
    console.log('[Semantic Parser] Falling back to TF-IDF');
  }
  return success;
}

// Toggle embeddings usage
export function setUseEmbeddings(use: boolean): void {
  useEmbeddings = use;
  console.log(`[Semantic Parser] Embeddings ${use ? 'enabled' : 'disabled'}`);
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
