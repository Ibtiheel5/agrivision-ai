import { useEffect, useState } from "react";
import { useLang } from "../LangContext";

/** Petites vignettes d'exemples (public/examples) pour tester sans photo. */
export default function ExampleStrip({ onFile, disabled }) {
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
    <div className="flex justify-center gap-3 px-6">
      {items.map((it) => (
        <button key={it.file} type="button" disabled={disabled} onClick={() => choose(it)} className="h-12 w-12 overflow-hidden rounded-lg border-2 border-[#dcebd4] active:scale-95">
          <img src={`/examples/${it.file}`} alt={t(it.title)} className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}
