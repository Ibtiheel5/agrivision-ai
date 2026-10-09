import { useEffect, useState } from "react";
import ImageDetector from "./components/ImageDetector";
import ModelPage from "./components/ModelPage";
import ThresholdSlider from "./components/ThresholdSlider";
import WebcamDetector from "./components/WebcamDetector";
import { getHealth } from "./services/api";

const TABS = [
  ["image", "Image"],
  ["webcam", "Webcam"],
  ["model", "Modèle"],
];

function HealthBadge({ health }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-800",
    degraded: "bg-amber-100 text-amber-900",
    offline: "bg-red-100 text-red-800",
  };
  const label = !health
    ? "Connexion…"
    : health.status === "ok"
      ? `API en ligne · ${health.model_version ?? ""}${health.gpu ? " · GPU" : " · CPU"}`
      : health.status === "degraded"
        ? "API en ligne, modèle non chargé"
        : "API hors ligne";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[health?.status] ?? "bg-slate-100 text-slate-600"}`}>{label}</span>;
}

export default function App() {
  const [tab, setTab] = useState("image");
  const [threshold, setThreshold] = useState(0.25);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let alive = true;
    const poll = () =>
      getHealth()
        .then((h) => alive && setHealth(h))
        .catch(() => alive && setHealth({ status: "offline" }));
    poll();
    const id = setInterval(poll, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b-4 border-brand bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-brand">AgriVision AI Lite</h1>
            <p className="text-sm text-slate-500">Détection de maladies foliaires en temps réel</p>
          </div>
          <HealthBadge health={health} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-6">
        <nav className="flex gap-2">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === id ? "bg-brand text-white" : "bg-white text-slate-700 hover:bg-emerald-50"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab !== "model" && <ThresholdSlider value={threshold} onChange={setThreshold} />}

        {tab === "image" && <ImageDetector threshold={threshold} />}
        {tab === "webcam" && <WebcamDetector threshold={threshold} />}
        {tab === "model" && <ModelPage />}
      </main>
    </div>
  );
}
