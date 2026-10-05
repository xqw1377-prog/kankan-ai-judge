# 部署

先迁移数据库，再发布函数和前端。本文只写变量名，不写密钥。不要把四个函数的 `verify_jwt` 改回 `false`，部署时不要加 `--no-verify-jwt`。

`project-ref` 使用 `supabase/config.toml` 里的 `project_id`。

## 1. 应用迁移

在仓库根目录，使用已登录的 Supabase CLI：

```sh
supabase link --project-ref <project-ref>
supabase db push
```

这会按文件名顺序执行 `supabase/migrations/`，其中包括 `20261005090000_g0_user_rls.sql`。

迁移之后，`user_id` 为空的旧行对任何登录用户都不可见。这次没有把旧的 `device_id` 数据归到某个账号。

不要对生产库运行 `scripts/rls-isolation.sh`。那个脚本会重建角色并写入测试用户，只用于空数据库。

## 2. 环境变量

前端构建时需要（Vite 会把它们打进静态资源）：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

`VITE_SUPABASE_PROJECT_ID` 可以不设，当前客户端不读取它。

Edge Functions 由 Supabase 注入：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

需要在 Supabase 的函数密钥里另外设置：

- `LOVABLE_API_KEY`

四个函数是 `analyze-food`、`audit-standalone`、`audit-confirm`、`re-infer-dish`。不要把 `SUPABASE_SERVICE_ROLE_KEY` 配进这些函数，`audit-confirm` 不能再用它写库。

## 3. 发布函数和前端

```sh
supabase functions deploy analyze-food
supabase functions deploy audit-standalone
supabase functions deploy audit-confirm
supabase functions deploy re-infer-dish
```

前端是静态站点。`npm run build` 的产物在 `dist/`。`vercel.json` 把所有路径转到 `index.html`。托管方在构建前设置上面的 `VITE_` 变量。

在 Supabase Auth 的重定向地址里加上生产站点的源。注册和重置密码使用浏览器当前的源。

发布顺序：迁移、函数密钥、函数、前端。前端先上线时，已登录用户的保存会失败，因为库里还没有 `user_id`。
