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
  // Run queries sequentially to avoid rate limits
  let successfulLlmCount = 0;
  let failedLlmCount = 0;
  
  for (const goldStandard of goldStandardDataset) {
    // Skip queries with no expected results (edge cases)
    if (goldStandard.expectedActivityNames.length === 0) {
      console.log(`\n⏭️ Skipping edge case query: "${goldStandard.query}"`);
      continue;
    }
    
    console.log(`\n⏳ Query: "${goldStandard.query}"`);
    
    // Fuzzy model
    console.log('  📐 Testing Fuzzy Logic model...');
    try {
      const fuzzyResult = await evaluateQueryWithModel(goldStandard, 'fuzzy');
      fuzzyResults.push(fuzzyResult);
      const summary = fuzzyResult.truthValueSummary;
      console.log(`     ✅ Latency: ${fuzzyResult.latency.toFixed(0)}ms`);
      console.log(`     📊 P: ${fuzzyResult.precision.toFixed(3)}, R: ${fuzzyResult.recall.toFixed(3)}, F1: ${fuzzyResult.f1Score.toFixed(3)}`);
      if (summary) {
        console.log(`     📝 TVLS: "${summary.quantifier.replace(/_/g, ' ')}" (T=${summary.truthValue.toFixed(2)}, support=${summary.support.toFixed(2)})`);
      }
    } catch (error) {
      console.error(`     ❌ Fuzzy evaluation failed:`, error);
    }
    
    // LLM model - add delay to prevent rate limiting
    console.log('  🤖 Testing LLM model...');
    try {
      // Add 2 second delay between LLM calls to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const llmResult = await evaluateQueryWithModel(goldStandard, 'llm');
      llmResults.push(llmResult);
      successfulLlmCount++;
      const summary = llmResult.truthValueSummary;
      console.log(`     ✅ Latency: ${llmResult.latency.toFixed(0)}ms`);
      console.log(`     📊 P: ${llmResult.precision.toFixed(3)}, R: ${llmResult.recall.toFixed(3)}, F1: ${llmResult.f1Score.toFixed(3)}`);
      if (summary) {
        console.log(`     📝 TVLS: "${summary.quantifier.replace(/_/g, ' ')}" (T=${summary.truthValue.toFixed(2)}, support=${summary.support.toFixed(2)})`);
      }
    } catch (error) {
      failedLlmCount++;
      console.error(`     ❌ LLM evaluation failed:`, error);
      // Don't add failed results - they skew the averages
    }
  }
  
  console.log(`\n📈 LLM Summary: ${successfulLlmCount} successful, ${failedLlmCount} failed`);

  const fuzzyAverages = calculateAverages(fuzzyResults);
  const llmAverages = calculateAverages(llmResults);

  const report: ComparisonReport = {
    timestamp: new Date().toISOString(),
    fuzzyResults,
    llmResults,
    fuzzyAverages,
    llmAverages
  };

  // Calculate AGGREGATE TVLS across all queries (not just the last one)
  // The proper approach: aggregate all precision values and generate a summary for the overall performance
  const aggregateFuzzyPrecision = fuzzyAverages.avgPrecision;
  const aggregateLlmPrecision = llmAverages.avgPrecision;
  
  // Import getBestQuantifier for aggregate summary
  const { getBestQuantifier } = await import('./fuzzy/linguisticQuantifiers');
  
  // Generate aggregate TVLS for fuzzy model
  const fuzzyQuantifierResult = getBestQuantifier(aggregateFuzzyPrecision);
  const aggregateFuzzyTVLS: LinguisticSummary = {
    quantifier: fuzzyQuantifierResult.name,
    subject: 'results across all queries',
    summarizer: 'relevant',
    truthValue: fuzzyQuantifierResult.membership,
    support: aggregateFuzzyPrecision,
    fullStatement: `${fuzzyQuantifierResult.name.replace(/_/g, ' ')} of the results are relevant (avg precision: ${(aggregateFuzzyPrecision * 100).toFixed(1)}%)`
  };
  
  // Generate aggregate TVLS for LLM model  
  const llmQuantifierResult = getBestQuantifier(aggregateLlmPrecision);
  const aggregateLlmTVLS: LinguisticSummary = {
    quantifier: llmQuantifierResult.name,
    subject: 'results across all queries',
    summarizer: 'relevant',
    truthValue: llmQuantifierResult.membership,
    support: aggregateLlmPrecision,
    fullStatement: `${llmQuantifierResult.name.replace(/_/g, ' ')} of the results are relevant (avg precision: ${(aggregateLlmPrecision * 100).toFixed(1)}%)`
  };
  
  // Calculate aggregate quality metrics
  const allFuzzyMemberships = fuzzyResults.flatMap(r => r.matchDetails?.map(d => d.relevanceMembership) || []);
  const allLlmMemberships = llmResults.flatMap(r => r.matchDetails?.map(d => d.relevanceMembership) || []);
  
  const aggregateFuzzyQuality = calculateSummaryQuality(fuzzyQuantifierResult.membership, allFuzzyMemberships, 1);
  const aggregateLlmQuality = calculateSummaryQuality(llmQuantifierResult.membership, allLlmMemberships, 1);

  // Log comparison summary with AGGREGATE TVLS
  console.log('\n📈 MODEL COMPARISON REPORT (TVLS METRICS)');
  console.log('='.repeat(80));
  
  console.log('\n📐 FUZZY LOGIC NLP MODEL:');
  console.log(`  ⏱️  Avg Latency: ${fuzzyAverages.avgLatency.toFixed(2)}ms`);
  console.log(`  🎯 Fuzzy Precision: ${fuzzyAverages.avgPrecision.toFixed(3)}`);
  console.log(`  📍 Fuzzy Recall: ${fuzzyAverages.avgRecall.toFixed(3)}`);
  console.log(`  📊 Fuzzy F1: ${fuzzyAverages.avgF1Score.toFixed(3)}`);
  console.log(`  🔍 Filter Accuracy: ${fuzzyAverages.avgFilterAccuracy.toFixed(3)}`);
  
  console.log('\n  📝 AGGREGATE LINGUISTIC SUMMARY (TVLS):');
  console.log(`     "${aggregateFuzzyTVLS.fullStatement}"`);
  console.log(`     Quantifier: "${aggregateFuzzyTVLS.quantifier.replace(/_/g, ' ')}" → μ(${aggregateFuzzyPrecision.toFixed(3)}) = ${aggregateFuzzyTVLS.truthValue.toFixed(3)}`);
  console.log(`     Support (avg precision): ${aggregateFuzzyTVLS.support.toFixed(3)}`);
  
  console.log('\n  📊 AGGREGATE QUALITY METRICS:');
  console.log(`     Imprecision (T2): ${aggregateFuzzyQuality.degreeOfImprecision.toFixed(3)}`);
  console.log(`     Covering (T3): ${aggregateFuzzyQuality.degreeOfCovering.toFixed(3)}`);
  console.log(`     Appropriateness (T4): ${aggregateFuzzyQuality.degreeOfAppropriateness.toFixed(3)}`);
  console.log(`     Length Quality (T5): ${aggregateFuzzyQuality.lengthQuality.toFixed(3)}`);
  console.log(`     Overall Quality: ${aggregateFuzzyQuality.overallQuality.toFixed(3)}`);
  
  console.log('\n🤖 LLM MODEL (Gemini 2.5 Flash):');
  console.log(`  ⏱️  Avg Latency: ${llmAverages.avgLatency.toFixed(2)}ms`);
  console.log(`  🎯 Fuzzy Precision: ${llmAverages.avgPrecision.toFixed(3)}`);
  console.log(`  📍 Fuzzy Recall: ${llmAverages.avgRecall.toFixed(3)}`);
  console.log(`  📊 Fuzzy F1: ${llmAverages.avgF1Score.toFixed(3)}`);
  console.log(`  🔍 Filter Accuracy: ${llmAverages.avgFilterAccuracy.toFixed(3)}`);
  
  console.log('\n  📝 AGGREGATE LINGUISTIC SUMMARY (TVLS):');
  console.log(`     "${aggregateLlmTVLS.fullStatement}"`);
  console.log(`     Quantifier: "${aggregateLlmTVLS.quantifier.replace(/_/g, ' ')}" → μ(${aggregateLlmPrecision.toFixed(3)}) = ${aggregateLlmTVLS.truthValue.toFixed(3)}`);
  console.log(`     Support (avg precision): ${aggregateLlmTVLS.support.toFixed(3)}`);
  
  console.log('\n  📊 AGGREGATE QUALITY METRICS:');
  console.log(`     Imprecision (T2): ${aggregateLlmQuality.degreeOfImprecision.toFixed(3)}`);
  console.log(`     Covering (T3): ${aggregateLlmQuality.degreeOfCovering.toFixed(3)}`);
  console.log(`     Appropriateness (T4): ${aggregateLlmQuality.degreeOfAppropriateness.toFixed(3)}`);
  console.log(`     Length Quality (T5): ${aggregateLlmQuality.lengthQuality.toFixed(3)}`);
  console.log(`     Overall Quality: ${aggregateLlmQuality.overallQuality.toFixed(3)}`);
  
  // Add explanation of the Truth Value
  console.log('\n  ℹ️  TVLS INTERPRETATION:');
  console.log(`     Truth Value = μ_quantifier(proportion)`);
  console.log(`     E.g., for precision ${(aggregateFuzzyPrecision * 100).toFixed(1)}%, best quantifier "${aggregateFuzzyTVLS.quantifier.replace(/_/g, ' ')}" has μ=${aggregateFuzzyTVLS.truthValue.toFixed(3)}`);
  console.log(`     Higher truth value means the quantifier accurately describes the data.`);
  
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

  // Add TVLS data to the report for UI consumption (using aggregate TVLS)
  (report as any).fuzzyTVLS = aggregateFuzzyTVLS;
  (report as any).llmTVLS = aggregateLlmTVLS;

  return report;
}
