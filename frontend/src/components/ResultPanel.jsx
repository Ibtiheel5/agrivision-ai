import { useState } from "react";
import BoundingBoxCanvas from "./BoundingBoxCanvas";
import ProbabilityBars from "./ProbabilityBars";
import Icon from "./Icon";
import { useLang } from "../LangContext";

export default function ResultPanel({ src, result, clientMs, lowConf = 0.5 }) {
  const { t } = useLang();
  const [view, setView] = useState("annotated");
  const top = result.detections[0];
  return (
    <section className="space-y-4 rounded-2xl border border-[#e8ede3] bg-white p-4 shadow-[0_6px_24px_rgba(38,63,38,0.06)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff7e9] text-[#598c40]">
          <Icon name="sparkles" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-[#2c3d30]">{t("results")}</h2>
          <p className="text-[11px] text-[#899187]">{t("resultSubtitle")}</p>
        </div>
      </div>
      <div role="tablist" className="flex gap-2">
        {["original", "annotated"].map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${view === v ? "bg-[#246841] text-white" : "bg-[#f1f5ed] text-[#52734c]"}`}>
            {t(v)}
          </button>
        ))}
      </div>
      <BoundingBoxCanvas src={src} detections={view === "annotated" ? result.detections : []} imageWidth={result.image_width} imageHeight={result.image_height} />
      {top ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a9387]">{t("bestMatch")}</p>
              <p className="mt-1 truncate text-sm font-semibold text-[#304033]">{top.label.replace(/[_/]+/g, " ")}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#eff7e9] px-3 py-1.5 text-xs font-semibold text-[#4f8a38]">{(top.confidence * 100).toFixed(1)}%</span>
          </div>
          {top.confidence < lowConf && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">⚠️ {t("low")}</p>}
          <ProbabilityBars scores={result.class_scores} detections={result.detections} />
        </>
      ) : (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t("nothing")}</p>
      )}
      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-[#f3f6f0] p-2 text-[10px] text-[#778273]">
          <dt>{t("latency")} ({t("server")})</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-[#314233]">{result.server_latency_ms.toFixed(0)} ms</dd>
        </div>
        <div className="rounded-xl bg-[#f3f6f0] p-2 text-[10px] text-[#778273]">
          <dt>{t("latency")} ({t("client")})</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-[#314233]">{clientMs} ms</dd>
        </div>
        <div className="rounded-xl bg-[#f3f6f0] p-2 text-[10px] text-[#778273]">
          <dt>{t("version")}</dt>
          <dd className="mt-1 truncate font-mono text-xs font-semibold text-[#314233]">{result.model_version}</dd>
        </div>
      </dl>
      <p className="text-[10px] leading-4 text-[#899187]">{t("disclaimer")}</p>
    </section>
  );
}
