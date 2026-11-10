import { useEffect, useState } from "react";
import { useLang } from "../LangContext";
import Icon from "./Icon";

export default function Gallery({ onFile, disabled }) {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  useEffect(() => {
    fetch("/examples/index.json")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  if (!items.length) return null;
  const choose = async (it) => {
    const blob = await (await fetch(`/examples/${it.file}`)).blob();
    onFile(new File([blob], it.file, { type: blob.type || "image/jpeg" }));
  };
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#2e4032]">{t("gallery")}</h2>
          <p className="mt-0.5 text-[11px] text-[#899187]">{t("galleryIntro")}</p>
        </div>
        <span className="text-[10px] font-medium text-[#96a08f]">{items.length} {t("samples")}</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {items.map((it) => (
          <button key={it.file} type="button" disabled={disabled} onClick={() => choose(it)} className="group relative overflow-hidden rounded-2xl border border-[#e6ebe2] bg-white text-left shadow-[0_4px_14px_rgba(38,63,38,0.05)] transition active:scale-[0.98]">
            <img src={`/examples/${it.file}`} alt={t(it.title)} className="aspect-[1.05] w-full object-cover transition duration-300 group-hover:scale-105" />
            <span className="flex items-center justify-between gap-1 px-2 py-2 text-[10px] font-medium text-[#556252]">
              <span className="truncate">{t(it.title)}</span>
              <Icon name="arrow" className="h-3 w-3 shrink-0 text-[#67944e]" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
