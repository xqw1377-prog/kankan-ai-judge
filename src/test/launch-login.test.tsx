import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { markPasswordSetupPending } from "@/lib/anonymousUpgrade";
import Login from "@/pages/Login";

const { getSession, updateUser, signUp } = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateUser: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      updateUser: (...args: unknown[]) => updateUser(...args),
      signUp: (...args: unknown[]) => signUp(...args),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

function renderLogin(state?: { upgrade?: boolean }) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>首页</div>} />
          <Route path="/terms" element={<div>协议页</div>} />
          <Route path="/privacy" element={<div>隐私页</div>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("login upgrade and legal links", () => {
  beforeEach(() => {
    localStorage.clear();
    updateUser.mockReset();
    signUp.mockReset();
    getSession.mockResolvedValue({ data: { session: { user: { id: "anon-1", is_anonymous: true } } } });
  });

  it("asks an anonymous user for an email only, then a password after verification", async () => {
    updateUser.mockResolvedValue({ data: { user: { id: "anon-1", is_anonymous: true } }, error: null });
    renderLogin({ upgrade: true });
    expect(screen.queryByLabelText("密码")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "guest@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "发送验证邮件" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledOnce());
    expect(updateUser).toHaveBeenCalledWith(
      { email: "guest@example.com" },
      { emailRedirectTo: `${window.location.origin}/login` },
    );
    expect(signUp).not.toHaveBeenCalled();
    expect(localStorage.getItem("kankan_upgrade_password_setup")).toBe(JSON.stringify({ userId: "anon-1" }));

    markPasswordSetupPending("anon-1");
    getSession.mockResolvedValue({ data: { session: { user: { id: "anon-1", is_anonymous: false } } } });
    updateUser.mockReset();
    updateUser.mockResolvedValue({ data: { user: { id: "anon-1", is_anonymous: false } }, error: null });
    renderLogin();
    expect(await screen.findByRole("button", { name: "设置密码" })).toBeVisible();
    fireEvent.change(screen.getAllByLabelText("密码").at(-1)!, { target: { value: "secret12" } });
    fireEvent.click(screen.getAllByRole("button", { name: "设置密码" }).at(-1)!);
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "secret12" }));
    expect(JSON.stringify(localStorage)).not.toContain("secret12");
    expect(await screen.findByText("首页")).toBeInTheDocument();
  });

  it("links terms and privacy from the sign-in page", () => {
    getSession.mockResolvedValue({ data: { session: null } });
    renderLogin();
    fireEvent.click(screen.getByRole("link", { name: "《用户协议》" }));
    expect(screen.getByText("协议页")).toBeInTheDocument();
  });
});
