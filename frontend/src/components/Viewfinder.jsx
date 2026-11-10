import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { useLang } from "../LangContext";

/** Écran caméra plein écran : flux live si dispo, sinon l'appareil photo natif (fonctionne aussi en HTTP). */
export default function Viewfinder({ onFile, onBack, disabled, children }) {
  const { t } = useLang();
  const video = useRef(null);
  const stream = useRef(null);
  const camInput = useRef(null);
  const pickInput = useRef(null);
  const [facing, setFacing] = useState("environment");
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const supported = !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!supported) return undefined;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 } } })
      .then(async (s) => {
        if (cancelled) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        stream.current = s;
        video.current.srcObject = s;
        await video.current.play();
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => {
      cancelled = true;
      setReady(false);
      setTorch(false);
      stream.current?.getTracks().forEach((tr) => tr.stop());
      stream.current = null;
    };
  }, [facing, supported]);

  const toggleTorch = async () => {
    try {
      const next = !torch;
      await stream.current?.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: next }] });
      setTorch(next);
    } catch {
      /* torche non supportée sur cet appareil */
    }
  };

  const shoot = () => {
    const v = video.current;
    if (!ready || !v?.videoWidth) {
      camInput.current.click();
      return;
    }
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob((b) => b && onFile(new File([b], "capture.jpg", { type: "image/jpeg" })), "image/jpeg", 0.9);
  };

  const handle = (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (f?.type.startsWith("image/")) onFile(f);
  };

  const round = "flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur";
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900 text-white">
      <img src="/images/leaf-closeup.jpg" alt="" className={`absolute inset-0 h-full w-full object-cover ${ready ? "hidden" : ""}`} />
      <video ref={video} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${ready ? "" : "hidden"}`} />
      <div className="absolute inset-0 bg-black/15" />

      <div className="relative flex items-center justify-between px-4 pt-5">
        <button type="button" onClick={onBack} aria-label={t("back")} className={round}>
          <Icon name="back" />
        </button>
        <button type="button" onClick={toggleTorch} aria-label={t("flash")} className={`${round} ${torch ? "!bg-olive-500" : ""}`}>
          <Icon name="bolt" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-8">
        <div className="relative aspect-[3/4] w-full max-w-sm">
          {["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl"].map((c) => (
            <span key={c} className={`absolute h-10 w-10 border-white ${c}`} />
          ))}
          <p className="absolute inset-x-0 -bottom-9 text-center text-sm text-white/90 drop-shadow">{ready ? t("frame") : t("camHint")}</p>
        </div>
      </div>

      <div className="relative bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 text-leaf-900">
        {children}
        <div className="mt-3 flex items-center justify-around px-6">
          <button type="button" disabled={disabled} onClick={() => pickInput.current.click()} aria-label={t("gallery2")} className="flex h-12 w-12 items-center justify-center rounded-xl bg-leaf-50 text-leaf-700">
            <Icon name="gallery" />
          </button>
          <button type="button" disabled={disabled} onClick={shoot} aria-label={t("capture")} className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-[#dcebd4] transition active:scale-90">
            <span className="h-14 w-14 rounded-full bg-[#4b963b]" />
          </button>
          <button type="button" disabled={!ready} onClick={() => setFacing(facing === "environment" ? "user" : "environment")} aria-label={t("flip")} className="flex h-12 w-12 items-center justify-center rounded-xl bg-leaf-50 text-leaf-700 disabled:opacity-40">
            <Icon name="flip" />
          </button>
        </div>
      </div>

      <input ref={camInput} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={pickInput} type="file" accept="image/*" hidden onChange={handle} />
    </div>
  );
}
