import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Analyze from "./pages/Analyze";
import Model from "./pages/Model";
import History from "./pages/History";
import Plants from "./pages/Plants";
import PlantDetail from "./pages/PlantDetail";
import Tools from "./pages/Tools";
import PageShell from "./components/PageShell";
import BottomNav from "./components/BottomNav";
import VoiceAssistant from "./components/VoiceAssistant";
import { useLang } from "./LangContext";

export default function App() {
  const { t } = useLang();
  return (
    <div className="mx-auto min-h-screen max-w-xl overflow-x-hidden bg-[#f7f8f3] sm:my-4 sm:min-h-[calc(100vh-2rem)] sm:overflow-hidden sm:rounded-[2rem] sm:border sm:border-white/70 sm:shadow-[0_24px_70px_rgba(30,67,39,0.16)]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/history" element={<PageShell title={t("history")}><History /></PageShell>} />
        <Route path="/plants" element={<PageShell title={t("myPlants")}><Plants /></PageShell>} />
        <Route path="/plants/:plantId" element={<PageShell title={t("plantDetail")}><PlantDetail /></PageShell>} />
        <Route path="/tools" element={<PageShell title={t("tools")}><Tools /></PageShell>} />
        <Route path="/model" element={<PageShell title={t("model")}><Model /></PageShell>} />
        <Route path="/advanced" element={<PageShell title={t("live")}><Analyze /></PageShell>} />
      </Routes>
      <Routes>
        <Route path="/scan" element={null} />
        <Route path="*" element={<BottomNav />} />
      </Routes>
      <VoiceAssistant />
    </div>
  );
}
