import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BoundingBoxCanvas from "./BoundingBoxCanvas";
import ResultsPanel from "./ResultsPanel";
import { explain, predict } from "../services/api";

/** Galerie d'exemples : met des images dans public/examples/ et liste-les dans public/examples/index.json */
function Gallery({ onPick, disabled }) {
  const [files, setFiles] = useState([]);
  useEffect(() => {
    fetch("/examples/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => Array.isArray(list) && setFiles(list))
      .catch(() => {});
  }, []);
  if (files.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-soil">Exemples en un clic</h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {files.map((name) => (
          <button
            key={name}
            disabled={disabled}
            onClick={async () => {
              const blob = await (await fetch(`/examples/${name}`)).blob();
              onPick(new File([blob], name, { type: blob.type || "image/jpeg" }));
            }}
            className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-white hover:ring-2 hover:ring-brand disabled:opacity-50"
          >
            <img src={`/examples/${name}`} alt={name} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ImageDetector({ threshold }) {
  const [url, setUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  const run = useCallback(async (file) => {
    if (!file?.type?.startsWith("image/")) {
      setError("Veuillez choisir un fichier image (JPEG, PNG…).");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    setUrl(URL.createObjectURL(file));
    try {
      setResult(await predict(file));
    } catch (e) {
      setError(explain(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const shown = useMemo(() => (result?.detections ?? []).filter((d) => d.confidence >= threshold), [result, threshold]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            run(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
            drag ? "border-brand bg-emerald-50" : "border-line bg-white hover:border-brand"
          }`}
        >
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => run(e.target.files?.[0])} />
          <p className="font-semibold">Glissez une photo de feuille ici</p>
          <p className="text-sm text-slate-500">ou cliquez pour choisir un fichier (JPEG, PNG)</p>
        </div>

        <Gallery onPick={run} disabled={loading} />

        {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        {url && (
          <div className="relative inline-block max-w-full overflow-hidden rounded-xl border border-line bg-black/5">
            <img src={url} alt="Image analysée" className="block max-h-[70vh] max-w-full" />
            {result && <BoundingBoxCanvas width={result.image_width} height={result.image_height} detections={shown} />}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-semibold text-brand">
                Analyse en cours…
              </div>
            )}
          </div>
        )}
      </div>

      <ResultsPanel detections={shown} result={result} />
    </div>
  );
}
