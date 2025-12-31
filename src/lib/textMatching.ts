// Text matching utilities for precision/recall calculation

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity between two strings (0-1)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  
  return 1 - (distance / maxLength);
}

/**
 * Check if a returned activity title matches any expected name
 * Uses fuzzy matching with a similarity threshold
 */
export function findMatchingName(
  returnedTitle: string,
  expectedNames: string[],
  threshold: number = 0.6
): { matched: boolean; matchedName?: string; similarity: number } {
  let bestMatch = { matched: false, matchedName: undefined as string | undefined, similarity: 0 };
  
  const normalizedTitle = returnedTitle.toLowerCase().trim();
  
  for (const expectedName of expectedNames) {
    const normalizedExpected = expectedName.toLowerCase().trim();
    
    // Check for exact match or containment first
    if (normalizedTitle === normalizedExpected || 
        normalizedTitle.includes(normalizedExpected) || 
        normalizedExpected.includes(normalizedTitle)) {
      return { matched: true, matchedName: expectedName, similarity: 1 };
    }
    
    // Calculate similarity
    const similarity = calculateStringSimilarity(normalizedTitle, normalizedExpected);
    
    if (similarity > bestMatch.similarity) {
      bestMatch = {
        matched: similarity >= threshold,
        matchedName: similarity >= threshold ? expectedName : undefined,
        similarity
      };
    }
  }
  
  return bestMatch;
}

/**
 * Calculate FUZZY precision and recall using name-based matching
 * Uses similarity degrees directly instead of binary threshold
 * 
 * Fuzzy Precision = sum of all similarities / total returned
 * Fuzzy Recall = sum of best similarities for each expected / total expected
 */
export function calculateFuzzyPrecisionRecall(
  returnedTitles: string[],
  expectedNames: string[],
): { 
  precision: number; 
  recall: number; 
  f1Score: number;
  sumSimilarities: number;
  matchDetails: Array<{ returned: string; bestMatch?: string; similarity: number }>;
} {
  if (expectedNames.length === 0) {
    return { precision: 1, recall: 1, f1Score: 1, sumSimilarities: 0, matchDetails: [] };
  }
  
  if (returnedTitles.length === 0) {
    return { precision: 0, recall: 0, f1Score: 0, sumSimilarities: 0, matchDetails: [] };
  }
  
  const matchDetails: Array<{ returned: string; bestMatch?: string; similarity: number }> = [];
  
  // For each returned activity, find its best match similarity
  let sumReturnedSimilarities = 0;
  for (const title of returnedTitles) {
    let bestSimilarity = 0;
    let bestMatch: string | undefined;
    
    for (const expectedName of expectedNames) {
      const similarity = calculateStringSimilarity(title, expectedName);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = expectedName;
      }
    }
    
    sumReturnedSimilarities += bestSimilarity;
    matchDetails.push({
      returned: title,
      bestMatch,
      similarity: bestSimilarity
    });
  }
  
  // Fuzzy Precision: average similarity of returned activities
  const precision = sumReturnedSimilarities / returnedTitles.length;
  
  // For recall: find best similarity for each expected activity
  let sumExpectedSimilarities = 0;
  for (const expectedName of expectedNames) {
    let bestSimilarity = 0;
    
    for (const title of returnedTitles) {
      const similarity = calculateStringSimilarity(title, expectedName);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
      }
    }
    
    sumExpectedSimilarities += bestSimilarity;
  }
  
  // Fuzzy Recall: average of best similarities for expected activities
  const recall = sumExpectedSimilarities / expectedNames.length;
  
  // F1 Score
  const f1Score = (precision + recall) > 0 
    ? (2 * precision * recall) / (precision + recall) 
    : 0;
  
  return { 
    precision, 
    recall, 
    f1Score,
    sumSimilarities: sumReturnedSimilarities,
    matchDetails 
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateFuzzyPrecisionRecall instead
 */
export function calculateNameBasedPrecisionRecall(
  returnedTitles: string[],
  expectedNames: string[],
  threshold: number = 0.6
): { 
  precision: number; 
  recall: number; 
  relevantReturned: number;
  matchDetails: Array<{ returned: string; matched?: string; similarity: number }>;
} {
  // Use fuzzy logic and convert to legacy format
  const fuzzyResult = calculateFuzzyPrecisionRecall(returnedTitles, expectedNames);
  
  // Count how many exceeded threshold for legacy relevantReturned
  const relevantReturned = fuzzyResult.matchDetails.filter(d => d.similarity >= threshold).length;
  
  return { 
    precision: fuzzyResult.precision, 
    recall: fuzzyResult.recall, 
    relevantReturned,
    matchDetails: fuzzyResult.matchDetails.map(d => ({
      returned: d.returned,
      matched: d.bestMatch,
      similarity: d.similarity
    }))
  };
}
