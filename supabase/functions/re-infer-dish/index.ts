import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceAiRateLimit, json, requireUser } from "../_shared/guard.ts";
import { validateAnalysis, validateIngredientList } from "../_shared/analysisContract.ts";
import { ANALYSIS_PROVIDER, completeToolCall, VISUAL_UNCERTAINTY } from "../_shared/analysisProvider.ts";
import { storeAnalysis } from "../_shared/storeAnalysis.ts";

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
    const auth = await requireUser(req, corsHeaders);
    if (auth instanceof Response) return auth;
    const limited = await enforceAiRateLimit(auth.supabase, auth.userId, corsHeaders);
    if (limited) return limited;

    const listed = validateIngredientList(ingredients);
    if (listed.ok === false) return json(400, { error: listed.error }, corsHeaders);

    const isEnglish = language === "en-US";
    const ingredientList = listed.value.map((item) => `${item.name} ${item.grams}g`).join(", ");

    const systemPrompt = isEnglish
      ? `You are a professional food analyst. Given a list of ingredients with weights, infer the most likely dish name and recalculate accurate nutrition data. Be precise and practical.`
      : `你是一名专业的食物分析师。根据给定的食材清单和克重，推断最可能的菜品名称，并重新计算准确的营养数据。要精准实用。`;

    const userMessage = isEnglish
      ? `Based on these ingredients, what dish is this most likely? Recalculate nutrition.\n\nIngredients: ${ingredientList}`
      : `根据以下食材，推断这最可能是什么菜，并重新计算营养数据。\n\n食材清单：${ingredientList}`;

    const model = "google/gemini-2.5-flash-lite";
    const completed = await completeToolCall({
      model,
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
      toolChoice: { type: "function", function: { name: "dish_inference" } },
    });

    if (completed.ok === false) return json(completed.status, { error: completed.error }, corsHeaders);

    const result = JSON.parse(completed.arguments);
    const checked = validateAnalysis({ ...result, ingredients: listed.value });
    if (!checked.ok) return json(422, { error: "没能识别这餐" }, corsHeaders);
    const analysisId = await storeAnalysis(auth.userId, checked.value, {
      provider: ANALYSIS_PROVIDER,
      model,
      uncertainty: VISUAL_UNCERTAINTY,
    });
    if (!analysisId) return json(500, { error: "没能保存分析结果" }, corsHeaders);
    return json(200, { ...checked.value, analysis_id: analysisId }, corsHeaders);
  } catch (e) {
    console.error("re-infer-dish error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
