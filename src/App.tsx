import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { canonicalPath } from "@/lib/routes";
import { Suspense, type ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const Index = lazyWithRetry(() => import("./pages/Index"));
const Scan = lazyWithRetry(() => import("./pages/Scan"));
const Audit = lazyWithRetry(() => import("./pages/Audit"));
const Result = lazyWithRetry(() => import("./pages/Result"));
const EditIngredients = lazyWithRetry(() => import("./pages/EditIngredients"));
const History = lazyWithRetry(() => import("./pages/History"));
const MealDetail = lazyWithRetry(() => import("./pages/MealDetail"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function Page({ children }: { children: ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">加载中…</div>}>
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
          <div className="h-full flex flex-col">
            <Routes>
              <Route path="/onboarding" element={<Page><Onboarding /></Page>} />
              <Route path="/" element={<Page><Index /></Page>} />
              <Route path="/scan" element={<Page><Scan /></Page>} />
              <Route path="/audit" element={<Page><Audit /></Page>} />
              <Route path="/result" element={<Page><Result /></Page>} />
              <Route path="/edit-ingredients" element={<Page><EditIngredients /></Page>} />
              <Route path="/history" element={<Page><History /></Page>} />
              <Route path="/record" element={<Navigate to={canonicalPath("/record")} replace />} />
              <Route path="/meal/:id" element={<Page><MealDetail /></Page>} />
              <Route path="/profile" element={<Page><Profile /></Page>} />
              <Route path="/login" element={<Page><Login /></Page>} />
              <Route path="/reset-password" element={<Page><ResetPassword /></Page>} />
              <Route path="/privacy" element={<Page><Privacy /></Page>} />
              <Route path="*" element={<Page><NotFound /></Page>} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
