import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Viewfinder from "../components/Viewfinder";
import ExampleStrip from "../components/ExampleStrip";
import ResultSheet from "../components/ResultSheet";
import DiseaseDetail from "../components/DiseaseDetail";
import { compressImage, errorMessage, predict } from "../services/api";
import { addHistory, thumbnail } from "../services/history";
import { useLang } from "../LangContext";

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

  useEffect(() => () => src && URL.revokeObjectURL(src), [src]);

  const run = async (file, c = conf) => {
    setBusy(true);
    setErr("");
    setLast(file);
    try {
      const small = await compressImage(file);
      const { data, clientLatencyMs } = await predict(small, { conf: c });
      setSrc(URL.createObjectURL(small));
      setRes(data);
      setMs(clientLatencyMs);
      setStage("sheet");
      addHistory({ date: Date.now(), thumb: await thumbnail(small), top: data.detections[0]?.label ?? null, confidence: data.detections[0]?.confidence ?? null });
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {stage === "camera" && (
        <Viewfinder onFile={run} onBack={() => nav("/")} disabled={busy}>
          <ExampleStrip onFile={run} disabled={busy} />
        </Viewfinder>
      )}
      {stage === "sheet" && res && <ResultSheet src={src} result={res} onOpen={(i) => (setSel(i), setStage("detail"))} onRetake={() => setStage("camera")} />}
      {stage === "detail" && res && <DiseaseDetail src={src} result={res} index={sel} clientMs={ms} conf={conf} onConf={setConf} onRerun={(c) => last && run(last, c)} onBack={() => setStage("sheet")} />}

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
