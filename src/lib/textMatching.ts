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
 * Calculate precision and recall using name-based matching
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
  if (expectedNames.length === 0) {
    return { precision: 1, recall: 1, relevantReturned: 0, matchDetails: [] };
  }
  
  const matchDetails: Array<{ returned: string; matched?: string; similarity: number }> = [];
  const matchedExpectedNames = new Set<string>();
  
  for (const title of returnedTitles) {
    const result = findMatchingName(title, expectedNames, threshold);
    matchDetails.push({
      returned: title,
      matched: result.matchedName,
      similarity: result.similarity
    });
    
    if (result.matched && result.matchedName) {
      matchedExpectedNames.add(result.matchedName);
    }
  }
  
  const relevantReturned = matchedExpectedNames.size;
  const precision = returnedTitles.length > 0 ? relevantReturned / returnedTitles.length : 0;
  const recall = expectedNames.length > 0 ? relevantReturned / expectedNames.length : 0;
  
  return { precision, recall, relevantReturned, matchDetails };
}
