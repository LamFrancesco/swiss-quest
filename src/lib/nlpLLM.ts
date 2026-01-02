import { supabase } from "@/integrations/supabase/client";
import { ParsedQuery, ConfidenceScores } from "./nlp";

// Rate limiting: delay between requests to avoid 429 errors
const RATE_LIMIT_DELAY_MS = 1500; // 1.5 seconds between requests
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 2000; // Base backoff time

let lastRequestTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    const waitTime = RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

async function invokeWithRetry(query: string, retryCount = 0): Promise<any> {
  await waitForRateLimit();
  
  const { data, error } = await supabase.functions.invoke('parse-query-llm', {
    body: { query }
  });

  if (error) {
    // Check if it's a rate limit error (429)
    const isRateLimited = error.message?.includes('429') || 
                          error.message?.includes('rate limit') ||
                          error.message?.includes('Rate limit');
    
    if (isRateLimited && retryCount < MAX_RETRIES) {
      const backoffTime = RETRY_BACKOFF_MS * Math.pow(2, retryCount);
      console.warn(`[nlpLLM] Rate limited, retrying in ${backoffTime}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return invokeWithRetry(query, retryCount + 1);
    }
    
    console.error('[nlpLLM] Error calling LLM parser:', error);
    throw new Error(`LLM parsing failed: ${error.message}`);
  }

  return data;
}

export async function parseQueryWithLLM(query: string): Promise<ParsedQuery> {
  const data = await invokeWithRetry(query);

  const confidence: ConfidenceScores | undefined = data.confidence ? {
    experienceType: data.confidence.experienceType,
    neededTime: data.confidence.neededTime,
    difficulty: data.confidence.difficulty,
    suitableFor: data.confidence.suitableFor,
  } : undefined;

  return {
    experienceType: data.experienceType,
    neededTime: data.neededTime,
    difficulty: data.difficulty,
    suitableFor: data.suitableFor,
    keywords: data.keywords || query.split(' ').filter(word => word.length > 3),
    confidence,
    avgConfidence: data.avgConfidence,
  };
}
