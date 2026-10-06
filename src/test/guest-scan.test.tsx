import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { GUEST_FREE_LIMIT } from "@/lib/guestQuota";
import Login from "@/pages/Login";
import Scan from "@/pages/Scan";

const { getSession, signInAnonymously, invoke } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      signInAnonymously: () => signInAnonymously(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      updateUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    functions: {
      invoke: (...args: unknown[]) => invoke(...args),
    },
  },
}));

const image = `data:image/jpeg;base64,${btoa("A".repeat(8))}`;

function renderScan() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[{ pathname: "/scan", state: { images: [image] } }]}>
        <Routes>
          <Route path="/scan" element={<Scan />} />
          <Route path="/login" element={<Login />} />
          <Route path="/result" element={<div>结果页</div>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("guest scan limit", () => {
  beforeEach(() => {
    localStorage.setItem("kankan_ai_consent_version", "2026-10-06");
    localStorage.removeItem("kankan_ai_consent");
    getSession.mockResolvedValue({ data: { session: null } });
    signInAnonymously.mockResolvedValue({
      data: { session: { user: { id: "anon-user", is_anonymous: true } } },
      error: null,
    });
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: new Response(JSON.stringify({
          error: "本次免费体验已用完，注册后继续记录",
          code: GUEST_FREE_LIMIT,
        }), { status: 403 }),
      },
    });
  });

  it("shows the free-try prompt and opens registration for the same anonymous user", async () => {
    renderScan();
    expect(await screen.findByText("本次免费体验已用完，注册后继续记录", {}, { timeout: 4000 })).toBeVisible();
    expect(signInAnonymously).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "注册" }));
    expect(await screen.findByRole("button", { name: "发送验证邮件" })).toBeVisible();
    expect(screen.queryByLabelText("密码")).not.toBeInTheDocument();
    expect(screen.getByText("本次免费体验已用完，注册后继续记录")).toBeVisible();
    expect(screen.queryByText("结果页")).not.toBeInTheDocument();
  });
});
