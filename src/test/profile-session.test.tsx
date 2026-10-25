import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { GUEST_SCOPE, readMeals, writeMeals, type StoredMeal } from "@/lib/localData";
import Profile from "@/pages/Profile";

const { signOut, invoke, sessionUser } = vi.hoisted(() => ({
  signOut: vi.fn(async () => ({ error: null })),
  invoke: vi.fn(async (..._args: unknown[]) => ({ data: { deleted: true }, error: null })),
  sessionUser: {
    current: null as null | { id: string; is_anonymous?: boolean; email?: string | null },
  },
}));

function query() {
  const rows = { data: [] as unknown[], error: null };
  const api = {
    select: () => api,
    eq: () => api,
    order: () => api,
    limit: () => api,
    abortSignal: () => api,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (
      resolve: (value: typeof rows) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(rows).then(resolve, reject),
  };
  return api;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: sessionUser.current } }),
      getSession: async () => ({
        data: { session: sessionUser.current ? { user: sessionUser.current } : null },
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: () => signOut(),
    },
    functions: {
      invoke: (name: string, options?: { body?: unknown }) => invoke(name, options),
    },
    from: () => query(),
  },
}));

function LoginProbe() {
  const location = useLocation();
  const upgrade = Boolean((location.state as { upgrade?: boolean } | null)?.upgrade);
  return <div>{upgrade ? "升级注册" : "登录页"}</div>;
}

function meal(): StoredMeal {
  return {
    id: "guest-1",
    food_name: "试用午饭",
    meal_type: "lunch",
    calories: 100,
    protein_g: 1,
    fat_g: 1,
    carbs_g: 1,
    ingredients: [],
    verdict: "",
    suggestion: "",
    recorded_at: "2026-10-05T08:00:00.000Z",
    sequence_score: null,
  };
}

function renderProfile() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("profile session actions", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionUser.current = null;
    signOut.mockClear();
    invoke.mockClear();
    invoke.mockResolvedValue({ data: { deleted: true }, error: null });
  });

  it("shows register-or-clear for a signed-out guest and does not show logout", async () => {
    writeMeals(GUEST_SCOPE, [meal()]);
    renderProfile();
    expect(await screen.findByTestId("register-keep-record")).toHaveTextContent("注册保留记录");
    expect(screen.getByTestId("clear-trial")).toHaveTextContent("清除试用");
    expect(screen.queryByTestId("logout-account")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "退出登录" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("delete-account")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("register-keep-record"));
    expect(await screen.findByText("登录页")).toBeInTheDocument();
  });

  it("clears on-device trial data without signing out or calling delete-account", async () => {
    writeMeals(GUEST_SCOPE, [meal()]);
    renderProfile();
    fireEvent.click(await screen.findByTestId("clear-trial"));
    expect(await screen.findByText("这会清掉这台设备上的试用记录。当前没有登录身份，不会删除云端账号。")).toBeVisible();
    const confirm = screen.getAllByRole("button", { name: "清除试用" });
    fireEvent.click(confirm[confirm.length - 1]);
    await waitFor(() => expect(readMeals(GUEST_SCOPE)).toEqual([]));
    expect(invoke).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("offers an anonymous user upgrade or trial deletion, not logout", async () => {
    sessionUser.current = { id: "anon-1", is_anonymous: true };
    renderProfile();
    expect(await screen.findByTestId("register-keep-record")).toHaveTextContent("注册保留记录");
    expect(screen.getByTestId("anon-trial-actions")).toBeVisible();
    expect(screen.queryByRole("button", { name: "退出登录" })).not.toBeInTheDocument();
    expect(screen.queryByText("退出登录")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("register-keep-record"));
    expect(await screen.findByText("升级注册")).toBeInTheDocument();
  });

  it("deletes an anonymous trial through delete-account after confirmation", async () => {
    sessionUser.current = { id: "anon-1", is_anonymous: true };
    renderProfile();
    fireEvent.click(await screen.findByTestId("clear-trial"));
    expect(await screen.findByText(/将永久删除这个账号/)).toBeVisible();
    expect(invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "继续" }));
    fireEvent.click(await screen.findByRole("button", { name: "删除账号" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledOnce());
    expect(signOut).toHaveBeenCalledOnce();
    expect(await screen.findByText("登录页")).toBeInTheDocument();
  });

  it("shows logout only for a permanent account", async () => {
    sessionUser.current = { id: "user-1", is_anonymous: false, email: "owner@example.com" };
    renderProfile();
    expect(await screen.findByTestId("logout-account")).toHaveTextContent("退出登录");
    expect(screen.getByTestId("delete-account")).toHaveTextContent("删除账号");
    expect(screen.queryByTestId("register-keep-record")).not.toBeInTheDocument();
    expect(screen.queryByTestId("clear-trial")).not.toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeVisible();
  });
});
