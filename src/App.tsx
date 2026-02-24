import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { I18nProvider } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

const Welcome = lazy(() => import("./pages/Welcome"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Index = lazy(() => import("./pages/Index"));
const Scan = lazy(() => import("./pages/Scan"));
const Audit = lazy(() => import("./pages/Audit"));
const Result = lazy(() => import("./pages/Result"));
const EditIngredients = lazy(() => import("./pages/EditIngredients"));
const History = lazy(() => import("./pages/History"));
const MealDetail = lazy(() => import("./pages/MealDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="h-full flex flex-col">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground">Loading…</div>}>
              <Routes>
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/" element={<Index />} />
                <Route path="/scan" element={<Scan />} />
                <Route path="/audit" element={<Audit />} />
                <Route path="/result" element={<Result />} />
                <Route path="/edit-ingredients" element={<EditIngredients />} />
                <Route path="/history" element={<History />} />
                <Route path="/meal/:id" element={<MealDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <BottomNav />
          </div>
        </BrowserRouter>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;