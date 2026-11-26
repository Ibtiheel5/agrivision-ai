import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { useLang } from "../LangContext";
import { addPlant, loadPlants } from "../services/plants";

const formatDate = (value, lang) =>
  new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "fr-TN", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(value));

export default function Plants() {
  const { lang, t } = useLang();
  const fr = lang !== "derja";
  const [plants, setPlants] = useState(loadPlants);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    if (!image) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const save = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await addPlant({ name, notes, image });
      setPlants(loadPlants());
      setName("");
      setNotes("");
      setImage(null);
      setFormOpen(false);
    } catch (e) {
      setError(e.message || t("plantsSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-[280px] text-sm leading-6 text-ink-500">{t("plantsIntro")}</p>
        <span className="shrink-0 rounded-pill bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
          {t("plantsCount", { count: plants.length })}
        </span>
      </div>

      {error && <p role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger-500">{error}</p>}

      <button
        type="button"
        onClick={() => setFormOpen((open) => !open)}
        aria-expanded={formOpen}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-raised transition active:scale-[0.99]"
      >
        <Icon name={formOpen ? "close" : "plus"} className="h-5 w-5" />
        {formOpen ? t("cancel") : t("addPlant")}
      </button>

      {formOpen && (
        <form onSubmit={save} className="animate-fade-up space-y-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-700">{t("plantName")}</span>
            <input
              required maxLength={60} value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t("plantNamePlaceholder")}
              className="min-h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink-800 outline-none focus:border-brand-300 focus:shadow-focus"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-700">{t("plantNotes")}</span>
            <textarea
              maxLength={500} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={t("plantNotesPlaceholder")}
              className="w-full resize-y rounded-xl border border-line bg-canvas p-3 text-sm text-ink-800 outline-none focus:border-brand-300 focus:shadow-focus"
            />
          </label>

          {/* Photo : appareil photo ou galerie, au choix */}
          <div className="rounded-xl border border-dashed border-line p-3">
            <div className="flex items-center gap-3">
              {preview ? (
                <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name="image" className="h-6 w-6" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-ink-700">{t("plantPhoto")}</span>
                <span className="mt-0.5 block text-[11px] text-ink-400">{t("plantPhotoHint")}</span>
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => cameraRef.current?.click()} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-50 text-xs font-semibold text-brand-700">
                <Icon name="camera" className="h-4 w-4" />
                {fr ? "Prendre une photo" : "Sawwer"}
              </button>
              <button type="button" onClick={() => galleryRef.current?.click()} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-canvas text-xs font-semibold text-ink-700">
                <Icon name="gallery" className="h-4 w-4" />
                {fr ? "Galerie" : "Galerie"}
              </button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            <input ref={galleryRef} type="file" accept="image/*" className="sr-only" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          </div>

          <button type="submit" disabled={saving} className="min-h-12 w-full rounded-xl bg-forest-600 px-4 text-sm font-semibold text-white transition disabled:opacity-60">
            {saving ? t("saving") : t("savePlant")}
          </button>
        </form>
      )}

      {plants.length ? (
        <div className="space-y-3">
          {plants.map((plant, i) => (
            <Link
              key={plant.id}
              to={`/plants/${encodeURIComponent(plant.id)}`}
              style={{ animationDelay: `${Math.min(i, 8) * 28}ms` }}
              className="flex animate-fade-up items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card transition hover:border-brand-200 active:scale-[0.99]"
            >
              <img src={plant.image || "/images/leaf-closeup.jpg"} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-brand-50 object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-800">{plant.name}</span>
                <span className="mt-1 block truncate text-[11px] text-ink-400">{plant.notes || t("plantNoNotes")}</span>
                <span className="mt-1 block text-[10px] text-ink-400">{formatDate(plant.createdAt, lang)}</span>
              </span>
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ink-400" />
            </Link>
          ))}
        </div>
      ) : (
        !formOpen && (
          <div className="animate-pop-in rounded-card border border-dashed border-line bg-surface px-5 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Icon name="leaf" className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-ink-800">{t("plantsEmptyTitle")}</h2>
            <p className="mt-1 text-xs leading-5 text-ink-400">{t("plantsEmptyIntro")}</p>
          </div>
        )
      )}
    </div>
  );
}
