import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BoundingBoxCanvas from "./BoundingBoxCanvas";
import ResultsPanel from "./ResultsPanel";
import { explain, predict } from "../services/api";

const MAX_WIDTH = 640; // largeur max de l'image envoyée à l'API (limite la latence réseau et le coût du modèle)

export default function WebcamDetector({ threshold }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const runningRef = useRef(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [fps, setFps] = useState(0);

  const stop = useCallback(() => {
    runningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setFps(0);
  }, []);

  useEffect(() => stop, [stop]); // coupe la caméra quand on quitte l'onglet

  const loop = useCallback(async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let last = performance.now();
    let smooth = 0;
    // Une seule requête à la fois : on n'envoie la frame suivante qu'après la réponse (pas d'embouteillage).
    while (runningRef.current) {
      const video = videoRef.current;
      if (!video || !video.videoWidth) {
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.8));
      try {
        const res = await predict(blob);
        if (!runningRef.current) break;
        setResult(res);
        const now = performance.now();
        const inst = 1000 / (now - last);
        last = now;
        smooth = smooth ? smooth * 0.8 + inst * 0.2 : inst;
        setFps(smooth);
      } catch (e) {
        if (runningRef.current) setError(explain(e));
        stop();
        break;
      }
    }
  }, [stop]);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      runningRef.current = true;
      setActive(true);
      loop();
    } catch (e) {
      stop();
      setError(
        e?.name === "NotAllowedError"
          ? "Accès à la caméra refusé. Autorisez-le dans le navigateur."
          : e?.name === "NotFoundError"
            ? "Aucune caméra détectée."
            : `Impossible d'ouvrir la caméra : ${e?.message ?? e}`
      );
    }
  }, [loop, stop]);

  const shown = useMemo(() => (result?.detections ?? []).filter((d) => d.confidence >= threshold), [result, threshold]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {!active ? (
            <button onClick={start} className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">
              Démarrer la webcam
            </button>
          ) : (
            <button onClick={stop} className="rounded-lg bg-soil px-4 py-2 font-semibold text-white hover:opacity-90">
              Arrêter
            </button>
          )}
          <span className="text-sm text-slate-500">
            Détection continue (une image à la fois, redimensionnée à {MAX_WIDTH} px).
          </span>
        </div>

        {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <div className={`relative w-full overflow-hidden rounded-xl border border-line bg-black ${active ? "" : "hidden"}`}>
          <video ref={videoRef} playsInline muted className="block w-full" />
          {result && <BoundingBoxCanvas width={result.image_width} height={result.image_height} detections={shown} />}
        </div>
      </div>

      <ResultsPanel detections={shown} result={result} fps={fps} />
    </div>
  );
}
