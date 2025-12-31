import { parseQuery, ParsedQuery } from './nlp';
import { parseQueryWithLLM } from './nlpLLM';
import { searchActivities, Activity } from './api';
import { goldStandardDataset, GoldStandardQuery } from '../data/goldStandardDataset';
import { calculateFuzzyPrecisionRecall } from './textMatching';

export type ModelType = 'fuzzy' | 'llm';

export interface ModelMetricsResult {
  queryId: string;
  query: string;
  model: ModelType;
  latency: number;
  precision: number;
  recall: number;
  f1Score: number;
  totalReturned: number;
  totalRelevant: number;
  filterAccuracy: number;
  parsedFilters: Partial<ParsedQuery>;
  matchDetails?: Array<{ returned: string; bestMatch?: string; similarity: number }>;
}

export interface ComparisonReport {
  timestamp: string;
  fuzzyResults: ModelMetricsResult[];
  llmResults: ModelMetricsResult[];
  fuzzyAverages: {
    avgLatency: number;
    avgPrecision: number;
    avgRecall: number;
    avgF1Score: number;
    avgFilterAccuracy: number;
  };
  llmAverages: {
    avgLatency: number;
    avgPrecision: number;
    avgRecall: number;
    avgF1Score: number;
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

// Use fuzzy precision/recall based on activity name matching
function calculateFuzzyMetrics(
  returnedActivities: Activity[],
  expectedNames: string[]
): { precision: number; recall: number; f1Score: number; matchDetails: Array<{ returned: string; bestMatch?: string; similarity: number }> } {
  const returnedTitles = returnedActivities.map(a => a.title);
  return calculateFuzzyPrecisionRecall(returnedTitles, expectedNames);
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
  
  // Use fuzzy metrics based on expected activity names
  const expectedNames = goldStandard.expectedActivityNames || [];
  const { precision, recall, f1Score, matchDetails } = calculateFuzzyMetrics(
    activities,
    expectedNames
  );

  return {
    queryId: goldStandard.id,
    query: goldStandard.query,
    model,
    latency,
    precision,
    recall,
    f1Score,
    totalReturned: activities.length,
    totalRelevant: expectedNames.length,
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
    return { avgLatency: 0, avgPrecision: 0, avgRecall: 0, avgF1Score: 0, avgFilterAccuracy: 0 };
  }
  
  return {
    avgLatency: results.reduce((sum, r) => sum + r.latency, 0) / results.length,
    avgPrecision: results.reduce((sum, r) => sum + r.precision, 0) / results.length,
    avgRecall: results.reduce((sum, r) => sum + r.recall, 0) / results.length,
    avgF1Score: results.reduce((sum, r) => sum + r.f1Score, 0) / results.length,
    avgFilterAccuracy: results.reduce((sum, r) => sum + r.filterAccuracy, 0) / results.length,
  };
}

export async function runModelComparison(): Promise<ComparisonReport> {
  console.log('🔍 Starting Model Comparison Evaluation (FUZZY LOGIC METRICS)...\n');
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
    console.log(`     ✅ Latency: ${fuzzyResult.latency.toFixed(0)}ms, P: ${(fuzzyResult.precision * 100).toFixed(1)}%, R: ${(fuzzyResult.recall * 100).toFixed(1)}%, F1: ${(fuzzyResult.f1Score * 100).toFixed(1)}%`);
    
    // LLM model
    console.log('  🤖 Testing LLM model...');
    try {
      const llmResult = await evaluateQueryWithModel(goldStandard, 'llm');
      llmResults.push(llmResult);
      console.log(`     ✅ Latency: ${llmResult.latency.toFixed(0)}ms, P: ${(llmResult.precision * 100).toFixed(1)}%, R: ${(llmResult.recall * 100).toFixed(1)}%, F1: ${(llmResult.f1Score * 100).toFixed(1)}%`);
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
        f1Score: 0,
        totalReturned: 0,
        totalRelevant: goldStandard.expectedActivityNames.length,
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
  console.log('\n📈 MODEL COMPARISON REPORT (FUZZY LOGIC METRICS)');
  console.log('='.repeat(80));
  
  console.log('\n📐 FUZZY LOGIC NLP MODEL:');
  console.log(`  ⏱️  Avg Latency: ${fuzzyAverages.avgLatency.toFixed(2)}ms`);
  console.log(`  🎯 Avg Fuzzy Precision: ${(fuzzyAverages.avgPrecision * 100).toFixed(1)}%`);
  console.log(`  📍 Avg Fuzzy Recall: ${(fuzzyAverages.avgRecall * 100).toFixed(1)}%`);
  console.log(`  📊 Avg F1 Score: ${(fuzzyAverages.avgF1Score * 100).toFixed(1)}%`);
  console.log(`  🔍 Avg Filter Accuracy: ${(fuzzyAverages.avgFilterAccuracy * 100).toFixed(1)}%`);
  
  console.log('\n🤖 LLM MODEL (Gemini 2.5 Flash):');
  console.log(`  ⏱️  Avg Latency: ${llmAverages.avgLatency.toFixed(2)}ms`);
  console.log(`  🎯 Avg Fuzzy Precision: ${(llmAverages.avgPrecision * 100).toFixed(1)}%`);
  console.log(`  📍 Avg Fuzzy Recall: ${(llmAverages.avgRecall * 100).toFixed(1)}%`);
  console.log(`  📊 Avg F1 Score: ${(llmAverages.avgF1Score * 100).toFixed(1)}%`);
  console.log(`  🔍 Avg Filter Accuracy: ${(llmAverages.avgFilterAccuracy * 100).toFixed(1)}%`);
  
  console.log('\n📊 COMPARISON:');
  const precisionDiff = llmAverages.avgPrecision - fuzzyAverages.avgPrecision;
  const recallDiff = llmAverages.avgRecall - fuzzyAverages.avgRecall;
  const f1Diff = llmAverages.avgF1Score - fuzzyAverages.avgF1Score;
  const latencyDiff = llmAverages.avgLatency - fuzzyAverages.avgLatency;
  
  console.log(`  Precision: LLM is ${precisionDiff > 0 ? '+' : ''}${(precisionDiff * 100).toFixed(1)}% vs Fuzzy`);
  console.log(`  Recall: LLM is ${recallDiff > 0 ? '+' : ''}${(recallDiff * 100).toFixed(1)}% vs Fuzzy`);
  console.log(`  F1 Score: LLM is ${f1Diff > 0 ? '+' : ''}${(f1Diff * 100).toFixed(1)}% vs Fuzzy`);
  console.log(`  Latency: LLM is ${latencyDiff > 0 ? '+' : ''}${latencyDiff.toFixed(0)}ms vs Fuzzy`);
  
  console.log('='.repeat(80) + '\n');

  return report;
}
