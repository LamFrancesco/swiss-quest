import { parseQuery } from './nlp';
import { searchActivities, Activity } from './api';
import { goldStandardDataset, GoldStandardQuery } from '../data/goldStandardDataset';
import { calculateNameBasedPrecisionRecall } from './textMatching';

export interface MetricsResult {
  queryId: string;
  query: string;
  latency: number;
  precision: number;
  recall: number;
  relevantReturned: number;
  totalReturned: number;
  totalRelevant: number;
  filterAccuracy: number;
  matchDetails?: Array<{ returned: string; matched?: string; similarity: number }>;
}

export interface ConsistencyResult {
  queryId: string;
  query: string;
  runs: number;
  exactMatches: number;
  consistencyScore: number;
  variations: string[];
}

export interface EvaluationReport {
  timestamp: string;
  metricsResults: MetricsResult[];
  consistencyResults: ConsistencyResult[];
  averages: {
    avgLatency: number;
    avgPrecision: number;
    avgRecall: number;
    avgFilterAccuracy: number;
    avgConsistency: number;
  };
}

// Calculate Levenshtein distance for fuzzy string matching
function levenshteinDistance(str1: string, str2: string): number {
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
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  return dp[m][n];
}

// Calculate improved text similarity using multiple methods
function calculateTextSimilarity(text1: string, text2: string): number {
  const lower1 = text1.toLowerCase().trim();
  const lower2 = text2.toLowerCase().trim();
  
  // Exact match
  if (lower1 === lower2) return 1.0;
  
  // Check if one contains the other
  if (lower1.includes(lower2) || lower2.includes(lower1)) {
    const shorter = Math.min(lower1.length, lower2.length);
    const longer = Math.max(lower1.length, lower2.length);
    return shorter / longer * 0.9; // 90% similarity for containment
  }
  
  // Levenshtein-based similarity
  const maxLen = Math.max(lower1.length, lower2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(lower1, lower2);
  const levenshteinSimilarity = 1 - (distance / maxLen);
  
  // Word overlap (Jaccard similarity)
  const words1 = new Set(lower1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(lower2.split(/\s+/).filter(w => w.length > 2));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;
  
  // Combine both methods (weighted average)
  return (levenshteinSimilarity * 0.6) + (jaccardSimilarity * 0.4);
}

// Check if filters match expected filters
function checkFilterAccuracy(
  actualFilters: any,
  expectedFilters: any
): number {
  const filterKeys = ['experienceType', 'neededTime', 'difficulty', 'suitableFor'];
  let matches = 0;
  let total = 0;

  filterKeys.forEach(key => {
    if (expectedFilters[key]) {
      total++;
      if (actualFilters[key] === expectedFilters[key]) {
        matches++;
      }
    }
  });

  return total > 0 ? matches / total : 1;
}

// Calculate precision and recall using name-based matching
function calculatePrecisionRecall(
  returnedActivities: Activity[],
  expectedActivityNames: string[]
): { precision: number; recall: number; relevantReturned: number; matchDetails: Array<{ returned: string; matched?: string; similarity: number }> } {
  const returnedTitles = returnedActivities.map(a => a.title);
  return calculateNameBasedPrecisionRecall(returnedTitles, expectedActivityNames, 0.5);
}

// Evaluate a single query
async function evaluateQuery(goldStandard: GoldStandardQuery): Promise<MetricsResult> {
  const startTime = performance.now();
  
  // Parse the query
  const parsedQuery = parseQuery(goldStandard.query);
  
  // Search activities
  const activities = await searchActivities({
    experienceType: parsedQuery.experienceType,
    neededTime: parsedQuery.neededTime,
    difficulty: parsedQuery.difficulty,
    suitableFor: parsedQuery.suitableFor,
    query: goldStandard.query
  });
  
  const endTime = performance.now();
  const latency = endTime - startTime;

  // Calculate filter accuracy
  const filterAccuracy = checkFilterAccuracy(parsedQuery, goldStandard.expectedFilters);

  // Calculate precision and recall using name-based matching
  const expectedNames = goldStandard.expectedActivityNames || [];
  const { precision, recall, relevantReturned, matchDetails } = calculatePrecisionRecall(
    activities,
    expectedNames
  );

  return {
    queryId: goldStandard.id,
    query: goldStandard.query,
    latency,
    precision,
    recall,
    relevantReturned,
    totalReturned: activities.length,
    totalRelevant: expectedNames.length,
    filterAccuracy,
    matchDetails
  };
}

// Test consistency by running the same query multiple times
async function evaluateConsistency(
  goldStandard: GoldStandardQuery,
  runs: number = 10
): Promise<ConsistencyResult> {
  const results: string[] = [];

  for (let i = 0; i < runs; i++) {
    const parsedQuery = parseQuery(goldStandard.query);
    const activities = await searchActivities({
      experienceType: parsedQuery.experienceType,
      neededTime: parsedQuery.neededTime,
      difficulty: parsedQuery.difficulty,
      suitableFor: parsedQuery.suitableFor,
      query: goldStandard.query
    });
    
    // Create a signature of the results (sorted activity IDs)
    const signature = activities.map(a => a.id).sort().join(',');
    results.push(signature);
  }

  // Count exact matches
  const uniqueResults = new Set(results);
  const mostCommon = Array.from(uniqueResults).reduce((a, b) => 
    results.filter(r => r === a).length > results.filter(r => r === b).length ? a : b
  );
  const exactMatches = results.filter(r => r === mostCommon).length;
  const consistencyScore = exactMatches / runs;

  return {
    queryId: goldStandard.id,
    query: goldStandard.query,
    runs,
    exactMatches,
    consistencyScore,
    variations: Array.from(uniqueResults)
  };
}

// Run full evaluation
export async function runFullEvaluation(): Promise<EvaluationReport> {
  console.log('🔍 Starting SwissQuest Metrics Evaluation...\n');
  console.log(`📊 Evaluating ${goldStandardDataset.length} queries from gold standard dataset\n`);

  // Run metrics evaluation for all queries
  const metricsResults: MetricsResult[] = [];
  for (const goldStandard of goldStandardDataset) {
    console.log(`⏳ Evaluating: "${goldStandard.query}"`);
    const result = await evaluateQuery(goldStandard);
    metricsResults.push(result);
    console.log(`✅ Completed in ${result.latency.toFixed(2)}ms`);
  }

  console.log('\n🔄 Running consistency tests (10 runs per query)...\n');

  // Run consistency tests
  const consistencyResults: ConsistencyResult[] = [];
  for (const goldStandard of goldStandardDataset) {
    console.log(`⏳ Testing consistency: "${goldStandard.query}"`);
    const result = await evaluateConsistency(goldStandard);
    consistencyResults.push(result);
    console.log(`✅ Consistency: ${(result.consistencyScore * 100).toFixed(1)}%`);
  }

  // Calculate averages
  const avgLatency = metricsResults.reduce((sum, r) => sum + r.latency, 0) / metricsResults.length;
  const avgPrecision = metricsResults.reduce((sum, r) => sum + r.precision, 0) / metricsResults.length;
  const avgRecall = metricsResults.reduce((sum, r) => sum + r.recall, 0) / metricsResults.length;
  const avgFilterAccuracy = metricsResults.reduce((sum, r) => sum + r.filterAccuracy, 0) / metricsResults.length;
  const avgConsistency = consistencyResults.reduce((sum, r) => sum + r.consistencyScore, 0) / consistencyResults.length;

  const report: EvaluationReport = {
    timestamp: new Date().toISOString(),
    metricsResults,
    consistencyResults,
    averages: {
      avgLatency,
      avgPrecision,
      avgRecall,
      avgFilterAccuracy,
      avgConsistency
    }
  };

  // Log detailed report to console
  console.log('\n' + '='.repeat(80));
  console.log('📈 EVALUATION REPORT');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${report.timestamp}\n`);

  console.log('📊 METRICS RESULTS:');
  console.log('-'.repeat(80));
  metricsResults.forEach(result => {
    console.log(`\nQuery [${result.queryId}]: "${result.query}"`);
    console.log(`  ⏱️  Latency: ${result.latency.toFixed(2)}ms`);
    console.log(`  🎯 Precision: ${(result.precision * 100).toFixed(1)}% (${result.relevantReturned}/${result.totalReturned} relevant)`);
    console.log(`  📍 Recall: ${(result.recall * 100).toFixed(1)}% (${result.relevantReturned}/${result.totalRelevant} found)`);
    console.log(`  🔍 Filter Accuracy: ${(result.filterAccuracy * 100).toFixed(1)}%`);
  });

  console.log('\n' + '-'.repeat(80));
  console.log('🔄 CONSISTENCY RESULTS:');
  console.log('-'.repeat(80));
  consistencyResults.forEach(result => {
    console.log(`\nQuery [${result.queryId}]: "${result.query}"`);
    console.log(`  🔁 Runs: ${result.runs}`);
    console.log(`  ✅ Exact Matches: ${result.exactMatches}/${result.runs}`);
    console.log(`  📊 Consistency Score: ${(result.consistencyScore * 100).toFixed(1)}%`);
    console.log(`  🔀 Unique Variations: ${result.variations.length}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('📈 AVERAGE METRICS:');
  console.log('='.repeat(80));
  console.log(`  ⏱️  Avg Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`  🎯 Avg Precision: ${(avgPrecision * 100).toFixed(1)}%`);
  console.log(`  📍 Avg Recall: ${(avgRecall * 100).toFixed(1)}%`);
  console.log(`  🔍 Avg Filter Accuracy: ${(avgFilterAccuracy * 100).toFixed(1)}%`);
  console.log(`  🔄 Avg Consistency: ${(avgConsistency * 100).toFixed(1)}%`);
  console.log('='.repeat(80) + '\n');

  return report;
}
