import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Viewfinder from "../components/Viewfinder";
import ExampleStrip from "../components/ExampleStrip";
import ResultSheet from "../components/ResultSheet";
import DiseaseDetail from "../components/DiseaseDetail";
import { compressImage, errorMessage, predict } from "../services/api";
import { addHistory, thumbnail } from "../services/history";
import { reportDetection } from "../services/risk";
import { useLang } from "../LangContext";

const MODE_KEY = "agrivision.scanMode";
const MODES = [
  { id: "leaf", label: "🍃 Feuille" },
  { id: "fruit", label: "🍎 Fruit / légume" },
];
const readMode = () => {
  try { return localStorage.getItem(MODE_KEY) === "fruit" ? "fruit" : "leaf"; } catch { return "leaf"; }
};

/** Parcours plein écran : caméra → feuille de résultats → détail d'une détection. */
export default function Scan() {
  const { t } = useLang();
  const nav = useNavigate();
  const [stage, setStage] = useState("camera");
  const [sel, setSel] = useState(0);
  const [src, setSrc] = useState(null);
  const [res, setRes] = useState(null);
  const [ms, setMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [conf, setConf] = useState(0.3);
  const [last, setLast] = useState(null);
  const [mode, setModeState] = useState(readMode);
  const touched = useRef(false); // seuil modifié par l'utilisateur ? sinon le modèle fruits garde son seuil calibré

  useEffect(() => () => src && URL.revokeObjectURL(src), [src]);

  const setMode = (m) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
  };
  const onConf = (v) => { touched.current = true; setConf(v); };

  const run = async (file, c = conf, m = mode) => {
    setBusy(true);
    setErr("");
    setLast(file);
    try {
      const small = await compressImage(file);
      const useConf = m === "fruit" && !touched.current ? undefined : c;
      const { data, clientLatencyMs } = await predict(small, { conf: useConf, mode: m });
      setSrc(URL.createObjectURL(small));
      setRes(data);
      setMs(clientLatencyMs);
      setStage("sheet");
      const etiquette = data.detections[0]?.label ?? null;
      addHistory({
        date: Date.now(),
        mode: m,
        thumb: await thumbnail(small),
        top: etiquette,
        confidence: data.detections[0]?.confidence ?? null,
      });
      // Carte des risques : uniquement les feuilles. Un fruit abîmé est un problème de stockage,
      // pas un foyer de maladie dans une parcelle ; le signaler fausserait la carte.
      // Sans attente : le diagnostic ne doit jamais dépendre du GPS.
      if (m === "leaf") reportDetection(etiquette);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {stage === "camera" && (
        <>
          <Viewfinder onFile={(f) => run(f)} onBack={() => nav("/")} disabled={busy}>
            <ExampleStrip onFile={(f) => run(f)} disabled={busy} />
          </Viewfinder>
          <div role="tablist" aria-label="Type d'analyse" className="fixed left-1/2 top-5 z-[55] flex -translate-x-1/2 rounded-full bg-black/45 p-1 text-sm text-white backdrop-blur">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                disabled={busy}
                onClick={() => setMode(m.id)}
                className={`rounded-full px-3 py-1.5 font-semibold transition ${mode === m.id ? "bg-white text-leaf-900" : "text-white/85"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </>
      )}
      {stage === "sheet" && res && <ResultSheet src={src} result={res} onOpen={(i) => (setSel(i), setStage("detail"))} onRetake={() => setStage("camera")} />}
      {stage === "detail" && res && <DiseaseDetail src={src} result={res} index={sel} clientMs={ms} conf={conf} onConf={onConf} onRerun={(c) => last && run(last, c)} onBack={() => setStage("sheet")} />}

      {busy && (
        <div role="status" className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-sm">
          <div className="relative h-40 w-40 overflow-hidden rounded-3xl border-2 border-olive-400">
            <span className="absolute inset-x-0 h-1 animate-scanline bg-olive-400 shadow-[0_0_16px_#9bbd62]" />
          </div>
          <p className="mt-4 animate-pulse font-semibold">{t("loading")}</p>
        </div>
      )}
      {err && (
        <p role="alert" className="fixed inset-x-4 top-20 z-[70] rounded-xl bg-red-50 p-3 text-red-800 shadow-lg" onClick={() => setErr("")}>
          {t("error")} : {err}
        </p>
      )}
    </>
  );
}
