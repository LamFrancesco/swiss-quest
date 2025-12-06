import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a Swiss tourism query parser. Extract structured filters from natural language queries about Swiss activities and destinations.

You MUST respond with ONLY a valid JSON object with these optional fields:
- experienceType: one of "cultural", "outdoor", "gastronomy", "shopping", "wellness" (or null if not applicable)
- neededTime: one of "lessthan1hour", "between1_2hours", "between2_4hours", "between4_8hours", "morethan1day" (or null if not applicable)
- difficulty: one of "low", "medium", "high" (or null if not applicable)
- suitableFor: one of "family", "groups", "individual", "seniors", "couples" (or null if not applicable)

Examples:
Query: "I want a quick cultural activity for families"
Response: {"experienceType":"cultural","neededTime":"lessthan1hour","difficulty":null,"suitableFor":"family"}

Query: "challenging mountain hike for the whole day"
Response: {"experienceType":"outdoor","neededTime":"between4_8hours","difficulty":"high","suitableFor":null}

Query: "romantic dinner options"
Response: {"experienceType":"gastronomy","neededTime":null,"difficulty":null,"suitableFor":"couples"}

Query: "easy walk suitable for elderly visitors, about 2 hours"
Response: {"experienceType":"outdoor","neededTime":"between1_2hours","difficulty":"low","suitableFor":"seniors"}

IMPORTANT: Output ONLY the JSON object, no markdown, no explanation.`;

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
      // Clean up potential markdown formatting
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error(`[parse-query-llm] Failed to parse LLM response as JSON:`, content);
      // Return empty filters if parsing fails
      parsed = {
        experienceType: null,
        neededTime: null,
        difficulty: null,
        suitableFor: null
      };
    }

    // Validate and normalize the response
    const validExperienceTypes = ["cultural", "outdoor", "gastronomy", "shopping", "wellness"];
    const validNeededTime = ["lessthan1hour", "between1_2hours", "between2_4hours", "between4_8hours", "morethan1day"];
    const validDifficulty = ["low", "medium", "high"];
    const validSuitableFor = ["family", "groups", "individual", "seniors", "couples"];

    const result = {
      experienceType: validExperienceTypes.includes(parsed.experienceType) ? parsed.experienceType : undefined,
      neededTime: validNeededTime.includes(parsed.neededTime) ? parsed.neededTime : undefined,
      difficulty: validDifficulty.includes(parsed.difficulty) ? parsed.difficulty : undefined,
      suitableFor: validSuitableFor.includes(parsed.suitableFor) ? parsed.suitableFor : undefined,
      keywords: query.split(' ').filter((word: string) => word.length > 3)
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
