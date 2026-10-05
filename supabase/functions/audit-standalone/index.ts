import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceAiRateLimit, json, requireUser } from "../_shared/guard.ts";
import { parseImages, toImageContents } from "../_shared/images.ts";

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
    const body = await req.json();
    const auth = await requireUser(req, corsHeaders);
    if (auth instanceof Response) return auth;
    const limited = await enforceAiRateLimit(auth.supabase, auth.userId, corsHeaders);
    if (limited) return limited;
    const parsed = parseImages(body);
    if (!parsed.ok) return json(parsed.status, { error: parsed.error }, corsHeaders);
    const imageContents = toImageContents(parsed.images);
    const { language = "zh-CN", userContext } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isEn = language === "en-US";
    let contextStr = "";
    if (userContext) {
      if (userContext.goal) contextStr += `用户目标：${userContext.goal}。`;
      if (userContext.allergies) contextStr += `过敏/忌口：${userContext.allergies}。`;
      if (userContext.health_conditions?.length) contextStr += `健康状况：${userContext.health_conditions.join("、")}。`;
    }

    const systemPrompt = isEn
      ? `You are Kankan. Estimate this meal from the photos. This is an AI estimate, not a lab result, a medical review, or an existing international nutrition standard. Return a structured estimate.

You must:
1. Identify each ingredient with estimated weight (grams)
2. For each ingredient estimate: GI (glycemic index), GL (glycemic load), oil content (g), protein (g), fat (g), fiber (g)
3. Compute an overall BPI (Body Performance Index) score 0-100 based on nutritional balance
4. Provide 2-4 actionable recommendations
5. Flag any inflammation or metabolic risks

${contextStr ? `User context: ${contextStr}` : ""}

Rules:
- Deduplicate ingredients across multiple photos of the same meal
- Be precise with gram estimates based on visual portion sizes
- BPI formula: 50 + (protein×0.6) + (fiber×1.2) - (GL×0.4) - (fat×0.15), clamped 0-100
- Use the provided tool to return structured results
- ALL output MUST be in English`
      : `你是 Kankan。根据照片估算这餐。这是 AI 估算，不是实验室结果、医学复核，也不是已有的国际营养标准。返回结构化估算。

你必须：
1. 识别每种食材及估算克重
2. 为每种食材估算：GI（升糖指数）、GL（升糖负荷）、油脂含量(g)、蛋白质(g)、脂肪(g)、膳食纤维(g)
3. 计算整体BPI（身体表现指数）0-100分
4. 提供2-4条可执行的改善建议
5. 标注任何炎症或代谢风险

${contextStr ? `用户信息：${contextStr}` : ""}

规则：
- 多张照片属于同一餐，请去重分析
- 基于目视比例精准估算克重
- BPI公式：50 + (蛋白质×0.6) + (纤维×1.2) - (GL×0.4) - (脂肪×0.15)，限制0-100
- 使用指定工具返回结果`;

    const userMessage = isEn
      ? `Estimate these ${imageContents.length} meal photo(s). This is an AI estimate, not a verified audit.`
      : `估算这${imageContents.length}张食物照片。这是 AI 估算，不是已验证的审计。`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [...imageContents, { type: "text", text: userMessage }] },
        ],
        tools: [{
          type: "function",
          function: {
            name: "audit_report",
            description: "Return a structured AI meal estimate",
            parameters: {
              type: "object",
              properties: {
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      grams: { type: "number" },
                      gi: { type: "number" },
                      gl: { type: "number" },
                      oil_g: { type: "number" },
                      protein: { type: "number" },
                      fat: { type: "number" },
                      fiber: { type: "number" },
                    },
                    required: ["name", "grams", "gi", "gl", "oil_g", "protein", "fat", "fiber"],
                  },
                },
                bpi_score: { type: "number", description: "Body Performance Index 0-100" },
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-4 actionable recommendations",
                },
              },
              required: ["ingredients", "bpi_score", "recommendations"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "audit_report" } },
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

    throw new Error("No tool call in AI response");
  } catch (e) {
    console.error("audit-standalone error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
