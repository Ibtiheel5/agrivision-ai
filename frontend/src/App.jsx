import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Analyze from "./pages/Analyze";
import Model from "./pages/Model";
import History from "./pages/History";
import Plants from "./pages/Plants";
import PlantDetail from "./pages/PlantDetail";
import Tools from "./pages/Tools";
import Assistant from "./pages/Assistant";
import Library from "./pages/Library";
import LibraryDetail from "./pages/LibraryDetail";
import Weather from "./pages/Weather";
import RiskMap from "./pages/RiskMap";
import Settings from "./pages/Settings";
import PageShell from "./components/PageShell";
import BottomNav from "./components/BottomNav";
import { useLang } from "./LangContext";
import Analyse from "./pages/Analyse";


export default function App() {
  const { t, lang } = useLang();
  const fr = lang === "fr";
  // Titre d'en-tête par page secondaire.
  const titre = {
    assistant: fr ? "Assistant" : "El mousa3ed",
    library: fr ? "Bibliothèque des maladies" : "Maktabet el amradh",
    weather: fr ? "Météo agricole" : "Ta9s el fla7a",
    risk: fr ? "Carte des risques" : "Carte el ma5ater",
    settings: fr ? "Réglages" : "Réglages",
  };

  return (
    <div className="mx-auto min-h-screen max-w-xl bg-canvas" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/history" element={<PageShell title={t("history")}><History /></PageShell>} />
        <Route path="/plants" element={<PageShell title={t("myPlants")}><Plants /></PageShell>} />
        <Route path="/plants/:plantId" element={<PageShell title={t("plantDetail")}><PlantDetail /></PageShell>} />
        <Route path="/tools" element={<PageShell title={t("tools")}><Tools /></PageShell>} />
        <Route path="/model" element={<PageShell title={t("model")}><Model /></PageShell>} />
        <Route path="/advanced" element={<PageShell title={t("live")}><Analyze /></PageShell>} />
        <Route path="/assistant" element={<PageShell title={titre.assistant}><Assistant /></PageShell>} />
        <Route path="/library" element={<PageShell title={titre.library}><Library /></PageShell>} />
        <Route path="/library/:diseaseId" element={<PageShell title={titre.library}><LibraryDetail /></PageShell>} />
        <Route path="/weather" element={<PageShell title={titre.weather}><Weather /></PageShell>} />
        <Route path="/risk-map" element={<PageShell title={titre.risk}><RiskMap /></PageShell>} />
        <Route path="/settings" element={<PageShell title={titre.settings}><Settings /></PageShell>} />
        <Route path="/analyse/:analyseId" element={<PageShell title="Analyse"><Analyse /></PageShell>} />
      </Routes>
      <Routes>
        <Route path="/scan" element={null} />
        <Route path="*" element={<BottomNav />} />
      </Routes>
    </div>
  );
}
