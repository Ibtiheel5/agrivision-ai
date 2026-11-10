import { useRef, useState } from "react";
import { useLang } from "../LangContext";
import Icon from "./Icon";

export default function Dropzone({ onFile, disabled }) {
  const { t } = useLang();
  const [over, setOver] = useState(false);
  const pick = useRef(null);
  const cam = useRef(null);
  const handle = (f) => f && f.type.startsWith("image/") && onFile(f);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files[0]);
      }}
      className={`rounded-2xl border border-dashed p-5 text-center transition ${over ? "border-[#579644] bg-[#eff7e9]" : "border-[#dce6d5] bg-white"}`}
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff7e9] text-[#579344]">
        <Icon name="gallery" className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#334335]">{t("uploadTitle")}</p>
      <p className="mt-1 text-xs text-[#8a9387]">{t("drop")}</p>
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={disabled} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4b963b] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#3f8333] disabled:opacity-50" onClick={() => cam.current.click()}>
          <Icon name="camera" className="h-4 w-4" />
          {t("camera")}
        </button>
        <button type="button" disabled={disabled} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#e5ecdf] bg-white px-3 text-xs font-semibold text-[#3d7241] transition hover:bg-[#f5f8f2] disabled:opacity-50" onClick={() => pick.current.click()}>
          <Icon name="gallery" className="h-4 w-4" />
          {t("pick")}
        </button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => {
        handle(e.target.files[0]);
        e.target.value = "";
      }} />
      <input ref={pick} type="file" accept="image/*" hidden onChange={(e) => {
        handle(e.target.files[0]);
        e.target.value = "";
      }} />
    </div>
  );
}
