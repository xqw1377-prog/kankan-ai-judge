import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <button onClick={() => navigate(-1)} className="p-2 text-card-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-card-foreground ml-1">隐私政策</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="prose prose-sm max-w-none text-card-foreground/90 space-y-4">
          <p className="text-muted-foreground text-xs">最后更新日期：2026年3月10日</p>

          <h2 className="text-base font-bold mt-6">1. 引言</h2>
          <p>欢迎使用 KanKan（以下简称"本应用"）。我们非常重视您的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。</p>

          <h2 className="text-base font-bold">2. 信息收集</h2>
          <p>本应用可能收集以下类型的信息：</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>个人资料信息</strong>：性别、年龄、身高、体重、活动水平、健康目标等，用于提供个性化饮食建议。</li>
            <li><strong>食物照片</strong>：您通过相机拍摄或相册上传的食物照片，用于 AI 营养分析。照片仅在分析过程中使用。</li>
            <li><strong>饮食记录</strong>：您的餐食记录、营养数据和评分信息。</li>
            <li><strong>设备标识</strong>：匿名设备标识符，用于关联您的数据。</li>
          </ul>

          <h2 className="text-base font-bold">3. 信息使用</h2>
          <p>我们收集的信息仅用于以下目的：</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>提供 AI 食物营养分析服务</li>
            <li>生成个性化饮食建议和健康报告</li>
            <li>记录和追踪您的饮食历史</li>
            <li>改进应用功能和用户体验</li>
          </ul>

          <h2 className="text-base font-bold">4. 信息存储与安全</h2>
          <p>您的数据存储在安全的云端服务器上，我们采取行业标准的安全措施来保护您的个人信息，包括数据加密传输和存储。我们不会将您的个人信息出售或出租给第三方。</p>

          <h2 className="text-base font-bold">5. 第三方服务</h2>
          <p>本应用使用以下第三方服务进行数据处理：</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>AI 模型服务：用于食物识别和营养分析（仅处理食物照片，不关联个人身份信息）</li>
            <li>云端数据库：用于安全存储用户数据</li>
          </ul>

          <h2 className="text-base font-bold">6. 用户权利</h2>
          <p>您有权：</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>访问和查看您的个人数据</li>
            <li>修改或更新您的个人资料</li>
            <li>删除您的账户和相关数据</li>
            <li>选择不提供某些可选信息</li>
          </ul>

          <h2 className="text-base font-bold">7. 儿童隐私</h2>
          <p>本应用不面向13岁以下的儿童。我们不会故意收集13岁以下儿童的个人信息。</p>

          <h2 className="text-base font-bold">8. 隐私政策更新</h2>
          <p>我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，并更新"最后更新日期"。</p>

          <h2 className="text-base font-bold">9. 联系我们</h2>
          <p>如果您对本隐私政策有任何疑问，请通过应用内反馈功能与我们联系。</p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
