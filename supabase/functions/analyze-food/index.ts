import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildImageContent(base64: string) {
  const match = base64.match(/^data:(image\/[\w+]+);base64,(.+)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const base64Data = match ? match[2] : base64;
  return { type: "image_url" as const, image_url: { url: `data:${mimeType};base64,${base64Data}` } };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl, imagesBase64, userContext } = await req.json();

    // Build image content array - support single or multi
    const imageContents: { type: "image_url"; image_url: { url: string } }[] = [];

    if (imagesBase64 && Array.isArray(imagesBase64) && imagesBase64.length > 0) {
      // Multi-image mode
      for (const img of imagesBase64.slice(0, 5)) {
        imageContents.push(buildImageContent(img));
      }
    } else if (imageBase64) {
      imageContents.push(buildImageContent(imageBase64));
    } else if (imageUrl) {
      imageContents.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    if (imageContents.length === 0) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let contextStr = "";
    if (userContext) {
      if (userContext.goal) contextStr += `用户目标：${userContext.goal}。`;
      if (userContext.allergies) contextStr += `过敏/忌口：${userContext.allergies}。`;
      if (userContext.diet_preference) contextStr += `饮食偏好：${userContext.diet_preference}。`;
      if (userContext.cooking_source) contextStr += `饮食来源：${userContext.cooking_source}。`;
    }

    const isMulti = imageContents.length > 1;

    const systemPrompt = `你是"KANKAN"——一个专业但毒舌有趣的AI饮食分析师。${isMulti ? "用户会给你同一顿饭的多张照片（可能包含全景和特写），" : "用户会给你一张食物照片，"}你需要分析并返回结构化的营养数据。

你必须：
1. 识别食物名称（2-8个字）
2. 列出主要食材及估算克重
3. 估算总热量和三大营养素
4. 给出营养判决（一句话，针对用户目标）
5. 给出具体可执行的修复建议（在建议中用【】括号标注具体推荐的食物名称）
6. 判断这是外卖/外食还是自炊场景
7. 给出一句毒舌但有爱的吐槽（roast），20-40字，幽默犀利

${contextStr ? `用户信息：${contextStr}` : ""}

规则：
- 食材克重要合理估算
- 热量和营养素要基于食材计算
- 判决要具体、有用，结合用户目标
- 建议要可执行，比如具体推荐某道菜，用【】包裹食物名
- 如果图片不是食物，calories 给0，verdict 说"这不是食物"
- cooking_scene: "takeout" 代表外卖/外食, "homemade" 代表自炊/家做
- roast: 毒舌吐槽，幽默调侃用户的饮食选择
${isMulti ? `- 你将收到一组同一顿饭的照片，请先识别全景，再结合特写进行去重分析，最终输出该用户实际摄入的食材总量。不要重复计算同一食材。` : ""}
- 使用指定的工具返回结果`;

    const userMessage = isMulti
      ? `分析这组同一顿饭的 ${imageContents.length} 张照片的营养信息。请综合全景和特写去重后给出准确结果。`
      : "分析这张食物照片的营养信息。";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                ...imageContents,
                { type: "text", text: userMessage },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "food_analysis",
                description: "Return comprehensive food nutrition analysis",
                parameters: {
                  type: "object",
                  properties: {
                    food: { type: "string", description: "食物名称，2-8个字" },
                    ingredients: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string", description: "食材名称" },
                          grams: { type: "number", description: "估算克重" },
                        },
                        required: ["name", "grams"],
                        additionalProperties: false,
                      },
                      description: "食材清单（已去重）",
                    },
                    calories: { type: "number", description: "总热量 kcal" },
                    protein_g: { type: "number", description: "蛋白质克数" },
                    fat_g: { type: "number", description: "脂肪克数" },
                    carbs_g: { type: "number", description: "碳水化合物克数" },
                    verdict: { type: "string", description: "营养判决，一句话评价，30-60字" },
                    suggestion: { type: "string", description: "修复建议，具体可执行的饮食调整建议，30-80字，用【】包裹推荐的具体食物" },
                    cooking_scene: { type: "string", enum: ["takeout", "homemade"], description: "饮食场景：takeout=外卖/外食, homemade=自炊" },
                    roast: { type: "string", description: "毒舌吐槽，幽默调侃，20-40字" },
                  },
                  required: ["food", "ingredients", "calories", "protein_g", "fat_g", "carbs_g", "verdict", "suggestion", "cooking_scene", "roast"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "food_analysis" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "请求太频繁，请稍后再试" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度已用完，请充值" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
      JSON.stringify({
        food: "未知食物", ingredients: [],
        calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0,
        verdict: "AI 无法识别，请重试。", suggestion: "",
        cooking_scene: "takeout", roast: "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-food error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});