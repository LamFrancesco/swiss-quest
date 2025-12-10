import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a Swiss tourism query parser. Extract structured filters from natural language queries about Swiss activities and destinations.

You MUST respond with ONLY a valid JSON object with these optional fields:
- experienceType: one of "cultural", "outdoor", "gastronomy", "shopping", "wellness" (or null if not applicable)
  - Map "history", "museum", "art" to "cultural"
  - Map "hike", "walk", "mountain", "nature" to "outdoor"
  - Map "food", "restaurant", "dinner", "eat" to "gastronomy"
- neededTime: one of "lessthan1hour", "between1_2hours", "between2_4hours", "between4_8hours", "morethan1day" (or null if not applicable)
  - Map "quick", "short" to "lessthan1hour"
  - Map "half day", "few hours" to "between2_4hours"
  - Map "all day", "full day" to "between4_8hours"
  - Map "multi-day", "weekend" to "morethan1day"
- difficulty: one of "low", "medium", "high" (or null if not applicable)
  - Map "easy", "simple", "relaxing" to "low"
  - Map "moderate" to "medium"
  - Map "hard", "challenging", "difficult" to "high"
- suitableFor: one of "family", "groups", "individual", "seniors", "couples" (or null if not applicable)
  - Map "elderly", "grandparents", "older" to "seniors"
  - Map "kids", "children" to "family"
  - Map "romantic", "date" to "couples"
  - Map "solo", "alone" to "individual"
- confidence: an object with confidence scores (0.0 to 1.0) for each filter you extracted:
  - experienceType: your confidence in the experienceType extraction
  - neededTime: your confidence in the neededTime extraction
  - difficulty: your confidence in the difficulty extraction
  - suitableFor: your confidence in the suitableFor extraction

IMPORTANT: Output ONLY the JSON object, no markdown, no explanation. Include confidence scores for each non-null filter.`;

function getFallbackFilters(query: string): {
  experienceType?: string;
  neededTime?: string;
  difficulty?: string;
  suitableFor?: string;
} {
  const lowerQuery = query.toLowerCase();
  const filters: Record<string, string> = {};

  if (lowerQuery.includes("cultural") || lowerQuery.includes("museum") || lowerQuery.includes("history")) {
    filters.experienceType = "cultural";
  } else if (lowerQuery.includes("outdoor") || lowerQuery.includes("hike") || lowerQuery.includes("walk")) {
    filters.experienceType = "outdoor";
  } else if (lowerQuery.includes("food") || lowerQuery.includes("restaurant") || lowerQuery.includes("dinner")) {
    filters.experienceType = "gastronomy";
  }

  if (lowerQuery.includes("elderly") || lowerQuery.includes("grandparents") || lowerQuery.includes("seniors")) {
    filters.suitableFor = "seniors";
  } else if (lowerQuery.includes("family") || lowerQuery.includes("kids")) {
    filters.suitableFor = "family";
  } else if (lowerQuery.includes("couple") || lowerQuery.includes("romantic")) {
    filters.suitableFor = "couples";
  }

  if (lowerQuery.includes("easy") || lowerQuery.includes("simple") || lowerQuery.includes("relaxing")) {
    filters.difficulty = "low";
  } else if (lowerQuery.includes("hard") || lowerQuery.includes("challenging")) {
    filters.difficulty = "high";
  }

  if (lowerQuery.includes("quick") || lowerQuery.includes("short")) {
    filters.neededTime = "lessthan1hour";
  } else if (lowerQuery.includes("half day")) {
    filters.neededTime = "between2_4hours";
  } else if (lowerQuery.includes("all day") || lowerQuery.includes("full day")) {
    filters.neededTime = "between4_8hours";
  }

  return filters;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[parse-query-llm] Processing query: "${query}"`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Parse this query: "${query}"` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error(`[parse-query-llm] AI gateway error:`, response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log(`[parse-query-llm] Raw LLM response: ${content}`);

    // Parse the JSON response from the LLM
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error(`[parse-query-llm] Failed to parse LLM response as JSON, using fallback`);
      parsed = getFallbackFilters(query);
    }

    // Validate against allowed values
    const validExperienceTypes = ["cultural", "outdoor", "gastronomy", "shopping", "wellness"];
    const validNeededTime = ["lessthan1hour", "between1_2hours", "between2_4hours", "between4_8hours", "morethan1day"];
    const validDifficulty = ["low", "medium", "high"];
    const validSuitableFor = ["family", "groups", "individual", "seniors", "couples"];

    // Build confidence object
    const confidence: Record<string, number> = {};
    const scores: number[] = [];
    
    if (parsed.confidence) {
      if (parsed.experienceType && typeof parsed.confidence.experienceType === 'number') {
        confidence.experienceType = parsed.confidence.experienceType;
        scores.push(parsed.confidence.experienceType);
      }
      if (parsed.neededTime && typeof parsed.confidence.neededTime === 'number') {
        confidence.neededTime = parsed.confidence.neededTime;
        scores.push(parsed.confidence.neededTime);
      }
      if (parsed.difficulty && typeof parsed.confidence.difficulty === 'number') {
        confidence.difficulty = parsed.confidence.difficulty;
        scores.push(parsed.confidence.difficulty);
      }
      if (parsed.suitableFor && typeof parsed.confidence.suitableFor === 'number') {
        confidence.suitableFor = parsed.confidence.suitableFor;
        scores.push(parsed.confidence.suitableFor);
      }
    }
    
    const avgConfidence = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const result = {
      experienceType: validExperienceTypes.includes(parsed.experienceType) ? parsed.experienceType : undefined,
      neededTime: validNeededTime.includes(parsed.neededTime) ? parsed.neededTime : undefined,
      difficulty: validDifficulty.includes(parsed.difficulty) ? parsed.difficulty : undefined,
      suitableFor: validSuitableFor.includes(parsed.suitableFor) ? parsed.suitableFor : undefined,
      keywords: query.split(' ').filter((word: string) => word.length > 3),
      confidence: Object.keys(confidence).length > 0 ? confidence : undefined,
      avgConfidence: avgConfidence > 0 ? avgConfidence : undefined,
    };

    console.log(`[parse-query-llm] Final parsed result:`, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[parse-query-llm] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
