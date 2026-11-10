import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import { useLang } from "../LangContext";
import { deletePlant, loadPlants } from "../services/plants";

function formatDate(value, lang) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "fr-TN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function PlantDetail() {
  const { lang, t } = useLang();
  const { plantId } = useParams();
  const navigate = useNavigate();
  const [plant, setPlant] = useState(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    try {
      const found = loadPlants().find((item) => item.id === plantId);
      if (!found) setError(t("plantNotFound"));
      setPlant(found || null);
    } catch (e) {
      setError(e.message || t("plantsLoadError"));
    }
  }, [plantId, t]);

  const remove = () => {
    try {
      deletePlant(plant.id);
      navigate("/plants", { replace: true });
    } catch (e) {
      setError(e.message || t("plantsDeleteError"));
      setConfirmDelete(false);
    }
  };

  if (!plant) {
    return (
      <div className="rounded-2xl border border-[#edf0e9] bg-white p-5 text-center">
        <p role={error ? "alert" : undefined} className="text-sm text-[#768075]">{error || t("loading")}</p>
        <Link to="/plants" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[#4c873b]">{t("backToPlants")}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <img src={plant.image || "/images/leaf-closeup.jpg"} alt="" className="h-56 w-full rounded-3xl object-cover shadow-sm" />
      <section className="rounded-2xl border border-[#edf0e9] bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a9387]">{t("plantAdded")}</p>
        <h2 className="mt-1 text-xl font-semibold text-[#263b2b]">{plant.name}</h2>
        <p className="mt-1 text-xs text-[#899187]">{formatDate(plant.createdAt, lang)}</p>
        <div className="mt-4 border-t border-[#f0f2ed] pt-3">
          <h3 className="text-xs font-semibold text-[#354735]">{t("plantNotes")}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#768075]">{plant.notes || t("plantNoNotes")}</p>
        </div>
      </section>
      <Link to="/scan" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#4b963b] px-4 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]">
        <Icon name="scan" className="h-4 w-4" />
        {t("analyzeLeaf")}
      </Link>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button type="button" onClick={() => setConfirmDelete(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-[#a75a45]">
        <Icon name="close" className="h-4 w-4" />
        {t("removePlant")}
      </button>

      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#16271c]/45 px-5 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="text-base font-semibold text-[#263b2b]">{t("removePlantTitle")}</h2>
            <p className="mt-2 text-sm leading-5 text-[#7d867b]">{t("removePlantIntro")}</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 flex-1 rounded-xl bg-[#f0f3ed] px-3 text-sm font-semibold text-[#586458]">
                {t("cancel")}
              </button>
              <button type="button" onClick={remove} className="min-h-11 flex-1 rounded-xl bg-[#a94f3c] px-3 text-sm font-semibold text-white">
                {t("remove")}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
