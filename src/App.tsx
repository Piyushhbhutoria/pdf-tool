import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Merge from "./pages/Merge";
import Split from "./pages/Split";
import Rearrange from "./pages/Rearrange";
import Compress from "./pages/Compress";

const routerBasename =
  import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

const App = () => (
  <TooltipProvider>
    <Sonner />
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/merge" element={<Merge />} />
        <Route path="/split" element={<Split />} />
        <Route path="/rearrange" element={<Rearrange />} />
        <Route path="/compress" element={<Compress />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
