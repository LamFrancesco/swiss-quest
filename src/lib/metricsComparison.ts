import { parseQuery, ParsedQuery } from './nlp';
import { parseQueryWithLLM } from './nlpLLM';
import { searchActivities, Activity } from './api';
import { goldStandardDataset, GoldStandardQuery } from '../data/goldStandardDataset';
import { calculateNameBasedPrecisionRecall } from './textMatching';

export type ModelType = 'fuzzy' | 'llm';

export interface ModelMetricsResult {
  queryId: string;
  query: string;
  model: ModelType;
  latency: number;
  precision: number;
  recall: number;
  relevantReturned: number;
  totalReturned: number;
  totalRelevant: number;
  filterAccuracy: number;
  parsedFilters: Partial<ParsedQuery>;
  matchDetails?: Array<{ returned: string; matched?: string; similarity: number }>;
}

export interface ComparisonReport {
  timestamp: string;
  fuzzyResults: ModelMetricsResult[];
  llmResults: ModelMetricsResult[];
  fuzzyAverages: {
    avgLatency: number;
    avgPrecision: number;
    avgRecall: number;
    avgFilterAccuracy: number;
  };
  llmAverages: {
    avgLatency: number;
    avgPrecision: number;
    avgRecall: number;
    avgFilterAccuracy: number;
  };
}

function checkFilterAccuracy(
  actualFilters: Partial<ParsedQuery>,
  expectedFilters: any
): number {
  const filterKeys = ['experienceType', 'neededTime', 'difficulty', 'suitableFor'];
  let matches = 0;
  let total = 0;

  filterKeys.forEach(key => {
    if (expectedFilters[key]) {
      total++;
      if ((actualFilters as any)[key] === expectedFilters[key]) {
        matches++;
      }
    }
  });

  return total > 0 ? matches / total : 1;
}

function calculatePrecisionRecall(
  returnedActivities: Activity[],
  goldStandard: GoldStandardQuery
): { precision: number; recall: number; relevantReturned: number; matchDetails: Array<{ returned: string; matched?: string; similarity: number }> } {
  const returnedTitles = returnedActivities.map(a => a.title);
  const expectedNames = goldStandard.expectedActivityNames;

  // Use name-based matching for real API results
  return calculateNameBasedPrecisionRecall(returnedTitles, expectedNames, 0.5);
}

async function evaluateQueryWithModel(
  goldStandard: GoldStandardQuery,
  model: ModelType
): Promise<ModelMetricsResult> {
  const startTime = performance.now();
  
  let parsedQuery: ParsedQuery;
  
  if (model === 'fuzzy') {
    parsedQuery = parseQuery(goldStandard.query);
  } else {
    parsedQuery = await parseQueryWithLLM(goldStandard.query);
  }
  
  const activities = await searchActivities({
    experienceType: parsedQuery.experienceType,
    neededTime: parsedQuery.neededTime,
    difficulty: parsedQuery.difficulty,
    suitableFor: parsedQuery.suitableFor,
    query: goldStandard.query
  });
  
  const endTime = performance.now();
  const latency = endTime - startTime;

  const filterAccuracy = checkFilterAccuracy(parsedQuery, goldStandard.expectedFilters);
  const { precision, recall, relevantReturned, matchDetails } = calculatePrecisionRecall(
    activities,
    goldStandard
  );

  return {
    queryId: goldStandard.id,
    query: goldStandard.query,
    model,
    latency,
    precision,
    recall,
    relevantReturned,
    totalReturned: activities.length,
    totalRelevant: goldStandard.expectedActivityNames.length,
    filterAccuracy,
    parsedFilters: {
      experienceType: parsedQuery.experienceType,
      neededTime: parsedQuery.neededTime,
      difficulty: parsedQuery.difficulty,
      suitableFor: parsedQuery.suitableFor
    },
    matchDetails
  };
}

function calculateAverages(results: ModelMetricsResult[]) {
  if (results.length === 0) {
    return { avgLatency: 0, avgPrecision: 0, avgRecall: 0, avgFilterAccuracy: 0 };
  }
  
  return {
    avgLatency: results.reduce((sum, r) => sum + r.latency, 0) / results.length,
    avgPrecision: results.reduce((sum, r) => sum + r.precision, 0) / results.length,
    avgRecall: results.reduce((sum, r) => sum + r.recall, 0) / results.length,
    avgFilterAccuracy: results.reduce((sum, r) => sum + r.filterAccuracy, 0) / results.length,
  };
}

export async function runModelComparison(): Promise<ComparisonReport> {
  console.log('🔍 Starting Model Comparison Evaluation...\n');
  console.log(`📊 Comparing Fuzzy Logic vs LLM on ${goldStandardDataset.length} queries\n`);

  const fuzzyResults: ModelMetricsResult[] = [];
  const llmResults: ModelMetricsResult[] = [];

  // Evaluate both models on all queries
  for (const goldStandard of goldStandardDataset) {
    console.log(`\n⏳ Query: "${goldStandard.query}"`);
    
    // Fuzzy model
    console.log('  📐 Testing Fuzzy Logic model...');
    const fuzzyResult = await evaluateQueryWithModel(goldStandard, 'fuzzy');
    fuzzyResults.push(fuzzyResult);
    console.log(`     ✅ Latency: ${fuzzyResult.latency.toFixed(0)}ms, P: ${(fuzzyResult.precision * 100).toFixed(0)}%, R: ${(fuzzyResult.recall * 100).toFixed(0)}%`);
    
    // LLM model
    console.log('  🤖 Testing LLM model...');
    try {
      const llmResult = await evaluateQueryWithModel(goldStandard, 'llm');
      llmResults.push(llmResult);
      console.log(`     ✅ Latency: ${llmResult.latency.toFixed(0)}ms, P: ${(llmResult.precision * 100).toFixed(0)}%, R: ${(llmResult.recall * 100).toFixed(0)}%`);
    } catch (error) {
      console.error(`     ❌ LLM evaluation failed:`, error);
      // Add a failed result
      llmResults.push({
        queryId: goldStandard.id,
        query: goldStandard.query,
        model: 'llm',
        latency: 0,
        precision: 0,
        recall: 0,
        relevantReturned: 0,
        totalReturned: 0,
        totalRelevant: goldStandard.expectedActivityIds.length,
        filterAccuracy: 0,
        parsedFilters: {}
      });
    }
  }

  const fuzzyAverages = calculateAverages(fuzzyResults);
  const llmAverages = calculateAverages(llmResults);

  const report: ComparisonReport = {
    timestamp: new Date().toISOString(),
    fuzzyResults,
    llmResults,
    fuzzyAverages,
    llmAverages
  };

  // Log comparison summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 MODEL COMPARISON REPORT');
  console.log('='.repeat(80));
  
  console.log('\n📐 FUZZY LOGIC MODEL:');
  console.log(`  ⏱️  Avg Latency: ${fuzzyAverages.avgLatency.toFixed(2)}ms`);
  console.log(`  🎯 Avg Precision: ${(fuzzyAverages.avgPrecision * 100).toFixed(1)}%`);
  console.log(`  📍 Avg Recall: ${(fuzzyAverages.avgRecall * 100).toFixed(1)}%`);
  console.log(`  🔍 Avg Filter Accuracy: ${(fuzzyAverages.avgFilterAccuracy * 100).toFixed(1)}%`);
  
  console.log('\n🤖 LLM MODEL (Gemini 2.5 Flash):');
  console.log(`  ⏱️  Avg Latency: ${llmAverages.avgLatency.toFixed(2)}ms`);
  console.log(`  🎯 Avg Precision: ${(llmAverages.avgPrecision * 100).toFixed(1)}%`);
  console.log(`  📍 Avg Recall: ${(llmAverages.avgRecall * 100).toFixed(1)}%`);
  console.log(`  🔍 Avg Filter Accuracy: ${(llmAverages.avgFilterAccuracy * 100).toFixed(1)}%`);
  
  console.log('\n📊 COMPARISON:');
  const precisionDiff = llmAverages.avgPrecision - fuzzyAverages.avgPrecision;
  const recallDiff = llmAverages.avgRecall - fuzzyAverages.avgRecall;
  const latencyDiff = llmAverages.avgLatency - fuzzyAverages.avgLatency;
  
  console.log(`  Precision: LLM is ${precisionDiff > 0 ? '+' : ''}${(precisionDiff * 100).toFixed(1)}% vs Fuzzy`);
  console.log(`  Recall: LLM is ${recallDiff > 0 ? '+' : ''}${(recallDiff * 100).toFixed(1)}% vs Fuzzy`);
  console.log(`  Latency: LLM is ${latencyDiff > 0 ? '+' : ''}${latencyDiff.toFixed(0)}ms vs Fuzzy`);
  
  console.log('='.repeat(80) + '\n');

  return report;
}
