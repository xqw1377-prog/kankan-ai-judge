# 部署

先迁移数据库，再发布函数和前端。本文只写变量名，不写密钥。不要把函数的 `verify_jwt` 改回 `false`，部署时不要加 `--no-verify-jwt`。

`project-ref` 使用 `supabase/config.toml` 里的 `project_id`。

## 1. 应用迁移

在仓库根目录，使用已登录的 Supabase CLI：

```sh
supabase link --project-ref <project-ref>
supabase db push
```

这会按文件名顺序执行 `supabase/migrations/`，其中包括 `20261005090000_g0_user_rls.sql`、`20261005110000_writes_via_functions.sql` 和 `20261006010000_account_deletion_and_ai_slot.sql`。`20261005110000` 撤销客户端对餐食、档案、反馈和习惯表的写入，分析草稿只允许本人读取。`20261006010000` 给认领凭证补上账号删除级联，并增加按小时原子扣减 AI 次数的函数。

迁移之后，`user_id` 为空的旧行对任何登录用户都不可见。这次没有把旧的 `device_id` 数据归到某个账号。

不要对生产库运行 `scripts/rls-isolation.sh`。那个脚本会重建角色并写入测试用户，只用于空数据库。

## 2. 环境变量

前端构建时需要（Vite 会把它们打进静态资源）：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

`VITE_SUPABASE_PROJECT_ID` 可以不设，当前客户端不读取它。

Edge Functions 由 Supabase 平台注入：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

需要在 Supabase 的函数密钥里另外设置：

- `LOVABLE_API_KEY`
- `TURNSTILE_SECRET_KEY`：Cloudflare Turnstile 的密钥，只放在函数环境里。匿名用户的第一次食物分析会先做 siteverify。
- `KANKAN_ENV`：公开环境设为 `production`。这时如果没有 `TURNSTILE_SECRET_KEY`，分析会失败关闭（503），不会放行。非生产环境缺少密钥时函数仍可本地运行。这两项已于 2026-10-08 在 Lovable Cloud → Secrets 中设置。请求的 Origin 是 `https://kankanai.cc` 或 `https://www.kankanai.cc` 时，即使 `KANKAN_ENV` 没设，缺少密钥也会失败关闭。

前端还需要：

- `VITE_TURNSTILE_SITE_KEY`：Turnstile 的站点密钥（公开）。生产构建里如果它为空，不会调用 `signInAnonymously`，也不会上传照片做第一次试用分析；扫描页只提示人机验证未配置，不会打开一个空的 Turnstile 组件。非生产构建缺少该变量时，本地分析仍可继续。它已提交在仓库根目录 `.env` 里（与 `VITE_SUPABASE_*` 一样是公开值），Lovable 和 Vercel 构建都会读取。若构建环境覆盖了 `.env`，生产必须另行设置这个变量名，值不要写进文档。Turnstile 小组件的允许域名：`kankanai.cc`、`www.kankanai.cc`、`kankan-eye-spy.lovable.app`（`*.vercel.app` 预览会显示域名错误，属正常）。

## 2b. 域名

正式域名是 apex `https://kankanai.cc`。`index.html` 里的 canonical、`og:url` 和 `og:image` 都指向这个源。`www.kankanai.cc` → apex 的 301 在 Vercel 域名设置里做，不在应用代码里。代码只负责规范链接。

需要部署的函数是 `analyze-food`、`audit-standalone`、`audit-confirm`、`re-infer-dish`、`save-profile`、`day-summary`、`claim-guest-meal`、`delete-account`。平台注入的 `SUPABASE_SERVICE_ROLE_KEY` 只在函数里 `requireUser()`（内部调用 `auth.getUser`）通过之后使用。`delete-account` 用它删除认领凭证和登录身份；其余函数用它写入分析草稿、餐食和档案。匿名请求在校验用户之前返回 401，不会创建 service role 客户端。不要把这把密钥放进前端或仓库。`verify_jwt` 保持 `true`。

## 3. 发布函数和前端

```sh
supabase functions deploy analyze-food
supabase functions deploy audit-standalone
supabase functions deploy audit-confirm
supabase functions deploy re-infer-dish
supabase functions deploy save-profile
supabase functions deploy day-summary
supabase functions deploy claim-guest-meal
supabase functions deploy delete-account
```

前端是静态站点。`npm run build` 的产物在 `dist/`。`vercel.json` 把所有路径转到 `index.html`。托管方在构建前设置上面的 `VITE_` 变量。

## 2c. 线上冒烟

不注册账号，也不调用食物分析。对 `https://www.kankanai.cc` 打开首页、登录页、隐私政策、用户协议，并确认正文已经渲染（不只是 HTTP 200）。

```sh
npx playwright install chromium
npm run smoke:prod
```

CI 里的 `npm test` 不跑这组检查，也不下载浏览器。

在 Supabase Auth 的重定向地址里加上生产站点的源，以及 `{生产源}/login` 和 `{生产源}/reset-password`。匿名升级只先提交邮箱，验证链接回到 `/login` 后再设置密码。这要求：Authentication 里打开 Manual Linking；开启邮箱确认；配置可用的自定义 SMTP（平台自带邮箱不适合生产）。注册和重置密码使用浏览器当前的源。

发布顺序：迁移、函数密钥、函数、前端。前端先上线时，已登录用户的保存会失败，因为库里还没有 `user_id`。

## 4. 语言

界面有 `zh-CN` 和 `en-US` 两套文案，核心流程、隐私政策和用户协议都包含在内。没有保存过的选择时，系统语言以 `zh` 开头用简体中文，其余用英文。繁体系统语言目前也显示简体文案。用户在首页或个人页手动切换后，选择写入 `kankan-locale`，之后优先于系统语言。

## 5. 原生工程

`capacitor.config.ts` 的 `appId` 是 `cc.kankanai`，与 App Store 上 KanKanAI（Apple ID 6760216922）的 bundle id 一致。用这个 id 签名后的包会作为该应用的更新。商店页现有文案仍是更早的产品描述，上传前要由店主确认这是要更新的那一个应用。工程里的 iOS `MARKETING_VERSION` 仍是 `1.0`，商店已发布 `1.0.1`，上传前必须把版本号和构建号调到高于线上。

Android 有两个 product flavor，`applicationId` 都是 `cc.kankanai`，`compileSdk` 和 `targetSdk` 都是 36（Android 16）。2026-08-31 起 Google Play 的新应用和更新要求 target API 36；可申请延期到 2026-11-01。国内商店不要求更低的 target。差别只在 Google 服务：

- `domestic`：华为、小米、OPPO、vivo、应用宝。清单里没有 `com.google.android.gms`，也没有 Google services 插件。
- `play`：只在这个 flavor 里加入相册选择器的 Play 服务回溯模块。没有相机时的 Google 依赖不会进入国内包。

两个 flavor 的 release 都没有签名配置。不要在仓库里生成 keystore。调试包使用本机调试证书，只用于安装验证。

打包前：

```sh
npm run build
npx cap sync android
npx cap sync ios
```

`npx cap sync` 会把 `dist/` 拷进原生工程。这些拷贝包含公开的 `VITE_` 值，已在 `.gitignore` 里，不要提交。Android 还要本机的 `ANDROID_HOME` 指向带 `platforms;android-36` 和 `build-tools;36.0.0` 的 SDK。

```sh
cd android
./gradlew assembleDomesticDebug assemblePlayDebug
./gradlew packageDomesticReleaseBundle packagePlayReleaseBundle
```

`package*ReleaseBundle` 产出的是未签名的中间包，路径在 `android/app/build/intermediates/intermediary_bundle/`。正式上架前由店主用自己的密钥签名。`bundle*Release` 会在签名步骤失败，这是预期结果。

iOS 使用 Swift Package Manager，不需要 CocoaPods。本环境没有 Mac，不能归档或签名。在 Mac 上：

```sh
npm ci
npm run build
npx cap sync ios
open ios/App/App.xcodeproj
```

用 Xcode 选择开发团队，Product → Archive，再上传到 App Store Connect。同一个二进制在 App Store Connect 里同时勾选中国区和其他国家即可。Xcode Cloud 可以在 `ci_pre_xcodebuild.sh` 里执行上面的 `npm ci`、`npm run build` 和 `npx cap sync ios`。最低系统是 iOS 15.0，与现有商店包一致。

### WebView

- 相机走 `@capacitor/camera`。拍完若系统杀掉应用，`appRestoredResult` 会把这张照片带回 `/scan`。没有 `saveToGallery`，所以没有读写外部存储权限。国内渠道在没有系统相册选择器时退回 `ACTION_OPEN_DOCUMENT`。
- 邮箱验证和重置密码在手机上回到 `cc.kankanai://login` 和 `cc.kankanai://reset-password`，再在 WebView 里交换会话。Supabase Auth 的重定向允许列表必须加上这两个地址。网页仍使用当前站点源。
- Android 的 WebView 源是 `https://kankanai.cc`，iOS 是 `capacitor://kankanai.cc`（WKWebView 不能用 https 加载本地包）。Turnstile 站点密钥已允许 `kankanai.cc`。Cloudflare 经常拦截 WebView 的浏览器标识；`challenges.cloudflare.com` 在中国大陆也不稳定。小组件打不开时，生产环境会失败关闭，不会跳过验证。

## 6. 网络可达性

下面的探测是 2026-10-25 从这台构建机发出的，这台机器不在中国大陆。结果只说明海外链路当时能连上，不能当作大陆实测。

| 用途 | 主机 | 这次探测 |
| --- | --- | --- |
| Supabase Auth | `rordwmxjrozstuiivghu.supabase.co` | 有响应（未带密钥时健康检查返回 401） |
| AI 网关 | `ai.gateway.lovable.dev` | 有响应（HEAD 返回 405） |
| Turnstile | `challenges.cloudflare.com` | 有响应（302） |
| 站点与隐私政策 | `www.kankanai.cc`、`/privacy` | 200 |
| Google Fonts | `fonts.googleapis.com` | 海外 200；应用已不再请求它 |

中国大陆的已知风险和替代：

- `supabase.co` 经常不稳定或被干扰。替代是在大陆可达的域名上做反向代理，或把接口迁到大陆可达的主机。本仓库没有改接口地址。
- Lovable AI 网关在海外。食物分析从中国大陆发出时可能超时。替代是经大陆可达的边缘转发，或更换大陆可达的模型接口。没有改分析调用。
- Turnstile 依赖 Cloudflare。大陆和 WebView 里都可能加载失败，生产环境会拒绝这次分析。替代是大陆可用的人机验证，或在确认风险后改服务端限流。没有改验证实现。
- 隐私政策现在托管在 Vercel。商店要求隐私政策 URL 在用户所在地能打开。大陆上架前需要一个已备案、大陆可打开的隐私政策地址；海外继续用 `https://kankanai.cc/privacy` 即可。
- 拉丁字体已随包发布。中文使用系统字体（苹方、HarmonyOS Sans、MiSans、OPPO Sans、vivo Sans、Noto Sans CJK、微软雅黑），不再请求 `fonts.googleapis.com`。

## 7. 店主上架清单

本仓库不上传商店、不合并、不生成签名密钥、不改付费。

### 国内（华为、小米、OPPO、vivo、应用宝）

- 软件著作权证书。
- 域名 ICP 备案，以及工信部 App 备案号。备案号需要出现在应用内和商店页。
- 五个平台各自的开发者账号和主体资质。
- 店主自行保管的发布签名。用 `domestic` 渠道的包签名，不要提交 `play` 渠道的包。
- 在中国大陆打得开的隐私政策 URL、用户协议 URL。
- 应用图标、各商店要求尺寸的截图、简介、分类、年龄分级、联系邮箱。
- 若审核要求登录，准备一个邮箱测试账号。
- 确认 bundle / 包名 `cc.kankanai` 就是要上架的应用。

### Google Play

- Play Console 开发者账号。
- Play App Signing 的上传密钥，由店主生成并保管。
- `play` 渠道、已签名的 AAB。`targetSdk` 已是 36。
- 海外可打开的隐私政策 URL（当前 `https://kankanai.cc/privacy`）。
- Data safety、内容分级、中英文商店文案和截图。

### App Store 中国区和海外区

- Apple Developer 账号，以及 Mac 或 Xcode Cloud 上的分发证书和描述文件。
- 同一个归档同时勾选中国区和其他国家。中国区还要填写 ICP 备案号。
- 版本号高于线上 `1.0.1`。
- 隐私营养标签、各尺寸截图、中英文描述。
- 中国区用户也能打开的隐私政策 URL；海外可用现有地址。
- 在 Supabase 允许 `cc.kankanai://login` 和 `cc.kankanai://reset-password`。
- 确认用 `cc.kankanai` 更新 Apple ID 6760216922，而不是新建应用。
