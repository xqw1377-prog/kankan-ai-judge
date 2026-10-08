import { ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { AI_CONSENT_VERSION } from "@/components/AiConsentDialog";

type Section = { h: string; p?: string; li?: string[] };

const ZH: { title: string; updated: string; sections: Section[] } = {
  title: "隐私政策",
  updated: `最后更新：2026年10月7日 · AI 数据说明版本 ${AI_CONSENT_VERSION}`,
  sections: [
    { h: "1. 引言", p: "本政策说明 KanKan（以下简称“本应用”）实际收集哪些数据、如何处理，以及您的权利。本页描述的就是应用当前的真实行为。" },
    {
      h: "2. 我们收集的数据",
      li: [
        "账户：邮箱与加密存储的密码。未注册时，首次分析会创建一个匿名账户（无邮箱），仅用于计算免费试用次数和保存这次结果。",
        "个人资料（可选）：昵称、性别、年龄、身高、体重、活动水平、目标、饮食偏好、忌口。未填写的项保持“未填写”，不会用默认值代替。KanKan V1 面向 18 岁及以上。",
        "食物照片：仅在您点击“开始分析”时上传，用于这一次分析；我们不把照片存入文件存储。",
        "饮食记录：您保存的餐食名称、食材、克重和由服务端估算的营养数据。",
      ],
    },
    {
      h: "3. 匿名免费试用",
      p: "每个匿名身份可以免费分析一次，不是每个人一次，也不是每台设备终身一次。次数由服务端按这个匿名账号统计，不依赖本机设置。用完后把该匿名账号升级为邮箱账号才能继续。升级不会另开一个账号：先验证邮箱，验证之后再设置密码，已保存的那一餐仍在同一个用户上。",
    },
    {
      h: "4. 第三方 AI 处理",
      li: [
        "调用链：KanKan 服务端 → Lovable AI Gateway → Google Gemini。",
        "发送内容：只有食物照片，用于识别食物。不发送过敏、活动量、健康目标、体重、邮箱或昵称。",
        "个性化：忌口和目标方面的提醒在识别结果核对之后，由 KanKan 服务端按资料规则生成，不交给 AI 服务方。",
        "用途：识别食物、估算热量与蛋白质、脂肪、碳水。营养数值以服务端估算结果为准，应用不在本机自行编造健康评分。",
        "保留：AI 服务提供方按其服务条款处理和保留照片；我们只发送完成识别所需的照片。",
        "授权：首次分析前，在已有登录身份（含匿名账号）之后按 user id 和同意版本征得同意，并记录在本机。说明内容更新后版本号会变化，届时会重新询问。您可在“我的”页撤回同意，撤回后不会再调用 AI。",
      ],
    },
    {
      h: "5. 存储与安全",
      p: "数据存储在云端数据库中，并通过访问规则限定为仅账户本人可读写，传输全程加密。我们不出售或出租您的个人信息。",
    },
    {
      h: "6. 我们不做的事",
      li: [
        "不提供“健康指数”“饮食信用分”之类评分，也不宣称能诊断或治疗疾病。",
        "不用您的数据训练模型，也不宣称“已存入研究库”。",
      ],
    },
    {
      h: "7. 您的权利",
      li: [
        "在“我的”页查看和修改资料，可随时留空可选项。",
        "删除任意一条饮食记录。",
        "撤回 AI 数据处理同意。",
        "在「我的 → 账号与数据 → 删除账号」中删除账号。页面会说明将清除的内容，并要求再次确认。确认后，服务端删除该账号的资料、饮食记录、分析草稿、调用记录、餐后反馈、习惯和认领凭证，并注销登录身份。匿名试用账号也可以这样删除。",
      ],
    },
    { h: "8. 年龄", p: "KanKan V1 面向 18 岁及以上，不面向未成年人，我们不会故意收集未成年人的个人信息。" },
    { h: "9. 政策更新", p: "政策更新后会在本页发布并更新日期；涉及 AI 数据处理的变化会同时更新授权版本号并重新征得同意。" },
    { h: "10. 联系我们", p: "本应用没有应用内反馈入口。删除账号请使用「我的 → 账号与数据 → 删除账号」。" },
  ],
};

const EN: typeof ZH = {
  title: "Privacy Policy",
  updated: `Last updated: Oct 7, 2026 · AI data notice version ${AI_CONSENT_VERSION}`,
  sections: [
    { h: "1. Introduction", p: "This policy describes what KanKan actually collects, how it is processed, and your rights. It matches the app's current behavior." },
    {
      h: "2. Data we collect",
      li: [
        "Account: email and a securely hashed password. Before you register, your first analysis creates an anonymous account (no email) used only to count the free trial and keep that result.",
        "Profile (optional): nickname, sex, age, height, weight, activity level, goal, diet preference, foods to avoid. Empty fields stay \"Not filled\"; we never substitute defaults. KanKan V1 is for people 18 and older.",
        "Food photos: uploaded only when you tap Analyze, used for that analysis, and not kept in file storage.",
        "Meal log: the meals you save — name, ingredients, grams, and server-estimated nutrition.",
      ],
    },
    {
      h: "3. Anonymous free trial",
      p: "Each anonymous identity gets one free analysis. That is not one per person and not one per device for life. The server counts it on that anonymous account, not on the device. Continuing requires upgrading that same account to email: verify the email first, then set a password. The saved meal stays on the same user.",
    },
    {
      h: "4. Third-party AI processing",
      li: [
        "Chain: KanKan server → Lovable AI Gateway → Google Gemini.",
        "Sent: the food photo only, so the model can recognize the meal. Allergies, activity level, health goals, weight, email, and nickname are not sent.",
        "Personal notes: avoidance and goal reminders are written on the KanKan server after the meal analysis is validated. They are not sent to the model.",
        "Purpose: identify food and estimate calories, protein, fat and carbs. Nutrition values come from the server estimate; the app does not invent health scores locally.",
        "Retention: the AI provider processes and retains the photo under its own terms; we send only the photo the recognition needs.",
        "Consent: before the first analysis, and only after a sign-in identity exists (including an anonymous account), we ask for consent for that user id and consent version and record it on this device. When this notice changes, the version changes and we ask again. You can revoke consent on the Profile page; no AI calls happen after that.",
      ],
    },
    {
      h: "5. Storage and security",
      p: "Data lives in a cloud database with access rules limiting each record to its owner, and is encrypted in transit. We never sell or rent your personal information.",
    },
    {
      h: "6. What we don't do",
      li: [
        "No \"health index\" or diet credit scores, and no claims to diagnose or treat disease.",
        "We don't train models on your data or claim to store it in a research lab.",
      ],
    },
    {
      h: "7. Your rights",
      li: [
        "View and edit your profile; optional fields can stay empty.",
        "Delete any meal record.",
        "Revoke AI processing consent.",
        "Delete the account from Profile → Account & data → Delete account. The screen explains what will be removed and asks you to confirm again. The server then deletes that account's profile, meal log, analysis drafts, usage records, meal feedback, habits, and claim tokens, and removes the sign-in identity. Anonymous trial accounts can be deleted the same way.",
      ],
    },
    { h: "8. Age", p: "KanKan V1 is for people 18 and older. It is not intended for minors, and we do not knowingly collect their personal information." },
    { h: "9. Changes", p: "Updates are posted here with a new date; changes to AI processing also bump the consent version and ask again." },
    { h: "10. Contact", p: "KanKan has no in-app feedback channel. To delete an account, use Profile → Account & data → Delete account." },
  ],
};

const Privacy = () => {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const doc = locale === "zh-CN" ? ZH : EN;

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <button onClick={() => navigate(-1)} aria-label={t.back} className="min-h-11 min-w-11 flex items-center justify-center text-card-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-card-foreground ml-1">{doc.title}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-none text-card-foreground/90 space-y-4 text-sm leading-relaxed">
          <p className="text-muted-foreground text-xs">{doc.updated}</p>
          {doc.sections.map((sec) => (
            <section key={sec.h} className="space-y-2">
              <h2 className="text-base font-bold mt-4">{sec.h}</h2>
              {sec.p && <p>{sec.p}</p>}
              {sec.li && (
                <ul className="list-disc pl-5 space-y-1">
                  {sec.li.map((x) => <li key={x}>{x}</li>)}
                </ul>
              )}
            </section>
          ))}
          <p>
            <Link to="/terms" className="text-primary underline underline-offset-2">{t.termsOfService}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
