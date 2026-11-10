import { useCallback, useEffect, useRef, useState } from "react";
import { compressImage, predict, errorMessage } from "../services/api";
import { colorFor } from "../colors";
import { useLang } from "../LangContext";
import Icon from "./Icon";

/** Webcam : capture unique ou détection continue (boucle séquentielle, FPS affiché). */
export default function WebcamCapture({ onCapture, conf }) {
  const { t } = useLang();
  const video = useRef(null);
  const overlay = useRef(null);
  const cameraInput = useRef(null);
  const galleryInput = useRef(null);
  const stream = useRef(null);
  const running = useRef(false);
  const [on, setOn] = useState(false);
  const [live, setLive] = useState(false);
  const [fps, setFps] = useState(0);
  const [msg, setMsg] = useState("");
  const [liveUnavailable, setLiveUnavailable] = useState(false);
  const supported = typeof window !== "undefined"
    && window.isSecureContext
    && typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia);

  const stop = useCallback(() => {
    running.current = false;
    setLive(false);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    setOn(false);
  }, []);
  useEffect(() => stop, [stop]);

  const start = async () => {
    setMsg("");
    setLiveUnavailable(false);
    if (!supported) {
      setLiveUnavailable(true);
      setMsg(t("cameraLiveUnavailable"));
      return;
    }

    setOn(true);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } } });
      video.current.srcObject = stream.current;
      await video.current.play();
    } catch (error) {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      if (video.current) video.current.srcObject = null;
      setOn(false);
      setLiveUnavailable(true);
      const messageKey = {
        NotAllowedError: "cameraPermissionDenied",
        NotFoundError: "cameraNotFound",
        NotReadableError: "cameraBusy",
      }[error.name] || "cameraLiveUnavailable";
      setMsg(`${t(messageKey)} (${error.name || "UnknownError"})`);
    }
  };

  const handleFallbackImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file?.type.startsWith("image/")) onCapture(file);
  };

  const grab = () =>
    new Promise((res) => {
      const v = video.current;
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0);
      c.toBlob((b) => res(new File([b], "webcam.jpg", { type: "image/jpeg" })), "image/jpeg", 0.85);
    });

  const draw = (dets, w, h) => {
    const cv = overlay.current;
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = Math.max(2, w / 200);
    ctx.font = `bold ${Math.max(14, w / 40)}px sans-serif`;
    dets.forEach((d) => {
      const { x1, y1, x2, y2 } = d.box;
      ctx.strokeStyle = colorFor(d.class_id);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillStyle = colorFor(d.class_id);
      ctx.fillText(`${d.label} ${Math.round(d.confidence * 100)}%`, x1 + 4, Math.max(16, y1 - 4));
    });
  };

  const loop = async () => {
    running.current = true;
    setLive(true);
    while (running.current) {
      const t0 = performance.now();
      try {
        const file = await compressImage(await grab(), 640);
        const { data } = await predict(file, { conf });
        const sx = video.current.videoWidth / data.image_width;
        draw(data.detections.map((d) => ({ ...d, box: { x1: d.box.x1 * sx, y1: d.box.y1 * sx, x2: d.box.x2 * sx, y2: d.box.y2 * sx } })), video.current.videoWidth, video.current.videoHeight);
        setFps(1000 / (performance.now() - t0));
      } catch (e) {
        setMsg(errorMessage(e));
        running.current = false;
        setLive(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      {(!supported || liveUnavailable) && (
        <p className="rounded-xl bg-[#f2f6ee] p-3 text-xs leading-5 text-[#65735f]">
          {liveUnavailable ? msg : t("cameraFallbackHelp")}
        </p>
      )}
      <div className={`relative overflow-hidden rounded-xl bg-[#17241a] ${on ? "" : "hidden"}`}>
          <video ref={video} autoPlay playsInline muted className="max-h-64 w-full object-cover" />
          <canvas ref={overlay} className="absolute inset-0 h-full w-full" />
          {live && (
            <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-[#1f3528]/85 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a7e65a]" />
              LIVE · {fps.toFixed(1)} FPS
            </span>
          )}
      </div>
      {msg && !liveUnavailable && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-800">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        {!on ? (
          <>
            <button type="button" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#edf6e8] px-3 text-xs font-semibold text-[#3d7241] transition hover:bg-[#e2f0d8]" onClick={start}>
              <Icon name="camera" className="h-4 w-4" />
              {t("start")}
            </button>
            {(!supported || liveUnavailable) && (
              <>
                <button type="button" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4b963b] px-3 text-xs font-semibold text-white" onClick={() => cameraInput.current?.click()}>
                  <Icon name="camera" className="h-4 w-4" />
                  {t("takePhoto")}
                </button>
                <button type="button" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#edf6e8] px-3 text-xs font-semibold text-[#3d7241]" onClick={() => galleryInput.current?.click()}>
                  <Icon name="gallery" className="h-4 w-4" />
                  {t("pick")}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button type="button" className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4b963b] px-3 text-xs font-semibold text-white" onClick={async () => onCapture(await grab())}>
              <Icon name="camera" className="h-4 w-4" />
              {t("capture")}
            </button>
            <button type="button" className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#edf6e8] px-3 text-xs font-semibold text-[#3d7241]" onClick={() => (live ? ((running.current = false), setLive(false)) : loop())}>
              <Icon name={live ? "stop" : "live"} className="h-4 w-4" />
              {live ? t("stop") : t("live")}
            </button>
            <button type="button" aria-label={t("stop")} className="flex min-h-10 w-10 items-center justify-center rounded-xl bg-[#f7eeee] text-[#9b5544]" onClick={stop}>
              <Icon name="close" className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFallbackImage} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={handleFallbackImage} />
    </div>
  );
}
