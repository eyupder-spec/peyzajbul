import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Firmalar from "./pages/Firmalar";
import FirmaDetay from "./pages/FirmaDetay";
import Iller from "./pages/Iller";
import IlFirmalari from "./pages/IlFirmalari";
import Hesabim from "./pages/Hesabim";
import FirmaPanel from "./pages/FirmaPanel";
import FirmaGiris from "./pages/FirmaGiris";
import FirmaLeadler from "./pages/FirmaLeadler";
import FirmaJeton from "./pages/FirmaJeton";
import AdminGiris from "./pages/AdminGiris";
import AdminPanel from "./pages/AdminPanel";
import Kategoriler from "./pages/Kategoriler";
import KategoriDetay from "./pages/KategoriDetay";
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
          <Route path="/firma/:slug" element={<FirmaDetay />} />
          <Route path="/kategoriler" element={<Kategoriler />} />
          <Route path="/kategoriler/:slug" element={<KategoriDetay />} />
          <Route path="/iller" element={<Iller />} />
          <Route path="/iller/:slug" element={<IlFirmalari />} />
          <Route path="/hesabim" element={<Hesabim />} />
          <Route path="/firma/giris" element={<FirmaGiris />} />
          <Route path="/firma/panel" element={<FirmaPanel />} />
          <Route path="/firma/leadler" element={<FirmaLeadler />} />
          <Route path="/firma/jeton" element={<FirmaJeton />} />
          <Route path="/admin/giris" element={<AdminGiris />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
