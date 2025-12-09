// Sentence embeddings using Hugging Face Transformers for semantic matching
import { pipeline } from '@huggingface/transformers';

// Use any type to avoid complex union type issues with the pipeline
let extractor: any = null;
let isLoading = false;
let loadError: Error | null = null;

// Category descriptions for embedding comparison
const CATEGORY_DESCRIPTIONS = {
  experienceType: {
    cultural: 'cultural activities like museums, art galleries, historical sites, heritage tours, architecture, monuments, exhibitions, theater, opera, classical music concerts',
    outdoor: 'outdoor nature activities like hiking, mountain climbing, skiing, biking, adventure sports, forest trails, lake views, scenic panoramas, wilderness camping',
    gastronomy: 'food and dining experiences like restaurants, wine tasting, cheese tours, chocolate, gourmet cuisine, cooking classes, local Swiss specialties',
    shopping: 'shopping experiences like boutiques, markets, luxury stores, watches, jewelry, souvenirs, artisan crafts',
    wellness: 'wellness and relaxation like spa treatments, thermal baths, massage, meditation, yoga, peaceful retreats, stress relief, rejuvenation',
  },
  neededTime: {
    lessthan1hour: 'quick visit taking less than one hour, short brief stop',
    between1_2hours: 'activity lasting one to two hours, couple hours duration',
    between2_4hours: 'half day activity lasting two to four hours, afternoon excursion',
    between4_8hours: 'full day activity lasting four to eight hours, whole day trip',
    morethan1day: 'multi-day experience lasting more than one day, weekend trip, week-long journey',
  },
  difficulty: {
    low: 'easy and accessible activity suitable for beginners, gentle, relaxed, leisurely, effortless, comfortable for all ages',
    medium: 'moderate difficulty requiring some experience, average effort, intermediate level',
    high: 'difficult and challenging activity for advanced or experienced people, strenuous, demanding, requires good fitness',
  },
  suitableFor: {
    family: 'suitable for families with kids and children, family-friendly, educational, fun for young ones',
    groups: 'suitable for groups, teams, corporate events, friends gathering, organized tours',
    individual: 'suitable for solo travelers, individual experience, personal, independent',
    seniors: 'suitable for seniors and elderly, accessible, comfortable pace, gentle activities',
    couples: 'suitable for couples, romantic, intimate, honeymoon, anniversary, date',
  },
};

// Pre-computed embeddings cache
let categoryEmbeddings: Map<string, Map<string, number[]>> | null = null;

// Initialize the embedding model
export async function initEmbeddings(): Promise<boolean> {
  if (extractor) return true;
  if (isLoading) return false;
  if (loadError) return false;

  isLoading = true;
  console.log('[Embeddings] Loading sentence transformer model...');

  try {
    // Use a small, fast model optimized for embeddings
    extractor = await pipeline(
      'feature-extraction',
      'mixedbread-ai/mxbai-embed-xsmall-v1',
      { device: 'webgpu' }
    );
    
    console.log('[Embeddings] Model loaded successfully!');
    
    // Pre-compute category embeddings
    await precomputeCategoryEmbeddings();
    
    isLoading = false;
    return true;
  } catch (error) {
    console.error('[Embeddings] Failed to load model:', error);
    loadError = error as Error;
    isLoading = false;
    return false;
  }
}

// Pre-compute embeddings for all category descriptions
async function precomputeCategoryEmbeddings(): Promise<void> {
  if (!extractor) return;
  
  console.log('[Embeddings] Pre-computing category embeddings...');
  categoryEmbeddings = new Map();

  for (const [categoryType, categories] of Object.entries(CATEGORY_DESCRIPTIONS)) {
    const categoryMap = new Map<string, number[]>();
    
    for (const [categoryId, description] of Object.entries(categories)) {
      const embedding = await computeEmbedding(description);
      if (embedding) {
        categoryMap.set(categoryId, embedding);
      }
    }
    
    categoryEmbeddings.set(categoryType, categoryMap);
  }
  
  console.log('[Embeddings] Category embeddings ready!');
}

// Compute embedding for a text
async function computeEmbedding(text: string): Promise<number[] | null> {
  if (!extractor) return null;
  
  try {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  } catch (error) {
    console.error('[Embeddings] Error computing embedding:', error);
    return null;
  }
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find best matching category using embeddings
export async function findBestMatchWithEmbeddings(
  query: string,
  categoryType: keyof typeof CATEGORY_DESCRIPTIONS,
  threshold: number = 0.3
): Promise<{ id: string; score: number } | null> {
  if (!extractor || !categoryEmbeddings) return null;
  
  const queryEmbedding = await computeEmbedding(query);
  if (!queryEmbedding) return null;
  
  const categories = categoryEmbeddings.get(categoryType);
  if (!categories) return null;
  
  let bestMatch: { id: string; score: number } | null = null;
  
  for (const [categoryId, categoryEmbedding] of categories) {
    const score = cosineSimilarity(queryEmbedding, categoryEmbedding);
    
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: categoryId, score };
    }
  }
  
  return bestMatch;
}

// Check if embeddings are ready
export function isEmbeddingsReady(): boolean {
  return extractor !== null && categoryEmbeddings !== null;
}

// Get loading status
export function getEmbeddingsStatus(): 'ready' | 'loading' | 'error' | 'not-started' {
  if (extractor && categoryEmbeddings) return 'ready';
  if (isLoading) return 'loading';
  if (loadError) return 'error';
  return 'not-started';
}
