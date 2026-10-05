import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceAiRateLimit, json, requireUser } from "../_shared/guard.ts";
import { completeToolCall } from "../_shared/analysisProvider.ts";
import { parseImages, toImageContents } from "../_shared/images.ts";
import { serverProfileNote } from "../_shared/profileContext.ts";

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
    const language = body.language === "en-US" ? "en-US" : "zh-CN";
    const isEn = language === "en-US";
    const contextStr = await serverProfileNote(auth.supabase, auth.userId);

    const systemPrompt = isEn
      ? `You are Kankan. Estimate this meal from the photos. This is an AI estimate, not a lab result, a medical review, or an existing international nutrition standard. Return a structured estimate.

You must:
1. Identify each ingredient with estimated weight (grams)
2. For each ingredient estimate: GI (glycemic index), GL (glycemic load), oil content (g), protein (g), fat (g), fiber (g)
3. Provide 2-4 practical eating suggestions
4. Do not invent a performance index, a medical diagnosis, or a percentage effect

${contextStr ? `User context: ${contextStr}` : ""}

Rules:
- Deduplicate ingredients across multiple photos of the same meal
- Gram estimates are visual, not measured
- Use the provided tool to return structured results
- ALL output MUST be in English`
      : `你是 Kankan。根据照片估算这餐。这是 AI 估算，不是实验室结果、医学复核，也不是已有的国际营养标准。返回结构化估算。

你必须：
1. 识别每种食材及估算克重
2. 为每种食材估算：GI（升糖指数）、GL（升糖负荷）、油脂含量(g)、蛋白质(g)、脂肪(g)、膳食纤维(g)
3. 提供 2-4 条怎么吃的建议
4. 不要编造性能指数、医学诊断或百分比效果

${contextStr ? `用户信息：${contextStr}` : ""}

规则：
- 多张照片属于同一餐，请去重分析
- 克重是目视估算，不是测量值
- 使用指定工具返回结果`;

    const userMessage = isEn
      ? `Estimate these ${imageContents.length} meal photo(s). This is an AI estimate, not a verified audit.`
      : `估算这${imageContents.length}张食物照片。这是 AI 估算，不是已验证的审计。`;

    const completed = await completeToolCall({
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
              recommendations: {
                type: "array",
                items: { type: "string" },
                description: "2-4 eating suggestions, without percentage effects",
              },
            },
            required: ["ingredients", "recommendations"],
          },
        },
      }],
      toolChoice: { type: "function", function: { name: "audit_report" } },
    });

    if (completed.ok === false) return json(completed.status, { error: completed.error }, corsHeaders);
    return json(200, JSON.parse(completed.arguments), corsHeaders);
  } catch (e) {
    console.error("audit-standalone error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
