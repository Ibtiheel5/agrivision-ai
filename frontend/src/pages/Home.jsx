import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import LangToggle from "../components/LangToggle";
import HomeDashboard from "../components/HomeDashboard";
import { useLang } from "../LangContext";

const WELCOME = [
  { title: "welcomeTitle", intro: "welcomeIntro", visual: "welcome" },
  { title: "onboardingAboutTitle", intro: "onboardingAboutIntro", visual: "about" },
  { title: "onboardingWhyTitle", intro: "onboardingWhyIntro", visual: "why" },
  { title: "onboardingScanTitle", intro: "onboardingScanIntro", visual: "scan" },
  { title: "onboardingHistoryTitle", intro: "onboardingHistoryIntro", visual: "history" },
];

export default function Home() {
  const { lang, t } = useLang();
  const [welcomePage, setWelcomePage] = useState(0);
  const [query, setQuery] = useState("");
  const [started, setStarted] = useState(() => {
    try {
      return localStorage.getItem("agrivision-ia-started") === "true"
        || localStorage.getItem("leafdoctor-started") === "true";
    } catch {
      return false;
    }
  });
  const page = WELCOME[welcomePage];

  const begin = () => {
    try {
      localStorage.setItem("agrivision-ia-started", "true");
    } catch {
      /* l'écran d'accueil reste fermable même sans stockage */
    }
    setStarted(true);
  };
  const next = () => (welcomePage === WELCOME.length - 1 ? begin() : setWelcomePage((p) => p + 1));

  return (
    <div className="min-h-screen bg-canvas">
      {!started && (
        <section
          aria-label={t("onboardingLabel")}
          aria-roledescription={t("onboardingCarousel")}
          className="fixed inset-0 z-50 mx-auto flex max-w-xl flex-col overflow-y-auto bg-surface px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-ink-900">
              <Icon name="leaf" className="h-8 w-8 text-brand-500" />
              <span className="text-xl font-bold">{t("app")}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-ink-400">
                {t("onboardingCount", { current: welcomePage + 1, total: WELCOME.length })}
              </span>
              <LangToggle className="!bg-brand-50 !text-brand-700" />
            </div>
          </div>

          <div key={welcomePage} aria-live="polite" className="mt-8 animate-fade-up">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{t("welcomeEyebrow")}</p>
            <h1 className="text-[1.8rem] font-semibold leading-tight text-ink-900">{t(page.title)}</h1>
            <p className="mt-2 max-w-[310px] text-sm leading-6 text-ink-500">{t(page.intro)}</p>
          </div>

          <div aria-hidden="true" className="relative my-6 flex min-h-[180px] flex-1 items-center justify-center overflow-hidden rounded-[2rem] bg-brand-50">
            <div className="absolute -right-10 -top-8 h-48 w-48 rounded-full bg-brand-100" />
            <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-brand-100/70" />
            {page.visual === "welcome" && (
              <>
                <img src="/images/leaf-closeup.jpg" alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="relative h-[86%] w-[82%] rounded-[1.7rem] object-cover shadow-raised" />
                <span className="absolute left-[13%] top-[15%] flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-600 shadow-raised">
                  <Icon name="sparkles" className="h-6 w-6" />
                </span>
                <span className="absolute bottom-[13%] right-[9%] flex items-center gap-2 rounded-pill bg-surface/95 px-3 py-2 text-xs font-semibold text-ink-800 shadow-raised">
                  <Icon name="shield" className="h-4 w-4 text-brand-500" />
                  {t("welcomeBadge")}
                </span>
              </>
            )}
            {page.visual === "about" && (
              <div className="relative w-[84%] overflow-hidden rounded-[1.7rem] bg-surface p-3 shadow-raised">
                <img src="/images/leaf-closeup.jpg" alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="h-[min(34vh,240px)] w-full rounded-[1.2rem] object-cover" />
                <div className="flex items-center gap-3 px-2 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Icon name="sparkles" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink-800">{t("onboardingPhotoLabel")}</span>
                    <span className="mt-1 block text-[10px] text-ink-400">{t("onboardingResultLabel")}</span>
                  </span>
                  <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ink-400" />
                </div>
              </div>
            )}
            {page.visual === "why" && (
              <div className="relative w-[84%] space-y-3 rounded-[1.7rem] bg-surface p-4 shadow-raised">
                {[["camera", "onboardingWhyItem1"], ["chart", "onboardingWhyItem2"], ["history", "onboardingWhyItem3"]].map(([icon, label]) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-canvas p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon name={icon} className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold leading-5 text-ink-700">{t(label)}</span>
                  </div>
                ))}
              </div>
            )}
            {page.visual === "scan" && (
              <div className="relative flex h-[82%] w-[76%] items-center justify-center overflow-hidden rounded-[1.7rem] bg-forest-800 shadow-raised">
                <img src="/images/leaf-closeup.jpg" alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-forest-900/25" />
                <span className="absolute left-4 top-4 h-8 w-8 rounded-tl-xl border-l-[3px] border-t-[3px] border-white" />
                <span className="absolute right-4 top-4 h-8 w-8 rounded-tr-xl border-r-[3px] border-t-[3px] border-white" />
                <span className="absolute bottom-4 left-4 h-8 w-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-white" />
                <span className="absolute bottom-4 right-4 h-8 w-8 rounded-br-xl border-b-[3px] border-r-[3px] border-white" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-surface text-brand-600 shadow-raised">
                  <Icon name="camera" className="h-8 w-8" />
                </span>
              </div>
            )}
            {page.visual === "history" && (
              <div className="relative w-[84%] space-y-3 rounded-[1.7rem] bg-surface p-4 shadow-raised">
                <div className="flex items-center gap-3">
                  <img src="/images/leaf-closeup.jpg" alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <span className="block h-2 w-24 rounded-pill bg-line" />
                    <span className="mt-2 block h-2 w-16 rounded-pill bg-canvas" />
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Icon name="history" className="h-5 w-5" />
                  </span>
                </div>
                <div className="rounded-xl bg-canvas p-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-ink-600">
                    <span>{t("onboardingHistoryLabel")}</span>
                    <span className="rounded-pill bg-surface px-2 py-1 text-[9px] text-brand-600">{t("onboardingHistoryLocal")}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-5 flex items-center justify-center gap-2" role="group" aria-label={t("onboardingPages")}>
            {WELCOME.map((p, index) => (
              <span
                key={p.title}
                aria-current={index === welcomePage ? "step" : undefined}
                className={`h-2 rounded-pill transition-all ${index === welcomePage ? "w-7 bg-brand-500" : "w-2 bg-line"}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {welcomePage > 0 ? (
              <button
                type="button"
                onClick={() => setWelcomePage((p) => p - 1)}
                className="flex min-h-[56px] min-w-[56px] items-center justify-center rounded-2xl border border-line bg-surface text-ink-600 transition active:scale-[0.98]"
                aria-label={t("previous")}
              >
                <Icon name="back" className="h-5 w-5" />
              </button>
            ) : (
              <button type="button" onClick={begin} className="min-h-[56px] px-2 text-sm font-semibold text-ink-400">
                {t("skip")}
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="flex min-h-[56px] flex-1 items-center justify-center gap-3 rounded-2xl bg-brand-500 px-5 font-semibold text-white shadow-raised transition active:scale-[0.98]"
            >
              {welcomePage === WELCOME.length - 1 ? t("getStarted") : t("next")}
              <Icon name="arrow" className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      {/* En-tête vert arrondi : salutation, accroche et météo du jour */}
      <header className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-brand-500 via-brand-600 to-forest-700 px-5 pb-7 pt-7 text-white">
        {/* feuille décorative en filigrane */}
        <svg viewBox="0 0 100 100" aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 text-white/10">
          <path d="M18 86C18 42 42 18 88 16c0 44-24 70-70 70z" fill="currentColor" />
          <path d="M18 86 58 46" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[1.6rem] font-bold leading-tight">
              {lang === "fr" ? "Bonjour !" : "Ahla bik !"}
            </h1>
            <p className="mt-1.5 max-w-[230px] text-[12px] leading-[1.45] text-white/80">
              {lang === "fr"
                ? "Bienvenue sur AgriVision. Détecte les maladies de tes plantes et protège ta récolte."
                : "Marhba bik fi AgriVision. Ektechef amradh nabatek w e7mi mahsoulek."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LangToggle className="!bg-white/20" />
            <Link
              to="/settings"
              aria-label={lang === "fr" ? "Réglages" : "Réglages"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25"
            >
              <Icon name="settings" className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <label className="relative mt-5 flex min-h-11 items-center gap-2.5 rounded-pill bg-white/20 px-4 ring-1 ring-white/25 backdrop-blur focus-within:bg-white/30">
          <Icon name="search" className="h-[17px] w-[17px] shrink-0 text-white/75" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === "fr" ? "Rechercher une maladie…" : "Lawwej 3la maradh…"}
            aria-label={lang === "fr" ? "Rechercher" : "Lawwej"}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/65"
          />
        </label>
      </header>

      <HomeDashboard query={query} />
    </div>
  );
}
