import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { useLang } from "../LangContext";

/** Écran caméra plein écran : flux live si disponible, sinon l'appareil photo natif (marche aussi en HTTP). */
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

  const rond = "flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition active:scale-95";
  const coins = [
    "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-3xl",
    "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-3xl",
    "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-3xl",
    "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-3xl",
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-forest-900 text-white">
      <img src="/images/leaf-closeup.jpg" alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className={`absolute inset-0 h-full w-full object-cover ${ready ? "hidden" : ""}`} />
      <video ref={video} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${ready ? "" : "hidden"}`} />
      <div className="absolute inset-0 bg-forest-900/20" />

      {/* Commandes du haut */}
      <div className="relative flex items-center justify-between px-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onBack} aria-label={t("back")} className={rond}>
          <Icon name="back" />
        </button>
        <button
          type="button"
          onClick={toggleTorch}
          aria-label={t("flash")}
          aria-pressed={torch}
          className={`${rond} ${torch ? "!bg-lime-400 !text-forest-900" : ""}`}
        >
          <Icon name="bolt" />
        </button>
      </div>

      {/* Cadre de visée */}
      <div className="relative flex flex-1 items-center justify-center px-7">
        <div className="relative aspect-[3/4] w-full max-w-sm">
          {coins.map((c) => (
            <span key={c} className={`absolute h-11 w-11 border-lime-300 ${c}`} />
          ))}
          <p className="absolute inset-x-0 -bottom-12 mx-auto w-fit rounded-pill bg-forest-900/55 px-3.5 py-2 text-center text-xs font-medium text-white backdrop-blur">
            {ready ? t("frame") : t("camHint")}
          </p>
        </div>
      </div>

      {/* Barre de prise de vue */}
      <div className="relative rounded-t-[1.75rem] bg-surface pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-ink-800">
        <div className="mx-auto mb-3 h-1 w-12 rounded-pill bg-line" />
        {children}
        <div className="mt-3 flex items-center justify-around px-8">
          <button
            type="button"
            disabled={disabled}
            onClick={() => pickInput.current.click()}
            aria-label={t("gallery2")}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition active:scale-95 disabled:opacity-40"
          >
            <Icon name="gallery" className="h-6 w-6" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={shoot}
            aria-label={t("capture")}
            className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-brand-100 transition active:scale-90 disabled:opacity-40"
          >
            <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-brand-500 text-white shadow-card">
              <Icon name="scan" className="h-7 w-7" />
            </span>
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => setFacing(facing === "environment" ? "user" : "environment")}
            aria-label={t("flip")}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition active:scale-95 disabled:opacity-40"
          >
            <Icon name="flip" className="h-6 w-6" />
          </button>
        </div>
      </div>

      <input ref={camInput} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={pickInput} type="file" accept="image/*" hidden onChange={handle} />
    </div>
  );
}
