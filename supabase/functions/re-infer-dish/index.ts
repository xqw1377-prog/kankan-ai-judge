import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, language = "zh-CN" } = await req.json();

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(JSON.stringify({ error: "No ingredients provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isEnglish = language === "en-US";
    const ingredientList = ingredients.map((i: any) => `${i.name} ${i.grams}g`).join(", ");

    const systemPrompt = isEnglish
      ? `You are a professional food analyst. Given a list of ingredients with weights, infer the most likely dish name and recalculate accurate nutrition data. Be precise and practical.`
      : `你是一名专业的食物分析师。根据给定的食材清单和克重，推断最可能的菜品名称，并重新计算准确的营养数据。要精准实用。`;

    const userMessage = isEnglish
      ? `Based on these ingredients, what dish is this most likely? Recalculate nutrition.\n\nIngredients: ${ingredientList}`
      : `根据以下食材，推断这最可能是什么菜，并重新计算营养数据。\n\n食材清单：${ingredientList}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "dish_inference",
              description: "Return inferred dish name and recalculated nutrition",
              parameters: {
                type: "object",
                properties: {
                  food: { type: "string", description: "推断的菜品名称，2-8个字" },
                  calories: { type: "number", description: "总热量 kcal" },
                  protein_g: { type: "number", description: "蛋白质克数" },
                  fat_g: { type: "number", description: "脂肪克数" },
                  carbs_g: { type: "number", description: "碳水化合物克数" },
                  verdict: { type: "string", description: "简短营养评价，20-40字" },
                },
                required: ["food", "calories", "protein_g", "fat_g", "carbs_g", "verdict"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "dish_inference" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ food: "未知菜品", calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, verdict: "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("re-infer-dish error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
