import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Firmalar from "./pages/Firmalar";
import Hesabim from "./pages/Hesabim";
import FirmaPanel from "./pages/FirmaPanel";
import FirmaGiris from "./pages/FirmaGiris";
import FirmaLeadler from "./pages/FirmaLeadler";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/firmalar" element={<Firmalar />} />
          <Route path="/hesabim" element={<Hesabim />} />
          <Route path="/firma/panel" element={<FirmaPanel />} />
          <Route path="/firma/leadler" element={<FirmaLeadler />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
