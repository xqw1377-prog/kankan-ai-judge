import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  GUEST_LIMIT_BODY,
  guestSuccessCount,
  releaseGuestFoodSlot,
  replayGuestAnalysis,
  reserveGuestFoodSlot,
} from "../_shared/guestFoodQuota.ts";
import { guestQuotaDecision, guestRetryDecision, persistedIdempotencyKey, resolveGuestReservation } from "../_shared/guestQuotaDecision.ts";
import { enforceAiRateLimit, json, requireUser, serviceDb } from "../_shared/guard.ts";
import { parseImages, toImageContents } from "../_shared/images.ts";
import { validateAnalysis } from "../_shared/analysisContract.ts";
import { ANALYSIS_PROVIDER, completeToolCall, VISUAL_UNCERTAINTY } from "../_shared/analysisProvider.ts";
import { applyProfileAdvice } from "../_shared/profileAdvice.ts";
import { loadAdviceProfile } from "../_shared/profileContext.ts";
import { storeAnalysis, storeGuestAnalysisWithLease } from "../_shared/storeAnalysis.ts";
import { requireAnonymousTurnstile } from "../_shared/turnstile.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let guestHold: { userId: string; db: NonNullable<ReturnType<typeof serviceDb>>; leaseId: string } | null = null;
  const abandonGuestSlot = async () => {
    if (!guestHold) return;
    const hold = guestHold;
    guestHold = null;
    await releaseGuestFoodSlot(hold.db, hold.userId, hold.leaseId);
  };

  try {
    const body = await req.json();
    const auth = await requireUser(req, corsHeaders);
    if (auth instanceof Response) return auth;
    const idempotencyKey = persistedIdempotencyKey(auth.isAnonymous, body.idempotencyKey) ?? "";
    const admin = auth.isAnonymous ? serviceDb() : null;
    const exact = await replayGuestAnalysis(auth.supabase, auth.userId, idempotencyKey);
    let quotaAllows = true;
    if (auth.isAnonymous) {
      if (!admin) return json(503, { error: "暂时无法校验调用次数" }, corsHeaders);
      const count = await guestSuccessCount(admin, auth.userId);
      if (count == null) return json(503, { error: "暂时无法校验调用次数" }, corsHeaders);
      quotaAllows = guestQuotaDecision({ isAnonymous: true, successfulCount: count }).allow;
    }
    const early = guestRetryDecision({
      isAnonymous: auth.isAnonymous,
      hasStoredAnalysis: Boolean(exact),
      quotaAllows,
    });
    if (early === "replay" && exact) return json(200, exact, corsHeaders);
    if (early === "block") return json(403, GUEST_LIMIT_BODY, corsHeaders);
    if (auth.isAnonymous) {
      const captcha = await requireAnonymousTurnstile(body.turnstileToken, corsHeaders, req.headers.get("origin"));
      if (captcha) return captcha;
    }
    const limited = await enforceAiRateLimit(auth.supabase, auth.userId, corsHeaders);
    if (limited) return limited;

    const parsed = parseImages(body);
    if (!parsed.ok) return json(parsed.status, { error: parsed.error }, corsHeaders);
    if (auth.isAnonymous && admin) {
      const reserved = await reserveGuestFoodSlot(admin, auth.userId);
      const again = reserved.status === "taken"
        ? await replayGuestAnalysis(auth.supabase, auth.userId, idempotencyKey)
        : null;
      const slot = resolveGuestReservation({
        reserved: reserved.status,
        hasStoredAnalysis: Boolean(again),
      });
      if (slot === "unavailable") return json(503, { error: "暂时无法校验调用次数" }, corsHeaders);
      if (slot === "replay" && again) return json(200, again, corsHeaders);
      if (slot === "block") return json(403, GUEST_LIMIT_BODY, corsHeaders);
      if (!reserved.leaseId) return json(503, { error: "暂时无法校验调用次数" }, corsHeaders);
      guestHold = { userId: auth.userId, db: admin, leaseId: reserved.leaseId };
    }
    const imageContents = toImageContents(parsed.images);
    const language = body.language === "en-US" ? "en-US" : "zh-CN";
    const isEnglish = language === "en-US";

    const isMulti = imageContents.length > 1;

    const systemPrompt = isEnglish
      ? `You are "KANKAN" — a professional but sassy AI food analyst. ${isMulti ? "The user will give you multiple photos of the same meal (panoramic + close-ups). " : "The user will give you a food photo. "}You must analyze and return structured nutrition data.

You must:
1. Identify the food name (2-8 words)
2. List main ingredients with estimated grams
3. Estimate total calories and macronutrients
4. Give a one-sentence description of this meal
5. Give a specific food suggestion (wrap recommended food names in 【】)
6. Determine if this is takeout or homemade
7. Give a sassy but loving roast (20-40 words, witty)

Rules:
- Estimate ingredient grams reasonably
- Base calories/macros on ingredients
- Describe the food only. Do not ask for or use a person's allergies, activity, goals, or body weight
- If not food, set calories to 0, verdict "This is not food"
- cooking_scene: "takeout" or "homemade"
${isMulti ? `- You'll receive multiple photos of the same meal. Identify the panoramic view first, then use close-ups for detail. Deduplicate ingredients and output actual total intake.` : ""}
- Use the specified tool to return results
- ALL text output (food name, ingredient names, verdict, suggestion, roast) MUST be in English`
      : `你是"KANKAN"——一个专业但毒舌有趣的AI饮食分析师。${isMulti ? "用户会给你同一顿饭的多张照片（可能包含全景和特写），" : "用户会给你一张食物照片，"}你需要分析并返回结构化的营养数据。

你必须：
1. 识别食物名称（2-8个字）
2. 列出主要食材及估算克重
3. 估算总热量和三大营养素
4. 给出一句关于这顿饭本身的评价
5. 给出具体可执行的吃法建议（在建议中用【】括号标注具体推荐的食物名称）
6. 判断这是外卖/外食还是自炊场景
7. 给出一句毒舌但有爱的吐槽（roast），20-40字，幽默犀利

规则：
- 食材克重要合理估算
- 热量和营养素要基于食材计算
- 只描述这顿饭。不要使用过敏、活动量、健康目标或体重
- 建议要可执行，比如具体推荐某道菜，用【】包裹食物名
- 如果图片不是食物，calories 给0，verdict 说"这不是食物"
- cooking_scene: "takeout" 代表外卖/外食, "homemade" 代表自炊/家做
- roast: 毒舌吐槽，幽默调侃用户的饮食选择
${isMulti ? `- 你将收到一组同一顿饭的照片，请先识别全景，再结合特写进行去重分析，最终输出该用户实际摄入的食材总量。不要重复计算同一食材。` : ""}
- 使用指定的工具返回结果`;

    const userMessage = isEnglish
      ? (isMulti
        ? `Analyze the nutrition of these ${imageContents.length} photos of the same meal. Deduplicate ingredients across panoramic and close-up shots.`
        : "Analyze the nutrition of this food photo.")
      : (isMulti
        ? `分析这组同一顿饭的 ${imageContents.length} 张照片的营养信息。请综合全景和特写去重后给出准确结果。`
        : "分析这张食物照片的营养信息。");

    const model = "google/gemini-3-flash-preview";
    const completed = await completeToolCall({
      model,
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
      toolChoice: { type: "function", function: { name: "food_analysis" } },
    });

    if (completed.ok === false) {
      await abandonGuestSlot();
      return json(completed.status, { error: completed.error }, corsHeaders);
    }

    const result = JSON.parse(completed.arguments);
    const checked = validateAnalysis(result);
    if (!checked.ok) {
      await abandonGuestSlot();
      return json(422, { error: "没能识别这餐" }, corsHeaders);
    }
    const adviceProfile = await loadAdviceProfile(auth.supabase, auth.userId);
    const advised = applyProfileAdvice(checked.value, adviceProfile, language);
    let stored: { id: string; reused: boolean } | null = null;
    if (guestHold) {
      const saved = await storeGuestAnalysisWithLease(guestHold.db, guestHold.userId, guestHold.leaseId, advised, {
        provider: ANALYSIS_PROVIDER,
        model,
        uncertainty: VISUAL_UNCERTAINTY,
      }, idempotencyKey || null);
      if (!saved.ok && saved.reason === "stale_lease") {
        guestHold = null;
        return json(409, { error: "试用名额已经交给更新的请求" }, corsHeaders);
      }
      if (!saved.ok) {
        await abandonGuestSlot();
        return json(500, { error: "没能保存分析结果" }, corsHeaders);
      }
      stored = { id: saved.id, reused: saved.reused };
      guestHold = null;
    } else {
      stored = await storeAnalysis(auth.userId, advised, {
        provider: ANALYSIS_PROVIDER,
        model,
        uncertainty: VISUAL_UNCERTAINTY,
      }, idempotencyKey || null);
      if (!stored) {
        await abandonGuestSlot();
        return json(500, { error: "没能保存分析结果" }, corsHeaders);
      }
    }
    if (stored.reused && idempotencyKey) {
      const replay = await replayGuestAnalysis(auth.supabase, auth.userId, idempotencyKey);
      if (replay) return json(200, replay, corsHeaders);
    }
    return json(200, {
      ...advised,
      cooking_scene: result.cooking_scene,
      roast: result.roast,
      analysis_id: stored.id,
    }, corsHeaders);
  } catch (e) {
    console.error("analyze-food error:", e);
    await abandonGuestSlot();
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});