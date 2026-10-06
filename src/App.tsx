import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { canonicalPath } from "@/lib/routes";
import { Suspense, type ReactNode } from "react";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { useGuestClaimRecovery } from "@/hooks/useGuestClaimRecovery";
import { useVerifiedUpgradeHandoff } from "@/hooks/useVerifiedUpgradeHandoff";
import BottomNav from "@/components/BottomNav";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const Index = lazyWithRetry(() => import("./pages/Index"));
const Scan = lazyWithRetry(() => import("./pages/Scan"));
const Result = lazyWithRetry(() => import("./pages/Result"));
const EditIngredients = lazyWithRetry(() => import("./pages/EditIngredients"));
const History = lazyWithRetry(() => import("./pages/History"));
const MealDetail = lazyWithRetry(() => import("./pages/MealDetail"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function GuestUpgradeWatcher() {
  useVerifiedUpgradeHandoff();
  return null;
}

function ClaimRetryBar() {
  const { t } = useI18n();
  const { needsRetry, pending, retry } = useGuestClaimRecovery();
  if (!needsRetry) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2">
      <p className="text-sm text-card-foreground">{t.guestClaimPending}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => void retry()}
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {t.guestClaimRetry}
      </button>
    </div>
  );
}

function Page({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">{t.loadingText}</div>}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="h-full bg-muted">
            <div className="mx-auto flex h-full w-full flex-col bg-background sm:max-w-[560px] sm:shadow-card lg:max-w-[640px]">
            <ClaimRetryBar />
            <GuestUpgradeWatcher />
            <Routes>
              <Route path="/onboarding" element={<Page><Onboarding /></Page>} />
              <Route path="/" element={<Page><Index /></Page>} />
              <Route path="/scan" element={<Page><Scan /></Page>} />
              <Route path="/audit" element={<Navigate to="/" replace />} />
              <Route path="/result" element={<Page><Result /></Page>} />
              <Route path="/edit-ingredients" element={<Page><EditIngredients /></Page>} />
              <Route path="/history" element={<Page><History /></Page>} />
              <Route path="/record" element={<Navigate to={canonicalPath("/record")} replace />} />
              <Route path="/meal/:id" element={<Page><MealDetail /></Page>} />
              <Route path="/profile" element={<Page><Profile /></Page>} />
              <Route path="/login" element={<Page><Login /></Page>} />
              <Route path="/reset-password" element={<Page><ResetPassword /></Page>} />
              <Route path="/privacy" element={<Page><Privacy /></Page>} />
              <Route path="/terms" element={<Page><Terms /></Page>} />
              <Route path="*" element={<Page><NotFound /></Page>} />
            </Routes>
            <BottomNav />
            </div>
          </div>
        </BrowserRouter>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
