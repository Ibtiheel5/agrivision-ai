import Icon from "./Icon";
import ConfBadge from "./ConfBadge";
import useCrops from "./useCrops";
import { useLang } from "../LangContext";

function Row({ det, crop, big, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-leaf-500/15 bg-white p-3 text-left shadow-sm active:scale-[0.99]">
      <span className={`shrink-0 overflow-hidden rounded-xl bg-leaf-50 ${big ? "h-16 w-16" : "h-14 w-14"}`}>{crop && <img src={crop} alt="" className="h-full w-full object-cover" />}</span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${big ? "font-semibold text-leaf-900" : "text-sm text-leaf-900/80"}`}>{det.label}</span>
        <ConfBadge value={det.confidence} />
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-olive-500 text-white">
        <Icon name="arrow" className="h-4 w-4" />
      </span>
    </button>
  );
}

/** Feuille du bas façon maquette : « Meilleur résultat » + « Autres détections ». */
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
            <h2 className="mb-2 font-bold text-leaf-900">{t("bestMatch")}</h2>
            <Row det={best} crop={crops[0]} big onClick={() => onOpen(0)} />
            {rest.length > 0 && (
              <>
                <h2 className="mb-2 mt-5 font-bold text-leaf-900">{t("similar")}</h2>
                <div className="space-y-2">
                  {rest.slice(0, 6).map((d, i) => (
                    <Row key={`${d.class_id}-${i}`} det={d} crop={crops[i + 1]} onClick={() => onOpen(i + 1)} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <p className="rounded-xl bg-amber-50 p-3 text-amber-900">{t("nothing")}</p>
        )}
        <button type="button" onClick={onRetake} className="btn btn-ghost mt-5 w-full">
          {t("retake")}
        </button>
      </section>
    </div>
  );
}
