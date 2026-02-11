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
    const { imageBase64, imageUrl } = await req.json();
    if (!imageBase64 && !imageUrl) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build image content for the API
    let imageContent: { type: string; image_url: { url: string } };
    if (imageUrl) {
      // Direct URL
      imageContent = { type: "image_url", image_url: { url: imageUrl } };
    } else {
      // Extract mime type and base64 data
      const match = imageBase64.match(/^data:(image\/[\w+]+);base64,(.+)$/);
      const mimeType = match ? match[1] : "image/jpeg";
      const base64Data = match ? match[2] : imageBase64;
      imageContent = { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } };
    }

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
            {
              role: "system",
              content: `你是"看看 KanKan"——一个毒舌但搞笑的食物审判官。用户会给你一张食物照片，你需要：
1. 识别出食物名称（简短，2-6个字）
2. 给出"罪恶值"（0-100的整数，越不健康越高）
3. 写一句毒舌但幽默的吐槽（30-60字，要有梗，要扎心但不伤人）

规则：
- 如果图片里没有食物，罪恶值给0，吐槽"这都不是吃的，你在逗我？"
- 健康食物（沙拉、水果）罪恶值 10-30
- 一般食物（米饭、面条）罪恶值 30-50  
- 高热量食物（炸鸡、火锅、奶茶）罪恶值 60-85
- 极致罪恶食物（宵夜烧烤+啤酒）罪恶值 85-100

你必须使用指定的工具返回结果。`,
            },
            {
              role: "user",
              content: [
                imageContent,
                {
                  type: "text",
                  text: "看看这是什么食物？给个判决！",
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "food_verdict",
                description: "Return the food analysis verdict",
                parameters: {
                  type: "object",
                  properties: {
                    food: {
                      type: "string",
                      description: "食物名称，2-6个字",
                    },
                    sin: {
                      type: "number",
                      description: "罪恶值，0-100的整数",
                    },
                    roast: {
                      type: "string",
                      description: "毒舌吐槽金句，30-60字",
                    },
                  },
                  required: ["food", "sin", "roast"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "food_verdict" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "请求太频繁，请稍后再试" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI 额度已用完，请充值" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const verdict = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(verdict), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback
    return new Response(
      JSON.stringify({
        food: "未知食物",
        sin: 50,
        roast: "AI 看不清，但直觉告诉我你在偷吃。",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("analyze-food error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
