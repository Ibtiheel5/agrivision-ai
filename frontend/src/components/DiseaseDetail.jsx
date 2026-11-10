import { useState } from "react";
import BoundingBoxCanvas from "./BoundingBoxCanvas";
import ProbabilityBars from "./ProbabilityBars";
import ConfBadge from "./ConfBadge";
import Icon from "./Icon";
import { useLang } from "../LangContext";

/** Détail d'une détection : image encadrée, confiance, avertissement, détails techniques repliables. */
export default function DiseaseDetail({ src, result, index, clientMs, conf, onConf, onRerun, onBack, lowConf = 0.5 }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const det = result.detections[index];
  if (!det) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="mx-auto max-w-xl px-4 pb-10 pt-5">
        <button type="button" onClick={onBack} aria-label={t("back")} className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-leaf-50 text-leaf-700">
          <Icon name="back" />
        </button>
        <BoundingBoxCanvas src={src} detections={[det]} imageWidth={result.image_width} imageHeight={result.image_height} />
        <h1 className="mt-4 text-xl font-bold text-leaf-900">{det.label}</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-leaf-700">
          {t("confidence")} <ConfBadge value={det.confidence} />
        </div>
        {det.confidence < lowConf && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">⚠️ {t("low")}</p>}
        <div className="mt-5">
          <ProbabilityBars scores={result.class_scores} detections={result.detections} />
        </div>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-6 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-leaf-500 to-olive-500 px-5 py-4 font-semibold text-white">
          {t("details")}
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-leaf-700">
            <Icon name="chevron" className={`h-4 w-4 transition ${open ? "" : "rotate-180"}`} />
          </span>
        </button>
        {open && (
          <div className="mt-3 space-y-3">
            <dl className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-leaf-50 p-2">
                <dt>{t("latency")} ({t("server")})</dt>
                <dd className="font-mono text-base">{result.server_latency_ms.toFixed(0)} ms</dd>
              </div>
              <div className="rounded-xl bg-leaf-50 p-2">
                <dt>{t("latency")} ({t("client")})</dt>
                <dd className="font-mono text-base">{clientMs} ms</dd>
              </div>
              <div className="rounded-xl bg-leaf-50 p-2">
                <dt>{t("version")}</dt>
                <dd className="font-mono text-base">{result.model_version}</dd>
              </div>
            </dl>
            <label className="block rounded-xl bg-leaf-50 p-3">
              <span className="text-sm font-semibold">
                {t("threshold")} : {conf.toFixed(2)}
              </span>
              <input type="range" min="0.05" max="0.95" step="0.05" value={conf} className="mt-2 w-full accent-leaf-500" onChange={(e) => onConf(+e.target.value)} onPointerUp={() => onRerun(conf)} />
            </label>
          </div>
        )}
        <p className="mt-5 text-xs text-leaf-700">{t("disclaimer")}</p>
      </div>
    </div>
  );
}
