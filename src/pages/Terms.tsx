import { ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

type Section = { h: string; p?: string; li?: string[] };

const ZH: { title: string; updated: string; sections: Section[] } = {
  title: "用户协议",
  updated: "最后更新：2026年10月6日",
  sections: [
    {
      h: "1. 这是什么",
      p: "KanKan 用你拍摄的餐食照片做一次服务端 AI 估算，给出食物名称和大约的热量、蛋白质、脂肪、碳水。估算结果以服务端返回的内容为准。应用不会在本机编造另一套结论。",
    },
    {
      h: "2. 不是医疗建议",
      p: "这些数字是估算，不是诊断、治疗或处方。本应用不提供健康指数，也不把未填写的资料当成默认值或已确认的事实。身体不适请咨询医生。",
    },
    {
      h: "3. 免费试用",
      p: "每个匿名身份可以免费分析一次。这不是每个人一次，也不是每台设备终身一次。次数记在这个匿名账号上。用完之后，把同一个匿名账号升级为邮箱账号才能继续：先验证邮箱，验证之后再设置密码。已保存的那一餐仍属于同一个用户。",
    },
    {
      h: "4. 账号",
      li: [
        "可以用邮箱和密码登录。匿名试用没有邮箱，签出或换设备后无法找回。",
        "从匿名升级时，不会把邮箱和密码一次提交。邮箱验证完成之前不设置密码，密码也不会提前存在这台设备上。",
        "你可以在「我的 → 账号与数据 → 删除账号」中删除账号。删除前会说明清除范围并再次确认。删除后不能再登录，服务端上的该账号数据会被清除。",
      ],
    },
    {
      h: "5. 你的内容与我们的责任",
      p: "你保存的餐食记录归你。我们不出售这些数据。照片只在你点击分析时上传，不放入文件存储。处理方式以《隐私政策》为准。",
    },
    {
      h: "6. 服务现状",
      p: "当前没有付费项目，也没有应用内反馈入口。协议描述的是应用现在的行为。行为变化时会更新本页日期。",
    },
  ],
};

const EN: typeof ZH = {
  title: "Terms of Service",
  updated: "Last updated: Oct 6, 2026",
  sections: [
    {
      h: "1. What this is",
      p: "KanKan sends a meal photo to the server for one AI estimate of the food name and approximate calories, protein, fat, and carbs. The server response is the result. The app does not invent a second conclusion on the device.",
    },
    {
      h: "2. Not medical advice",
      p: "These numbers are estimates. They are not a diagnosis, treatment, or prescription. KanKan does not offer a health index, and it does not treat a blank profile field as a default or as a confirmed fact. See a doctor about health concerns.",
    },
    {
      h: "3. Free trial",
      p: "Each anonymous identity gets one free analysis. That is not one per person, and not one per device for life. The count belongs to that anonymous account. To continue, upgrade the same account to email: verify the email first, then set a password. The saved meal stays on the same user.",
    },
    {
      h: "4. Accounts",
      li: [
        "You can sign in with email and password. An anonymous trial has no email and cannot be recovered after sign-out or on another device.",
        "Upgrading an anonymous account does not send email and password together. No password is set before the email is verified, and the password is not stored on the device ahead of time.",
        "You can delete the account from Profile → Account & data → Delete account. The screen explains what is removed and asks you to confirm again. After deletion you cannot sign in, and that account's data is removed on the server.",
      ],
    },
    {
      h: "5. Your content",
      p: "Meal records you save are yours. We do not sell them. A photo is uploaded only when you start an analysis and is not kept in file storage. Processing is described in the Privacy Policy.",
    },
    {
      h: "6. The service today",
      p: "There is no paid plan and no in-app feedback channel. These terms describe the app as it works now. If that changes, this page's date changes.",
    },
  ],
};

const Terms = () => {
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
            <Link to="/privacy" className="text-primary underline underline-offset-2">{t.privacyPolicy}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
