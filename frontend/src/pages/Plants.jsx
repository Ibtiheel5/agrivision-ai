import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { useLang } from "../LangContext";
import { addPlant, loadPlants } from "../services/plants";

function formatDate(value, lang) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "fr-TN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function Plants() {
  const { lang, t } = useLang();
  const [plants, setPlants] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      setPlants(loadPlants());
    } catch (e) {
      setError(e.message || t("plantsLoadError"));
    }
  }, [t]);

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
      const plant = await addPlant({ name, notes, image });
      setPlants((current) => [plant, ...current]);
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
        <p className="max-w-[280px] text-sm leading-6 text-[#768075]">{t("plantsIntro")}</p>
        <span className="shrink-0 rounded-full bg-[#eaf4e5] px-3 py-1.5 text-xs font-semibold text-[#4c8044]">
          {t("plantsCount", { count: plants.length })}
        </span>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <button
        type="button"
        onClick={() => setFormOpen((open) => !open)}
        aria-expanded={formOpen}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#4b963b] px-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(75,150,59,0.2)] transition active:scale-[0.99]"
      >
        <Icon name={formOpen ? "close" : "leaf"} className="h-5 w-5" />
        {formOpen ? t("cancel") : t("addPlant")}
      </button>

      {formOpen && (
        <form onSubmit={save} className="space-y-4 rounded-2xl border border-[#e7ece2] bg-white p-4 shadow-sm">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[#354735]">{t("plantName")}</span>
            <input
              required
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("plantNamePlaceholder")}
              className="min-h-12 w-full rounded-xl border border-[#e5ecdf] bg-[#fbfcfa] px-3 text-sm text-[#304033] outline-none focus:border-[#78a965] focus:ring-2 focus:ring-[#e5f1dc]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[#354735]">{t("plantNotes")}</span>
            <textarea
              maxLength={500}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("plantNotesPlaceholder")}
              className="w-full resize-y rounded-xl border border-[#e5ecdf] bg-[#fbfcfa] p-3 text-sm text-[#304033] outline-none focus:border-[#78a965] focus:ring-2 focus:ring-[#e5f1dc]"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#dce6d5] p-3">
            {preview ? (
              <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#eff7e9] text-[#598c40]">
                <Icon name="gallery" className="h-5 w-5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-[#354735]">{t("plantPhoto")}</span>
              <span className="mt-0.5 block text-[11px] text-[#899187]">{t("plantPhotoHint")}</span>
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            />
          </label>
          <button type="submit" disabled={saving} className="min-h-12 w-full rounded-xl bg-[#edf6e7] px-4 text-sm font-semibold text-[#366b32] transition hover:bg-[#e2f0d9] disabled:opacity-60">
            {saving ? t("saving") : t("savePlant")}
          </button>
        </form>
      )}

      {plants.length ? (
        <div className="space-y-3">
          {plants.map((plant) => (
            <Link
              key={plant.id}
              to={`/plants/${encodeURIComponent(plant.id)}`}
              className="flex items-center gap-3 rounded-2xl border border-[#edf0e9] bg-white p-3 shadow-[0_4px_16px_rgba(38,63,38,0.04)] transition hover:border-[#d7e5d0] active:scale-[0.99]"
            >
              <img
                src={plant.image || "/images/leaf-closeup.jpg"}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl bg-[#eff7e9] object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#2d3e31]">{plant.name}</span>
                <span className="mt-1 block truncate text-[11px] text-[#899187]">{plant.notes || t("plantNoNotes")}</span>
                <span className="mt-1 block text-[10px] text-[#9aa195]">{formatDate(plant.createdAt, lang)}</span>
              </span>
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-[#81917d]" />
            </Link>
          ))}
        </div>
      ) : (
        !formOpen && (
          <div className="rounded-2xl border border-dashed border-[#dce6d5] bg-white px-5 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eff7e9] text-[#5c9142]">
              <Icon name="leaf" className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-[#314436]">{t("plantsEmptyTitle")}</h2>
            <p className="mt-1 text-xs leading-5 text-[#879087]">{t("plantsEmptyIntro")}</p>
          </div>
        )
      )}
    </div>
  );
}
