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

- `VITE_TURNSTILE_SITE_KEY`：Turnstile 的站点密钥（公开）。生产构建里如果它为空，不会调用 `signInAnonymously`，也不会上传照片做第一次试用分析。它已提交在仓库根目录 `.env` 里（与 `VITE_SUPABASE_*` 一样是公开值），Lovable 和 Vercel 构建都会读取，无需在面板里另配。Turnstile 小组件的允许域名：`kankanai.cc`、`www.kankanai.cc`、`kankan-eye-spy.lovable.app`（`*.vercel.app` 预览会显示域名错误，属正常）。

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

在 Supabase Auth 的重定向地址里加上生产站点的源，以及 `{生产源}/login` 和 `{生产源}/reset-password`。匿名升级只先提交邮箱，验证链接回到 `/login` 后再设置密码。这要求：Authentication 里打开 Manual Linking；开启邮箱确认；配置可用的自定义 SMTP（平台自带邮箱不适合生产）。注册和重置密码使用浏览器当前的源。

发布顺序：迁移、函数密钥、函数、前端。前端先上线时，已登录用户的保存会失败，因为库里还没有 `user_id`。
