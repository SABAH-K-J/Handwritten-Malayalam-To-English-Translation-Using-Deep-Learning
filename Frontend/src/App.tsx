import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import { Loader } from "@/components/Loader";
import { Suspense, lazy } from "react";

// Lazy Load Pages for Performance
const Index = lazy(() => import("./pages/Index"));
const Scanner = lazy(() => import("./pages/Scanner"));
const Translation = lazy(() => import("./pages/Translation"));
const LearnMore = lazy(() => import("./pages/LearnMore"));
const ApiDocumentation = lazy(() => import("./pages/ApiDocumentation"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader message="Loading..." size="lg" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="malayalam-ocr-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/translation" element={<Translation />} />
              <Route path="/learn-more" element={<LearnMore />} />
              <Route path="/api-documentation" element={<ApiDocumentation />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
