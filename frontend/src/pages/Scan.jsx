import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Viewfinder from "../components/Viewfinder";
import ExampleStrip from "../components/ExampleStrip";
import ResultSheet from "../components/ResultSheet";
import DiseaseDetail from "../components/DiseaseDetail";
import { compressImage, errorMessage, predict } from "../services/api";
import { addHistory, thumbnail } from "../services/history";
import { loadPlants } from "../services/plants";
import { useLang } from "../LangContext";

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
  const [plantId, setPlantId] = useState("");
  const plants = loadPlants();

  useEffect(() => () => src && URL.revokeObjectURL(src), [src]);

  const run = async (file, c = conf) => {
    setBusy(true);
    setErr("");
    setLast(file);
    try {
      const small = await compressImage(file);
      const { data, clientLatencyMs } = await predict(small, { conf: c });
      const nextSrc = URL.createObjectURL(small);
      setSrc((old) => { if (old) URL.revokeObjectURL(old); return nextSrc; });
      setRes(data);
      setMs(clientLatencyMs);
      setStage("sheet");
      const selectedPlant = plants.find((p) => p.id === plantId);
      addHistory({
        date: Date.now(),
        thumb: await thumbnail(small),
        top: data.detections[0]?.label ?? null,
        confidence: data.detections[0]?.confidence ?? null,
        detections: data.detections.map((d) => ({ label: d.label, confidence: d.confidence })),
        plantId: selectedPlant?.id ?? null,
        plantName: selectedPlant?.name ?? null,
      });
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
          <div className="px-4 pb-2">
            <label className="flex items-center gap-2 rounded-xl bg-[#f3f7ef] px-3 py-2 text-xs text-[#54704c]">
              <span className="shrink-0 font-medium">{t("attachPlant")}</span>
              <select value={plantId} onChange={(e) => setPlantId(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none">
                <option value="">{t("noPlant")}</option>
                {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <ExampleStrip onFile={run} disabled={busy} />
        </Viewfinder>
      )}
      {stage === "sheet" && res && <ResultSheet src={src} result={res} onOpen={(i) => (setSel(i), setStage("detail"))} onRetake={() => setStage("camera")} />}
      {stage === "detail" && res && <DiseaseDetail src={src} result={res} index={sel} clientMs={ms} conf={conf} onConf={setConf} onRerun={(c) => last && run(last, c)} onBack={() => setStage("sheet")} />}

      {busy && (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-sm">
          <div className="relative h-40 w-40 overflow-hidden rounded-3xl border-2 border-[#9bbd62]">
            <span className="absolute inset-x-0 h-1 animate-scanline bg-[#9bbd62] shadow-[0_0_16px_#9bbd62]" />
          </div>
          <p className="mt-4 animate-pulse font-semibold">{t("loading")}</p>
        </div>
      )}
      {err && (
        <div role="alert" className="fixed inset-x-4 top-20 z-[70] rounded-xl bg-red-50 p-3 text-red-800 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <p>{t("error")}: {err}</p>
            <button type="button" onClick={() => setErr("")} className="shrink-0 text-xs font-semibold">OK</button>
          </div>
          {last && <button type="button" onClick={() => run(last, conf)} className="mt-2 text-xs font-semibold underline">R?essayer</button>}
        </div>
      )}
    </>
  );
}
