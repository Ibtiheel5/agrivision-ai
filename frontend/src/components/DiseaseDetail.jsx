import { useEffect, useMemo, useState } from "react";
import BoundingBoxCanvas from "./BoundingBoxCanvas";
import ProbabilityBars from "./ProbabilityBars";
import ConfBadge from "./ConfBadge";
import Icon from "./Icon";
import { useLang } from "../LangContext";
import { getDiseaseInfo, isHealthyLabel } from "../lib/diseaseInfo";
import { loadHistory, updateHistory } from "../services/history";

function speak(text, lang) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "fr" ? "fr-FR" : "ar-TN";
  window.speechSynthesis.speak(u);
}

export default function DiseaseDetail({ src, result, index, clientMs, conf, onConf, onRerun, onBack, lowConf = 0.5 }) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const det = result.detections[index];
  const [feedback, setFeedback] = useState(null);
  const historyItem = useMemo(() => loadHistory().find((h) => h.top === det?.label && Math.abs((h.confidence ?? 0) - (det?.confidence ?? 0)) < 0.0001), [det]);

  useEffect(() => { setFeedback(historyItem?.feedback ?? null); }, [historyItem]);

  if (!det) return null;
  const info = getDiseaseInfo(det.label);
  const healthy = isHealthyLabel(det.label);
  const severity = det.confidence >= 0.75 ? "high" : det.confidence >= 0.5 ? "medium" : "low";
  const sevMap = { high: t("severityHigh"), medium: t("severityMedium"), low: t("severityLow") };

  const saveFeedback = (value) => {
    setFeedback(value);
    if (historyItem) updateHistory(historyItem.date, { feedback: value });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f7f8f3]">
      <div className="mx-auto max-w-xl px-4 pb-10 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label={t("back")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#3d7241] shadow-sm"><Icon name="back" /></button>
          <button type="button" onClick={() => speak(`${det.label}. ${Math.round(det.confidence * 100)} pour cent.`, lang)} className="flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-[#3d7241] shadow-sm">
            <Icon name="mic" className="h-4 w-4" />{t("voiceRead")}
          </button>
        </div>

        <BoundingBoxCanvas src={src} detections={[det]} imageWidth={result.image_width} imageHeight={result.image_height} />

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm border border-[#edf0e9]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7d9745]">{healthy ? t("healthy") : t("bestMatch")}</p>
              <h1 className="mt-1 text-xl font-bold text-[#20372a]">{det.label}</h1>
            </div>
            <div className="text-right">
              <ConfBadge value={det.confidence} />
              <p className={`mt-2 rounded-full px-2 py-1 text-[10px] font-semibold ${severity === "high" ? "bg-red-100 text-red-800" : severity === "medium" ? "bg-amber-100 text-amber-900" : "bg-[#eff7e9] text-[#3d7241]"}`}>{sevMap[severity]}</p>
            </div>
          </div>

          {det.confidence < lowConf && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t("low")}</p>}
          {healthy ? <p className="mt-3 rounded-xl bg-[#eff7e9] p-3 text-sm text-[#35693a]">{t("healthyMsg")}</p> : null}
        </div>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm border border-[#edf0e9]">
          <h2 className="font-semibold text-[#20372a]">{t("diseaseInfo")}</h2>
          <div className="mt-3 space-y-3 text-sm text-[#556252]">
            <div><h3 className="font-semibold text-[#314233]">{t("symptoms")}</h3><ul className="mt-1 list-disc pl-5 space-y-1">{info.symptoms.map((s) => <li key={s}>{s}</li>)}</ul></div>
            <div><h3 className="font-semibold text-[#314233]">{t("actions")}</h3><ul className="mt-1 list-disc pl-5 space-y-1">{info.actions.map((s) => <li key={s}>{s}</li>)}</ul></div>
            <div><h3 className="font-semibold text-[#314233]">{t("prevention")}</h3><ul className="mt-1 list-disc pl-5 space-y-1">{info.prevention.map((s) => <li key={s}>{s}</li>)}</ul></div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm border border-[#edf0e9]">
          <h2 className="text-sm font-semibold text-[#20372a]">{t("feedbackTitle")}</h2>
          <div className="mt-3 flex gap-2">
            {["yes","no"].map((v) => (
              <button key={v} type="button" onClick={() => saveFeedback(v)} className={`min-h-11 flex-1 rounded-xl text-sm font-semibold ${feedback===v ? "bg-[#4b963b] text-white" : "bg-[#f3f7ef] text-[#3d7241]"}`}>
                {v === "yes" ? t("feedbackYes") : t("feedbackNo")}
              </button>
            ))}
          </div>
          {feedback && <p className="mt-2 text-xs text-[#768075]">{t("feedbackSaved")}</p>}
        </section>

        <div className="mt-4">
          <ProbabilityBars scores={result.class_scores} detections={result.detections} />
        </div>

        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-6 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#2b6a4d] to-[#7fa04f] px-5 py-4 font-semibold text-white">
          {t("details")}
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[#2b6a4d]"><Icon name="chevron" className={`h-4 w-4 transition ${open ? "" : "rotate-180"}`} /></span>
        </button>
        {open && (
          <div className="mt-3 space-y-3 rounded-2xl bg-white p-4 shadow-sm border border-[#edf0e9]">
            <dl className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-[#f3f7ef] p-2"><dt>{t("latency")} ({t("server")})</dt><dd className="font-mono text-base">{result.server_latency_ms.toFixed(0)} ms</dd></div>
              <div className="rounded-xl bg-[#f3f7ef] p-2"><dt>{t("latency")} ({t("client")})</dt><dd className="font-mono text-base">{clientMs} ms</dd></div>
              <div className="rounded-xl bg-[#f3f7ef] p-2"><dt>{t("version")}</dt><dd className="font-mono text-base">{result.model_version}</dd></div>
            </dl>
            <label className="block rounded-xl bg-[#f3f7ef] p-3">
              <span className="text-sm font-semibold">{t("threshold")} : {conf.toFixed(2)}</span>
              <input type="range" min="0.05" max="0.95" step="0.05" value={conf} className="mt-2 w-full accent-[#4b963b]" onChange={(e) => onConf(+e.target.value)} onPointerUp={() => onRerun(conf)} />
            </label>
          </div>
        )}
        <p className="mt-5 text-xs text-[#768075]">{t("disclaimer")}</p>
      </div>
    </div>
  );
}
