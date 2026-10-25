import { expect, test, type Page } from "@playwright/test";

const PAID_OR_ACCOUNT = /\/functions\/v1\/(analyze-food|audit-standalone|audit-confirm|re-infer-dish|day-summary)\b|\/auth\/v1\/(signup|recover|logout)\b|grant_type=password/;

/** Abort anything that would register an account or call a paid analysis, then fail if it was attempted. */
async function guardLiveCalls(page: Page, blocked: string[]) {
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (PAID_OR_ACCOUNT.test(url)) {
      blocked.push(url);
      await route.abort();
      return;
    }
    await route.continue();
  });
}

async function open(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `${path} returned no document`).not.toBeNull();
  expect(response!.ok(), `${path} document status ${response!.status()}`).toBeTruthy();
  await expect(page.getByRole("heading", { name: "页面不存在" })).toHaveCount(0);
}

test("homepage, login, privacy, and terms render on the public site", async ({ page }) => {
  const blocked: string[] = [];
  await guardLiveCalls(page, blocked);

  await open(page, "/");
  await expect(page.getByText("拍下这一餐", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "最近记录" })).toBeVisible();
  await expect(page.locator("#root")).toContainText("拍下这一餐");

  await open(page, "/login");
  await expect(page.getByLabel("邮箱")).toBeVisible();
  await expect(page.getByRole("button", { name: "登录", exact: true })).toBeVisible();
  await expect(page.getByLabel("密码")).toBeVisible();

  await page.getByRole("link", { name: "《隐私政策》" }).click();
  await expect(page.getByRole("heading", { name: "隐私政策" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2. 我们收集的数据" })).toBeVisible();
  await expect(page.getByText("食物照片：仅在您点击")).toBeVisible();

  await open(page, "/terms");
  await expect(page.getByRole("heading", { name: "用户协议" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2. 不是医疗建议" })).toBeVisible();
  await expect(page.getByText("这些数字是估算，不是诊断")).toBeVisible();

  expect(blocked, "smoke must not register or call paid analysis").toEqual([]);
});
