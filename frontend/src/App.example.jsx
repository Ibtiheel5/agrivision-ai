// Exemple de routes à fusionner dans TON App.jsx (main.jsx doit envelopper <App/> dans <BrowserRouter>).
import { Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";
import DetectPage from "./pages/DetectPage";
import AdvicePage from "./pages/AdvicePage";
import RiskMapPage from "./pages/RiskMapPage";
import HistoryPage from "./pages/HistoryPage";
import WeatherPage from "./pages/WeatherPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="detect" element={<DetectPage />} />
        <Route path="advice/:id" element={<AdvicePage />} />
        <Route path="map" element={<RiskMapPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="weather" element={<WeatherPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* Garde ici tes pages existantes, ex. <Route path="model" element={<ModelPage />} /> */}
      </Route>
    </Routes>
  );
}
