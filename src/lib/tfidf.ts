// TF-IDF implementation for semantic matching

export interface TFIDFDocument {
  id: string;
  terms: string[];
  tfidf: Map<string, number>;
}

export interface TFIDFCorpus {
  documents: TFIDFDocument[];
  idf: Map<string, number>;
  vocabulary: Set<string>;
}

// Tokenize and normalize text
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

// Calculate term frequency for a document
function calculateTF(terms: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const totalTerms = terms.length;
  
  for (const term of terms) {
    tf.set(term, (tf.get(term) || 0) + 1);
  }
  
  // Normalize by total terms
  for (const [term, count] of tf) {
    tf.set(term, count / totalTerms);
  }
  
  return tf;
}

// Build corpus with IDF values
export function buildCorpus(documents: { id: string; text: string }[]): TFIDFCorpus {
  const vocabulary = new Set<string>();
  const docFreq = new Map<string, number>();
  const processedDocs: TFIDFDocument[] = [];
  
  // First pass: tokenize and count document frequencies
  for (const doc of documents) {
    const terms = tokenize(doc.text);
    const uniqueTerms = new Set(terms);
    
    for (const term of uniqueTerms) {
      vocabulary.add(term);
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
    
    processedDocs.push({
      id: doc.id,
      terms,
      tfidf: new Map(),
    });
  }
  
  // Calculate IDF for each term
  const numDocs = documents.length;
  const idf = new Map<string, number>();
  
  for (const [term, df] of docFreq) {
    // Using smoothed IDF: log((N + 1) / (df + 1)) + 1
    idf.set(term, Math.log((numDocs + 1) / (df + 1)) + 1);
  }
  
  // Second pass: calculate TF-IDF for each document
  for (const doc of processedDocs) {
    const tf = calculateTF(doc.terms);
    
    for (const [term, tfValue] of tf) {
      const idfValue = idf.get(term) || 0;
      doc.tfidf.set(term, tfValue * idfValue);
    }
  }
  
  return { documents: processedDocs, idf, vocabulary };
}

// Calculate TF-IDF vector for a query against existing corpus
export function queryToTFIDF(query: string, corpus: TFIDFCorpus): Map<string, number> {
  const terms = tokenize(query);
  const tf = calculateTF(terms);
  const tfidf = new Map<string, number>();
  
  for (const [term, tfValue] of tf) {
    const idfValue = corpus.idf.get(term) || Math.log(corpus.documents.length + 1);
    tfidf.set(term, tfValue * idfValue);
  }
  
  return tfidf;
}

// Cosine similarity between two TF-IDF vectors
export function cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  // Calculate dot product and norm1
  for (const [term, value] of vec1) {
    norm1 += value * value;
    if (vec2.has(term)) {
      dotProduct += value * vec2.get(term)!;
    }
  }
  
  // Calculate norm2
  for (const value of vec2.values()) {
    norm2 += value * value;
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Find best matching document from corpus
export function findBestMatch(
  queryTFIDF: Map<string, number>,
  corpus: TFIDFCorpus,
  threshold: number = 0.1
): { id: string; score: number } | null {
  let bestMatch: { id: string; score: number } | null = null;
  
  for (const doc of corpus.documents) {
    const score = cosineSimilarity(queryTFIDF, doc.tfidf);
    
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: doc.id, score };
    }
  }
  
  return bestMatch;
}

// Find all matches above threshold, sorted by score
export function findAllMatches(
  queryTFIDF: Map<string, number>,
  corpus: TFIDFCorpus,
  threshold: number = 0.05
): { id: string; score: number }[] {
  const matches: { id: string; score: number }[] = [];
  
  for (const doc of corpus.documents) {
    const score = cosineSimilarity(queryTFIDF, doc.tfidf);
    
    if (score >= threshold) {
      matches.push({ id: doc.id, score });
    }
  }
  
  return matches.sort((a, b) => b.score - a.score);
}
