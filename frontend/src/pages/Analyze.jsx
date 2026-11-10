import { useEffect, useState } from "react";
import Dropzone from "../components/Dropzone";
import Gallery from "../components/Gallery";
import WebcamCapture from "../components/WebcamCapture";
import ResultPanel from "../components/ResultPanel";
import Icon from "../components/Icon";
import { compressImage, errorMessage, predict } from "../services/api";
import { addHistory, thumbnail } from "../services/history";
import { useLang } from "../LangContext";

export default function Analyze() {
  const { t } = useLang();
  const [src, setSrc] = useState(null);
  const [res, setRes] = useState(null);
  const [ms, setMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [conf, setConf] = useState(0.3);
  const [last, setLast] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      addHistory({ date: Date.now(), thumb: await thumbnail(small), top: data.detections[0]?.label ?? null, confidence: data.detections[0]?.confidence ?? null });
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex items-start gap-3 rounded-2xl border border-[#e5ecdf] bg-white p-4 shadow-[0_4px_16px_rgba(38,63,38,0.04)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff7e9] text-[#598c40]">
          <Icon name="sparkles" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-[#2c3d30]">{t("liveTitle")}</h2>
          <p className="mt-1 text-xs leading-5 text-[#80897e]">{t("liveIntro")}</p>
        </div>
      </section>

      <Dropzone onFile={run} disabled={busy} />
      <Gallery onFile={run} disabled={busy} />

      <section className="overflow-hidden rounded-2xl border border-[#e8ede3] bg-white shadow-[0_4px_16px_rgba(38,63,38,0.04)]">
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff7e9] text-[#598c40]">
            <Icon name="live" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[#2c3d30]">{t("webcam")}</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-[#899187]">{t("webcamIntro")}</span>
          </span>
          <span className="shrink-0 rounded-full bg-[#f0f3ed] px-2.5 py-1 text-[10px] font-medium text-[#748070]">{t("optional")}</span>
        </div>
        <div className="border-t border-[#f0f2ed] p-3">
          <WebcamCapture onCapture={run} conf={conf} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e8ede3] bg-white shadow-[0_4px_16px_rgba(38,63,38,0.04)]">
        <button type="button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)} className="flex min-h-[58px] w-full items-center gap-3 px-4 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f4e9] text-[#80904e]">
            <Icon name="sliders" className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-[#354536]">{t("threshold")}</span>
            <span className="mt-0.5 block text-[11px] text-[#899187]">{t("thresholdHint")}</span>
          </span>
          <span className="text-sm font-semibold text-[#4d8439]">{conf.toFixed(2)}</span>
          <Icon name="chevronRight" className={`h-4 w-4 text-[#84917f] transition ${settingsOpen ? "rotate-90" : ""}`} />
        </button>
        {settingsOpen && (
          <label className="block border-t border-[#f0f2ed] px-4 pb-4 pt-3">
            <span className="flex justify-between text-[10px] text-[#8b9388]">
              <span>{t("moreDetections")}</span>
              <span>{t("fewerDetections")}</span>
            </span>
            <input
              type="range"
              min="0.05"
              max="0.95"
              step="0.05"
              value={conf}
              className="mt-2 w-full accent-[#4b963b]"
              onChange={(event) => setConf(+event.target.value)}
              onPointerUp={() => last && run(last, conf)}
              onKeyUp={() => last && run(last, conf)}
            />
          </label>
        )}
      </section>

      {busy && (
        <div role="status" className="flex items-center gap-3 rounded-2xl bg-[#eaf4e3] p-4 text-sm font-medium text-[#35693a]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#b7d5a5] border-t-[#4b963b]" />
          {t("loading")}
        </div>
      )}
      {err && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">{t("error")} : {err}</p>}
      {res && src && <ResultPanel src={src} result={res} clientMs={ms} />}
    </div>
  );
}
