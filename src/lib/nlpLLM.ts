import { supabase } from "@/integrations/supabase/client";
import { ParsedQuery } from "./nlp";

export async function parseQueryWithLLM(query: string): Promise<ParsedQuery> {
  const { data, error } = await supabase.functions.invoke('parse-query-llm', {
    body: { query }
  });

  if (error) {
    console.error('[nlpLLM] Error calling LLM parser:', error);
    throw new Error(`LLM parsing failed: ${error.message}`);
  }

  return {
    experienceType: data.experienceType,
    neededTime: data.neededTime,
    difficulty: data.difficulty,
    suitableFor: data.suitableFor,
    keywords: data.keywords || query.split(' ').filter(word => word.length > 3)
  };
}
