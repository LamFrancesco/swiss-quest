import { supabase } from "@/integrations/supabase/client";
import { ParsedQuery, ConfidenceScores } from "./nlp";

export async function parseQueryWithLLM(query: string): Promise<ParsedQuery> {
  const { data, error } = await supabase.functions.invoke('parse-query-llm', {
    body: { query }
  });

  if (error) {
    console.error('[nlpLLM] Error calling LLM parser:', error);
    throw new Error(`LLM parsing failed: ${error.message}`);
  }

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
