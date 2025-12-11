// Live API Evaluation - Compare model outputs against real MySwitzerland API results
import { parseQuery, parseQueryAsync } from './nlp';
import { parseQueryWithLLM } from './nlpLLM';
import { searchActivities, Activity } from './api';

export interface LiveEvalQuery {
  query: string;
  description: string;
}

export interface LiveEvalResult {
  query: string;
  fuzzy: {
    filters: any;
    resultCount: number;
    latency: number;
    sampleResults: string[];
  };
  llm: {
    filters: any;
    resultCount: number;
    latency: number;
    sampleResults: string[];
  };
  filterMatch: {
    experienceType: boolean;
    neededTime: boolean;
    difficulty: boolean;
    suitableFor: boolean;
    overallMatch: number;
  };
}

export interface LiveEvalReport {
  timestamp: string;
  queries: LiveEvalResult[];
  summary: {
    totalQueries: number;
    avgFuzzyLatency: number;
    avgLLMLatency: number;
    avgFuzzyResults: number;
    avgLLMResults: number;
    filterMatchRate: number;
  };
}

// Test queries for live evaluation
const liveTestQueries: LiveEvalQuery[] = [
  { query: "cultural activities", description: "Simple category query" },
  { query: "easy family-friendly attractions", description: "Multiple filters" },
  { query: "outdoor adventures for couples", description: "Experience + audience" },
  { query: "quick visits under 2 hours", description: "Time constraint" },
  { query: "challenging mountain experiences", description: "Difficulty + category" },
  { query: "relaxing spa and wellness", description: "Wellness category" },
  { query: "educational museums for kids", description: "Education + audience" },
  { query: "romantic activities for couples", description: "Audience focused" },
];

export async function runLiveAPIEvaluation(): Promise<LiveEvalReport> {
  console.log('\n========================================');
  console.log('🌐 LIVE API EVALUATION');
  console.log('Comparing Fuzzy vs LLM against real MySwitzerland API');
  console.log('========================================\n');

  const results: LiveEvalResult[] = [];

  for (const testQuery of liveTestQueries) {
    console.log(`\n📝 Query: "${testQuery.query}"`);
    console.log(`   (${testQuery.description})`);

    // Parse with Fuzzy Logic
    const fuzzyStart = performance.now();
    const fuzzyParsed = parseQuery(testQuery.query);
    const fuzzyLatency = performance.now() - fuzzyStart;

    // Parse with LLM
    const llmStart = performance.now();
    let llmParsed;
    try {
      llmParsed = await parseQueryWithLLM(testQuery.query);
    } catch (error) {
      console.error('   ❌ LLM parsing failed:', error);
      llmParsed = { experienceType: undefined, neededTime: undefined, difficulty: undefined, suitableFor: undefined };
    }
    const llmLatency = performance.now() - llmStart;

    // Search with Fuzzy filters
    const fuzzyResults = await searchActivities({
      experienceType: fuzzyParsed.experienceType,
      neededTime: fuzzyParsed.neededTime,
      difficulty: fuzzyParsed.difficulty,
      suitableFor: fuzzyParsed.suitableFor,
    });

    // Search with LLM filters
    const llmResults = await searchActivities({
      experienceType: llmParsed.experienceType,
      neededTime: llmParsed.neededTime,
      difficulty: llmParsed.difficulty,
      suitableFor: llmParsed.suitableFor,
    });

    // Compare filter outputs
    const filterMatch = {
      experienceType: fuzzyParsed.experienceType === llmParsed.experienceType,
      neededTime: fuzzyParsed.neededTime === llmParsed.neededTime,
      difficulty: fuzzyParsed.difficulty === llmParsed.difficulty,
      suitableFor: fuzzyParsed.suitableFor === llmParsed.suitableFor,
      overallMatch: 0,
    };
    
    const matchCount = [filterMatch.experienceType, filterMatch.neededTime, filterMatch.difficulty, filterMatch.suitableFor]
      .filter(Boolean).length;
    filterMatch.overallMatch = matchCount / 4;

    const result: LiveEvalResult = {
      query: testQuery.query,
      fuzzy: {
        filters: {
          experienceType: fuzzyParsed.experienceType,
          neededTime: fuzzyParsed.neededTime,
          difficulty: fuzzyParsed.difficulty,
          suitableFor: fuzzyParsed.suitableFor,
        },
        resultCount: fuzzyResults.length,
        latency: Math.round(fuzzyLatency),
        sampleResults: fuzzyResults.slice(0, 3).map(a => a.title),
      },
      llm: {
        filters: {
          experienceType: llmParsed.experienceType,
          neededTime: llmParsed.neededTime,
          difficulty: llmParsed.difficulty,
          suitableFor: llmParsed.suitableFor,
        },
        resultCount: llmResults.length,
        latency: Math.round(llmLatency),
        sampleResults: llmResults.slice(0, 3).map(a => a.title),
      },
      filterMatch,
    };

    results.push(result);

    // Log comparison
    console.log('\n   🔧 FUZZY:');
    console.log(`      Filters: exp=${fuzzyParsed.experienceType || '-'}, time=${fuzzyParsed.neededTime || '-'}, diff=${fuzzyParsed.difficulty || '-'}, suit=${fuzzyParsed.suitableFor || '-'}`);
    console.log(`      Results: ${fuzzyResults.length} attractions (${Math.round(fuzzyLatency)}ms)`);
    if (fuzzyResults.length > 0) {
      console.log(`      Sample: ${fuzzyResults.slice(0, 3).map(a => a.title).join(', ')}`);
    }

    console.log('\n   🤖 LLM:');
    console.log(`      Filters: exp=${llmParsed.experienceType || '-'}, time=${llmParsed.neededTime || '-'}, diff=${llmParsed.difficulty || '-'}, suit=${llmParsed.suitableFor || '-'}`);
    console.log(`      Results: ${llmResults.length} attractions (${Math.round(llmLatency)}ms)`);
    if (llmResults.length > 0) {
      console.log(`      Sample: ${llmResults.slice(0, 3).map(a => a.title).join(', ')}`);
    }

    console.log(`\n   📊 Filter Match: ${(filterMatch.overallMatch * 100).toFixed(0)}%`);
    console.log(`      exp: ${filterMatch.experienceType ? '✓' : '✗'}, time: ${filterMatch.neededTime ? '✓' : '✗'}, diff: ${filterMatch.difficulty ? '✓' : '✗'}, suit: ${filterMatch.suitableFor ? '✓' : '✗'}`);
  }

  // Calculate summary
  const summary = {
    totalQueries: results.length,
    avgFuzzyLatency: Math.round(results.reduce((sum, r) => sum + r.fuzzy.latency, 0) / results.length),
    avgLLMLatency: Math.round(results.reduce((sum, r) => sum + r.llm.latency, 0) / results.length),
    avgFuzzyResults: Math.round(results.reduce((sum, r) => sum + r.fuzzy.resultCount, 0) / results.length),
    avgLLMResults: Math.round(results.reduce((sum, r) => sum + r.llm.resultCount, 0) / results.length),
    filterMatchRate: results.reduce((sum, r) => sum + r.filterMatch.overallMatch, 0) / results.length,
  };

  console.log('\n========================================');
  console.log('📈 LIVE API EVALUATION SUMMARY');
  console.log('========================================');
  console.log(`Total Queries: ${summary.totalQueries}`);
  console.log(`\nLatency:`);
  console.log(`  Fuzzy Avg: ${summary.avgFuzzyLatency}ms`);
  console.log(`  LLM Avg: ${summary.avgLLMLatency}ms`);
  console.log(`\nAPI Results (avg attractions returned):`);
  console.log(`  Fuzzy: ${summary.avgFuzzyResults}`);
  console.log(`  LLM: ${summary.avgLLMResults}`);
  console.log(`\nFilter Agreement Rate: ${(summary.filterMatchRate * 100).toFixed(1)}%`);
  console.log('========================================\n');

  return {
    timestamp: new Date().toISOString(),
    queries: results,
    summary,
  };
}
