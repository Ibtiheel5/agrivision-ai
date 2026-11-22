import Icon from "./Icon";
import ConfBadge from "./ConfBadge";
import useCrops from "./useCrops";
import { useLang } from "../LangContext";
import { confidenceLevel } from "../services/api";

function severity(confidence, t) {
  const level = confidenceLevel(confidence);
  const map = {
    high: { label: t("severityHigh"), cls: "bg-red-100 text-red-800" },
    medium: { label: t("severityMedium"), cls: "bg-amber-100 text-amber-900" },
    low: { label: t("severityLow"), cls: "bg-[#eff7e9] text-[#3d7241]" },
    unknown: { label: t("severityUnknown"), cls: "bg-gray-100 text-gray-700" },
  };
  return map[level] || map.unknown;
}

function Row({ det, crop, big, onClick, t }) {
  const sev = severity(det.confidence, t);
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-[#e6ecdf] bg-white p-3 text-left shadow-sm transition hover:border-[#cfe0c3] active:scale-[0.99]">
      <span className={`shrink-0 overflow-hidden rounded-xl bg-[#f3f7ef] ${big ? "h-16 w-16" : "h-14 w-14"}`}>{crop && <img src={crop} alt="" className="h-full w-full object-cover" />}</span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${big ? "font-semibold text-[#20372a]" : "text-sm text-[#304033]"}`}>{det.label}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <ConfBadge value={det.confidence} />
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.cls}`}>{sev.label}</span>
        </span>
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4b963b] text-white"><Icon name="arrow" className="h-4 w-4" /></span>
    </button>
  );
}

export default function ResultSheet({ src, result, onOpen, onRetake }) {
  const { t } = useLang();
  const crops = useCrops(src, result.detections);
  const [best, ...rest] = result.detections;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end overflow-hidden bg-black">
      <img src={src} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-sm" />
      <div className="absolute inset-0 bg-black/30" />
      <button type="button" onClick={onRetake} aria-label={t("retake")} className="absolute left-4 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
        <Icon name="back" />
      </button>
      <section className="relative max-h-[78vh] animate-slide-up overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-neutral-300" />
        {best ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-bold text-[#20372a]">{t("bestMatch")}</h2>
              <span className="text-xs text-[#768075]">{result.detections.length} d?tection(s)</span>
            </div>
            <Row det={best} crop={crops[0]} big onClick={() => onOpen(0)} t={t} />
            {rest.length > 0 && (
              <>
                <h2 className="mb-2 mt-5 font-bold text-[#20372a]">{t("similar")}</h2>
                <div className="space-y-2">
                  {rest.slice(0, 6).map((d, i) => <Row key={`${d.class_id}-${i}`} det={d} crop={crops[i + 1]} onClick={() => onOpen(i + 1)} t={t} />)}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="rounded-xl bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">{t("noDetection")}</p>
            <p className="mt-1 text-sm">{t("nothing")}</p>
          </div>
        )}
        <button type="button" onClick={onRetake} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl border border-[#dce6d5] text-sm font-semibold text-[#3d7241]">{t("retake")}</button>
      </section>
    </div>
  );
}
