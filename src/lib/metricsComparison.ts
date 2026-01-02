import { parseQuery, ParsedQuery } from './nlp';
import { parseQueryWithLLM } from './nlpLLM';
import { searchActivities, Activity } from './api';
import { goldStandardDataset, GoldStandardQuery } from '../data/goldStandardDataset';
import { calculateFuzzyMetrics, FuzzyMetricsResult } from './fuzzy/fuzzyMetrics';
import { calculateSummaryQuality, SummaryQuality, LinguisticSummary } from './fuzzy/tvls';

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
  matchDetails?: Array<{ returned: string; bestMatch?: string; similarity: number; relevanceMembership: number }>;
  // TVLS additions
  truthValueSummary?: LinguisticSummary;
  summaryQuality?: SummaryQuality;
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

// Use formal fuzzy metrics with TVLS from fuzzy logic framework
function computeFuzzyMetricsWithTVLS(
  returnedActivities: Activity[],
  expectedNames: string[]
): FuzzyMetricsResult {
  const returnedTitles = returnedActivities.map(a => a.title);
  return calculateFuzzyMetrics(returnedTitles, expectedNames);
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
  
  // Use formal fuzzy metrics with TVLS
  const expectedNames = goldStandard.expectedActivityNames || [];
  const fuzzyResult = computeFuzzyMetricsWithTVLS(activities, expectedNames);
  
  // Calculate summary quality metrics
  const relevanceMemberships = fuzzyResult.matchDetails.map(d => d.relevanceMembership);
  const summaryQuality = calculateSummaryQuality(
    fuzzyResult.truthValueSummary.truthValue,
    relevanceMemberships,
    1
  );

  return {
    queryId: goldStandard.id,
    query: goldStandard.query,
    model,
    latency,
    precision: fuzzyResult.fuzzyPrecision,
    recall: fuzzyResult.fuzzyRecall,
    f1Score: fuzzyResult.fuzzyF1,
    totalReturned: activities.length,
    totalRelevant: expectedNames.length,
    filterAccuracy,
    parsedFilters: {
      experienceType: parsedQuery.experienceType,
      neededTime: parsedQuery.neededTime,
      difficulty: parsedQuery.difficulty,
      suitableFor: parsedQuery.suitableFor
    },
    matchDetails: fuzzyResult.matchDetails,
    truthValueSummary: fuzzyResult.truthValueSummary,
    summaryQuality,
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

  // Get TVLS summaries from last results
  const lastFuzzyTVLS = fuzzyResults[fuzzyResults.length - 1]?.truthValueSummary;
  const lastLlmTVLS = llmResults[llmResults.length - 1]?.truthValueSummary;
  const lastFuzzyQuality = fuzzyResults[fuzzyResults.length - 1]?.summaryQuality;
  const lastLlmQuality = llmResults[llmResults.length - 1]?.summaryQuality;

  // Log comparison summary with TVLS
  console.log('\n📈 MODEL COMPARISON REPORT (TVLS METRICS)');
  console.log('='.repeat(80));
  
  console.log('\n📐 FUZZY LOGIC NLP MODEL:');
  console.log(`  ⏱️  Avg Latency: ${fuzzyAverages.avgLatency.toFixed(2)}ms`);
  console.log(`  🎯 Fuzzy Precision: ${fuzzyAverages.avgPrecision.toFixed(3)}`);
  console.log(`  📍 Fuzzy Recall: ${fuzzyAverages.avgRecall.toFixed(3)}`);
  console.log(`  📊 Fuzzy F1: ${fuzzyAverages.avgF1Score.toFixed(3)}`);
  console.log(`  🔍 Filter Accuracy: ${fuzzyAverages.avgFilterAccuracy.toFixed(3)}`);
  
  if (lastFuzzyTVLS) {
    console.log('\n  📝 LINGUISTIC SUMMARY (TVLS):');
    console.log(`     "${lastFuzzyTVLS.fullStatement}"`);
    console.log(`     Truth Value: ${lastFuzzyTVLS.truthValue.toFixed(3)}`);
    console.log(`     Support: ${lastFuzzyTVLS.support.toFixed(3)}`);
  }
  
  if (lastFuzzyQuality) {
    console.log('\n  📊 SUMMARY QUALITY METRICS:');
    console.log(`     Imprecision (T2): ${lastFuzzyQuality.degreeOfImprecision.toFixed(3)}`);
    console.log(`     Covering (T3): ${lastFuzzyQuality.degreeOfCovering.toFixed(3)}`);
    console.log(`     Appropriateness (T4): ${lastFuzzyQuality.degreeOfAppropriateness.toFixed(3)}`);
    console.log(`     Length Quality (T5): ${lastFuzzyQuality.lengthQuality.toFixed(3)}`);
    console.log(`     Overall Quality: ${lastFuzzyQuality.overallQuality.toFixed(3)}`);
  }
  
  console.log('\n🤖 LLM MODEL (Gemini 2.5 Flash):');
  console.log(`  ⏱️  Avg Latency: ${llmAverages.avgLatency.toFixed(2)}ms`);
  console.log(`  🎯 Fuzzy Precision: ${llmAverages.avgPrecision.toFixed(3)}`);
  console.log(`  📍 Fuzzy Recall: ${llmAverages.avgRecall.toFixed(3)}`);
  console.log(`  📊 Fuzzy F1: ${llmAverages.avgF1Score.toFixed(3)}`);
  console.log(`  🔍 Filter Accuracy: ${llmAverages.avgFilterAccuracy.toFixed(3)}`);
  
  if (lastLlmTVLS) {
    console.log('\n  📝 LINGUISTIC SUMMARY (TVLS):');
    console.log(`     "${lastLlmTVLS.fullStatement}"`);
    console.log(`     Truth Value: ${lastLlmTVLS.truthValue.toFixed(3)}`);
    console.log(`     Support: ${lastLlmTVLS.support.toFixed(3)}`);
  }
  
  if (lastLlmQuality) {
    console.log('\n  📊 SUMMARY QUALITY METRICS:');
    console.log(`     Imprecision (T2): ${lastLlmQuality.degreeOfImprecision.toFixed(3)}`);
    console.log(`     Covering (T3): ${lastLlmQuality.degreeOfCovering.toFixed(3)}`);
    console.log(`     Appropriateness (T4): ${lastLlmQuality.degreeOfAppropriateness.toFixed(3)}`);
    console.log(`     Length Quality (T5): ${lastLlmQuality.lengthQuality.toFixed(3)}`);
    console.log(`     Overall Quality: ${lastLlmQuality.overallQuality.toFixed(3)}`);
  }
  
  console.log('\n📊 COMPARISON:');
  const precisionDiff = llmAverages.avgPrecision - fuzzyAverages.avgPrecision;
  const recallDiff = llmAverages.avgRecall - fuzzyAverages.avgRecall;
  const f1Diff = llmAverages.avgF1Score - fuzzyAverages.avgF1Score;
  const latencyDiff = llmAverages.avgLatency - fuzzyAverages.avgLatency;
  
  console.log(`  Precision: LLM is ${precisionDiff > 0 ? '+' : ''}${precisionDiff.toFixed(3)} vs Fuzzy`);
  console.log(`  Recall: LLM is ${recallDiff > 0 ? '+' : ''}${recallDiff.toFixed(3)} vs Fuzzy`);
  console.log(`  F1 Score: LLM is ${f1Diff > 0 ? '+' : ''}${f1Diff.toFixed(3)} vs Fuzzy`);
  console.log(`  Latency: LLM is ${latencyDiff > 0 ? '+' : ''}${latencyDiff.toFixed(0)}ms vs Fuzzy`);
  
  console.log('='.repeat(80) + '\n');

  // Add TVLS data to the report for UI consumption
  (report as any).fuzzyTVLS = lastFuzzyTVLS;
  (report as any).llmTVLS = lastLlmTVLS;

  return report;
}
