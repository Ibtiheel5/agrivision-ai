import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import LangToggle from "../components/LangToggle";
import { loadHistory } from "../services/history";
import { loadPlants } from "../services/plants";
import { useLang } from "../LangContext";

function getGreeting(hour) {
  if (hour < 12) return "greetingMorning";
  if (hour < 18) return "greetingAfternoon";
  return "greetingEvening";
}

function formatLabel(label) {
  return label?.replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(date, lang) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "fr-TN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export default function Home() {
  const { lang, t } = useLang();
  const [items] = useState(loadHistory);
  const [plants, setPlants] = useState([]);
  const [plantsError, setPlantsError] = useState("");
  const [welcomePage, setWelcomePage] = useState(0);
  const [started, setStarted] = useState(() => {
    try {
      return localStorage.getItem("agrivision-ia-started") === "true"
        || localStorage.getItem("leafdoctor-started") === "true";
    } catch {
      return false;
    }
  });
  const scored = items.filter((item) => item.confidence != null);
  const avgConfidence = scored.length
    ? Math.round((scored.reduce((sum, item) => sum + item.confidence, 0) / scored.length) * 100)
    : null;
  const latest = items[0];
  const now = new Date();

  useEffect(() => {
    try {
      setPlants(loadPlants());
    } catch (error) {
      setPlantsError(error.message || t("plantsLoadError"));
    }
  }, [t]);

  const begin = () => {
    try {
      localStorage.setItem("agrivision-ia-started", "true");
    } catch {
      // The welcome screen can still be dismissed when storage is unavailable.
    }
    setStarted(true);
  };
  const welcomePages = [
    { title: "welcomeTitle", intro: "welcomeIntro", visual: "welcome" },
    { title: "onboardingAboutTitle", intro: "onboardingAboutIntro", visual: "about" },
    { title: "onboardingWhyTitle", intro: "onboardingWhyIntro", visual: "why" },
    { title: "onboardingScanTitle", intro: "onboardingScanIntro", visual: "scan" },
    { title: "onboardingHistoryTitle", intro: "onboardingHistoryIntro", visual: "history" },
  ];
  const currentWelcomePage = welcomePages[welcomePage];
  const nextWelcomePage = () => {
    if (welcomePage === welcomePages.length - 1) {
      begin();
      return;
    }
    setWelcomePage((page) => page + 1);
  };

  return (
    <div className="min-h-screen bg-[#f7f8f3]">
      {!started && (
        <section
          aria-label={t("onboardingLabel")}
          aria-roledescription={t("onboardingCarousel")}
          className="fixed inset-0 z-50 mx-auto flex max-w-xl flex-col overflow-y-auto bg-white px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#1d3024]">
              <Icon name="leaf" className="h-8 w-8 text-[#4c9a32]" />
              <span className="text-xl font-bold">{t("app")}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#899187]">{t("onboardingCount", { current: welcomePage + 1, total: welcomePages.length })}</span>
              <LangToggle className="!bg-[#edf6e7] !text-[#366b32]" />
            </div>
          </div>
          <div key={welcomePage} aria-live="polite" className="mt-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#639848]">{t("welcomeEyebrow")}</p>
            <h1 className="text-[1.8rem] font-semibold leading-tight text-[#1d3024]">{t(currentWelcomePage.title)}</h1>
            <p className="mt-2 max-w-[310px] text-sm leading-6 text-[#68736a]">{t(currentWelcomePage.intro)}</p>
          </div>
          <div
            aria-hidden="true"
            className="relative my-6 flex min-h-[180px] flex-1 items-center justify-center overflow-hidden rounded-[2rem] bg-[#edfadf]"
          >
            <div className="absolute -right-10 -top-8 h-48 w-48 rounded-full bg-[#d6efbd]" />
            <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-[#ddf3ce]" />
            {currentWelcomePage.visual === "welcome" && (
              <>
                <img src="/images/leaf-closeup.jpg" alt="" className="relative h-[86%] w-[82%] rounded-[1.7rem] object-cover shadow-xl" />
                <span className="absolute left-[13%] top-[15%] flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#4d933e] shadow-lg">
                  <Icon name="sparkles" className="h-6 w-6" />
                </span>
                <span className="absolute bottom-[13%] right-[9%] flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-[#294b31] shadow-lg">
                  <Icon name="shield" className="h-4 w-4 text-[#69a545]" />
                  {t("welcomeBadge")}
                </span>
              </>
            )}
            {currentWelcomePage.visual === "about" && (
              <div className="relative w-[84%] overflow-hidden rounded-[1.7rem] bg-white p-3 shadow-xl">
                <img src="/images/leaf-closeup.jpg" alt="" className="h-[min(34vh,240px)] w-full rounded-[1.2rem] object-cover" />
                <div className="flex items-center gap-3 px-2 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eff7e9] text-[#4d933e]">
                    <Icon name="sparkles" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-[#294b31]">{t("onboardingPhotoLabel")}</span>
                    <span className="mt-1 block text-[10px] text-[#818a7e]">{t("onboardingResultLabel")}</span>
                  </span>
                  <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-[#81917d]" />
                </div>
              </div>
            )}
            {currentWelcomePage.visual === "why" && (
              <div className="relative w-[84%] space-y-3 rounded-[1.7rem] bg-white p-4 shadow-xl">
                {[
                  ["camera", "onboardingWhyItem1"],
                  ["chart", "onboardingWhyItem2"],
                  ["history", "onboardingWhyItem3"],
                ].map(([icon, label]) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-[#f7f9f5] p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf4e5] text-[#4c8b45]">
                      <Icon name={icon} className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold leading-5 text-[#354735]">{t(label)}</span>
                  </div>
                ))}
              </div>
            )}
            {currentWelcomePage.visual === "scan" && (
              <div className="relative flex h-[82%] w-[76%] items-center justify-center overflow-hidden rounded-[1.7rem] bg-[#426b39] shadow-xl">
                <img src="/images/leaf-closeup.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-[#163a24]/20" />
                <span className="absolute left-4 top-4 h-8 w-8 rounded-tl-xl border-l-[3px] border-t-[3px] border-white" />
                <span className="absolute right-4 top-4 h-8 w-8 rounded-tr-xl border-r-[3px] border-t-[3px] border-white" />
                <span className="absolute bottom-4 left-4 h-8 w-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-white" />
                <span className="absolute bottom-4 right-4 h-8 w-8 rounded-br-xl border-b-[3px] border-r-[3px] border-white" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#4d933e] shadow-lg">
                  <Icon name="camera" className="h-8 w-8" />
                </span>
              </div>
            )}
            {currentWelcomePage.visual === "history" && (
              <div className="relative w-[84%] space-y-3 rounded-[1.7rem] bg-white p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <img src="/images/leaf-closeup.jpg" alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <span className="block h-2 w-24 rounded-full bg-[#dce7d7]" />
                    <span className="mt-2 block h-2 w-16 rounded-full bg-[#eef1eb]" />
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff7e9] text-[#4d933e]">
                    <Icon name="history" className="h-5 w-5" />
                  </span>
                </div>
                <div className="rounded-xl bg-[#f3f7ef] p-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-[#54704c]">
                    <span>{t("onboardingHistoryLabel")}</span>
                    <span className="rounded-full bg-white px-2 py-1 text-[9px] text-[#729452]">{t("onboardingHistoryLocal")}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mb-5 flex items-center justify-center gap-2" role="group" aria-label={t("onboardingPages")}>
            {welcomePages.map((page, index) => (
              <span
                key={page.title}
                aria-current={index === welcomePage ? "step" : undefined}
                className={`h-2 rounded-full transition-all ${index === welcomePage ? "w-7 bg-[#4b963b]" : "w-2 bg-[#dce6d5]"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {welcomePage > 0 ? (
              <button
                type="button"
                onClick={() => setWelcomePage((page) => page - 1)}
                className="flex min-h-[56px] min-w-[56px] items-center justify-center rounded-2xl border border-[#e5ecdf] bg-white text-[#52734c] transition active:scale-[0.98]"
                aria-label={t("previous")}
              >
                <Icon name="back" className="h-5 w-5" />
              </button>
            ) : (
              <button type="button" onClick={begin} className="min-h-[56px] px-2 text-sm font-semibold text-[#7b8578]">
                {t("skip")}
              </button>
            )}
            <button type="button" onClick={nextWelcomePage} className="flex min-h-[56px] flex-1 items-center justify-center gap-3 rounded-2xl bg-[#4b963b] px-5 font-semibold text-white shadow-[0_8px_20px_rgba(75,150,59,0.22)] transition active:scale-[0.98]">
              {welcomePage === welcomePages.length - 1 ? t("getStarted") : t("next")}
              <Icon name="arrow" className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      <header className="relative overflow-hidden rounded-b-[2rem] bg-[#155d3c] px-5 pb-9 pt-7 text-white">
        <img src="/images/leaf-closeup.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f5138]/95 via-[#176d3f]/80 to-[#78a72e]/55" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/15">
                <Icon name="leaf" className="h-6 w-6 text-[#c8f28b]" />
              </span>
              <div>
                <p className="text-xs font-medium text-white/70">{t("homeWelcome")}</p>
                <h1 className="text-lg font-semibold leading-tight">{t("app")}</h1>
              </div>
            </div>
            <LangToggle className="!bg-white/15" />
          </div>

          <div className="mt-7 flex items-end justify-between gap-3">
            <div className="max-w-[280px]">
              <p className="mb-1 text-xs font-medium text-white/70">{t("today")} · {formatDate(now, lang)}</p>
              <h2 className="text-[1.7rem] font-semibold leading-tight">{t(getGreeting(now.getHours()))}</h2>
              <p className="mt-1 text-sm leading-5 text-white/75">{t("homeIntro")}</p>
            </div>
            <span className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Icon name="sun" className="h-5 w-5 text-[#e2f5af]" />
            </span>
          </div>
        </div>
      </header>

      <main className="space-y-6 px-4 pb-32 pt-5">
        <Link
          to="/scan"
          className="group relative block min-h-[206px] overflow-hidden rounded-[1.65rem] bg-[#1a3926] shadow-[0_10px_28px_rgba(30,67,39,0.16)]"
        >
          <img src="/images/leaf-closeup.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_33%] transition duration-500 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#102b1d]/95 via-[#173b27]/75 to-[#193923]/20" />
          <div className="relative flex min-h-[206px] flex-col items-start justify-between p-5 text-white">
            <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur">
              <Icon name="sparkles" className="h-3.5 w-3.5 text-[#cbf288]" />
              {t("aiPlantCheck")}
            </span>
            <div>
              <h3 className="max-w-[230px] text-xl font-semibold leading-tight">{t("scanNow")}</h3>
              <p className="mt-1 max-w-[245px] text-xs leading-5 text-white/75">{t("scanSub")}</p>
              <span className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#b7ed69] px-4 text-xs font-bold text-[#1b3e22] shadow-sm transition group-hover:bg-[#c7f28a]">
                {t("startScan")}
                <Icon name="arrow" className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#edf0e9] bg-white p-4 shadow-[0_4px_16px_rgba(38,63,38,0.04)]">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff7e9] text-[#5b963f]">
                <Icon name="scan" className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[10px] font-medium text-[#99a095]">{t("allTime")}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold leading-none text-[#223a2a]">{items.length}</p>
            <p className="mt-1 text-xs text-[#818a7e]">{t("statScans")}</p>
          </div>
          <div className="rounded-2xl border border-[#edf0e9] bg-white p-4 shadow-[0_4px_16px_rgba(38,63,38,0.04)]">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f3e5] text-[#7d9745]">
                <Icon name="chart" className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[10px] font-medium text-[#99a095]">{t("average")}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold leading-none text-[#223a2a]">{avgConfidence == null ? "—" : `${avgConfidence}%`}</p>
            <p className="mt-1 text-xs text-[#818a7e]">{t("statAvg")}</p>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#20372a]">{t("myPlants")}</h2>
              <p className="mt-0.5 text-[11px] text-[#8b9388]">{t("homePlantsSubtitle")}</p>
            </div>
            <Link to="/plants" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#4c873b]">
              {plants.length ? t("seeAll") : t("addPlant")}
              <Icon name="chevronRight" className="h-3.5 w-3.5" />
            </Link>
          </div>
          {plantsError && <p role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">{plantsError}</p>}
          {plants.length ? (
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2" aria-label={t("myPlants")}>
              {plants.slice(0, 8).map((plant) => (
                <Link
                  key={plant.id}
                  to={`/plants/${encodeURIComponent(plant.id)}`}
                  className="group relative h-36 w-32 shrink-0 snap-start overflow-hidden rounded-2xl bg-[#315d36] shadow-[0_5px_16px_rgba(38,63,38,0.12)]"
                >
                  <img
                    src={plant.image || "/images/leaf-closeup.jpg"}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#132b1c]/85 via-transparent to-black/5" />
                  <span className="absolute inset-x-0 bottom-0 p-3">
                    <span className="block truncate text-xs font-semibold text-white">{plant.name}</span>
                    <span className="mt-1 block truncate text-[10px] text-white/75">{plant.notes || t("plantNoNotes")}</span>
                  </span>
                </Link>
              ))}
              <Link
                to="/plants"
                className="flex h-36 w-24 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#cbdcc3] bg-white px-3 text-center text-[10px] font-semibold leading-4 text-[#52734c]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff7e9] text-[#598c40]">
                  <Icon name="leaf" className="h-5 w-5" />
                </span>
                {t("addPlant")}
              </Link>
            </div>
          ) : (
            !plantsError && (
              <Link to="/plants" className="flex items-center gap-3 rounded-2xl border border-dashed border-[#dce6d5] bg-white p-4 transition active:scale-[0.99]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff7e9] text-[#5c9142]">
                  <Icon name="leaf" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[#314436]">{t("homePlantsEmptyTitle")}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-[#879087]">{t("homePlantsEmptyIntro")}</span>
                </span>
                <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-[#729452]" />
              </Link>
            )
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#20372a]">{t("recent")}</h2>
              <p className="mt-0.5 text-[11px] text-[#8b9388]">{t("recentSubtitle")}</p>
            </div>
            {items.length > 0 && (
              <Link to="/history" className="inline-flex items-center gap-1 text-xs font-semibold text-[#4c873b]">
                {t("seeAll")}
                <Icon name="arrow" className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {latest ? (
            <div className="space-y-2">
              {items.slice(0, 3).map((item) => (
                <article key={item.date} className="flex items-center gap-3 rounded-2xl border border-[#edf0e9] bg-white p-3 shadow-[0_4px_16px_rgba(38,63,38,0.04)]">
                  <img src={item.thumb} alt="" className="h-[58px] w-[58px] shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#2d3e31]">{formatLabel(item.top) ?? t("noDetection")}</p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-[#899187]">
                      <Icon name="clock" className="h-3 w-3" />
                      {formatDate(new Date(item.date), lang)}
                    </p>
                  </div>
                  {item.confidence != null && (
                    <span className="shrink-0 rounded-full bg-[#eff7e9] px-2.5 py-1 text-[11px] font-semibold text-[#4f8a38]">
                      {Math.round(item.confidence * 100)}%
                    </span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#dce6d5] bg-white px-4 py-5 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#eff7e9] text-[#5c9142]">
                <Icon name="leaf" className="h-5 w-5" />
              </span>
              <p className="mt-2 text-sm font-semibold text-[#314436]">{t("emptyHomeTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-[#879087]">{t("emptyHomeSub")}</p>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#e8eee1] bg-white shadow-[0_4px_16px_rgba(38,63,38,0.04)]">
          <div className="flex items-center gap-3 bg-[#eef5e7] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#629847] shadow-sm">
              <Icon name="sun" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[#324832]">{t("photoTipTitle")}</span>
              <span className="mt-1 block text-[11px] leading-4 text-[#74816f]">{t("photoTipSub")}</span>
            </span>
          </div>
          <div className="divide-y divide-[#f0f2ed] px-4">
            {[
              ["camera", "tip1"],
              ["sun", "tip2"],
              ["scan", "tip3"],
            ].map(([icon, tip]) => (
              <div key={tip} className="flex items-center gap-3 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f7ef] text-[#719157]">
                  <Icon name={icon} className="h-4 w-4" />
                </span>
                <p className="text-xs leading-5 text-[#657163]">{t(tip)}</p>
              </div>
            ))}
          </div>
          <Link to="/scan" className="flex min-h-11 items-center justify-center gap-2 border-t border-[#f0f2ed] text-xs font-semibold text-[#4c873b]">
            {t("startScan")}
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
