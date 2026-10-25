import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";

function renderDoc(node: ReactNode) {
  return render(
    <I18nProvider>
      <MemoryRouter>{node}</MemoryRouter>
    </I18nProvider>,
  );
}

describe("saved language", () => {
  it("shows English privacy and terms when that choice is saved", () => {
    localStorage.setItem("kankan-locale", "en-US");
    const { unmount } = renderDoc(<Privacy />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    unmount();
    renderDoc(<Terms />);
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument();
  });
});
