import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { useLang } from "../LangContext";
import { getJSON } from "../lib/assistant";
import { useSettings } from "../services/settings";

const TXT = {
  fr: {
    intro: "Météo du gouvernorat et lecture agronomique : risques de maladie et fenêtres de traitement.",
    now: "Maintenant", humidity: "Humidité", wind: "Vent", forecast: "5 prochains jours",
    alerts: "À surveiller", noAlert: "Rien de particulier à signaler aujourd'hui.",
    loading: "Chargement de la météo…", error: "Météo indisponible", retry: "Réessayer",
    change: "Changer de gouvernorat dans les réglages.",
  },
  derja: {
    intro: "Ta9s el wilaya w chnowa ya3ni lel fla7a : amradh momkna w wa9t el 3ilaj.",
    now: "Tawa", humidity: "Ratouba", wind: "Ri7", forecast: "5 iyem el jeyin",
    alerts: "Rod belek", noAlert: "Ma famech 7aja gharība el yom.",
    loading: "9a3ed yjib el ta9s…", error: "El ta9s mouch mawjoud", retry: "3awed jarreb",
    change: "Baddel el wilaya fel réglages.",
  },
};

const LEVELS = {
  info: { ring: "ring-info-500/25", bg: "bg-info-50", text: "text-info-500", icon: "info" },
  warn: { ring: "ring-warn-500/25", bg: "bg-warn-50", text: "text-warn-500", icon: "alert" },
  danger: { ring: "ring-danger-500/25", bg: "bg-danger-50", text: "text-danger-500", icon: "alert" },
};

const dayName = (iso) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" }).format(new Date(iso));

/** Météo agricole : conditions actuelles, prévisions et alertes. */
export default function Weather() {
  const { lang } = useLang();
  const t = TXT[lang] ?? TXT.fr;
  const [settings] = useSettings();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError("");
    getJSON(`/weather?place=${encodeURIComponent(settings.place)}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [settings.place]);  

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label={t.loading}>
        <div className="h-36 animate-breathe rounded-card bg-line" />
        <div className="h-24 animate-breathe rounded-card bg-line" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-card border border-dashed border-line bg-surface p-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-warn-50 text-warn-500">
          <Icon name="cloud" className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink-800">{t.error}</p>
        <p className="mt-1 text-xs text-ink-400">{error}</p>
        <button type="button" onClick={load} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white">
          {t.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-ink-500">{t.intro}</p>

      <section className="animate-pop-in overflow-hidden rounded-card bg-gradient-to-br from-forest-700 to-brand-500 p-5 text-white shadow-raised">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-white/70">
              <Icon name="pin" className="h-3.5 w-3.5" />
              {data.place.name} · {t.now}
            </p>
            <p className="mt-2 text-4xl font-semibold leading-none">{Math.round(data.current.temperature)}°</p>
            <p className="mt-1.5 text-sm text-white/85">{data.current.description}</p>
          </div>
          <Icon name={data.current.icon} className="h-14 w-14 text-lime-200" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[
            ["droplet", t.humidity, `${data.current.humidity} %`],
            ["wind", t.wind, `${Math.round(data.current.wind)} km/h`],
          ].map(([icon, label, value]) => (
            <div key={label} className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
              <Icon name={icon} className="h-4 w-4 text-lime-200" />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-wide text-white/60">{label}</span>
                <span className="block text-sm font-semibold">{value}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-ink-900">{t.alerts}</h2>
        {data.alerts.length === 0 ? (
          <p className="rounded-card border border-dashed border-line bg-surface px-4 py-5 text-center text-sm text-ink-500">{t.noAlert}</p>
        ) : (
          <div className="space-y-2">
            {data.alerts.map((a, i) => {
              const style = LEVELS[a.level] ?? LEVELS.info;
              return (
                <article
                  key={a.title}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={`flex animate-fade-up gap-3 rounded-card ${style.bg} p-3.5 ring-1 ${style.ring}`}
                >
                  <Icon name={style.icon} className={`mt-0.5 h-5 w-5 shrink-0 ${style.text}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${style.text}`}>{a.title}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-600">{a.detail}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-ink-900">{t.forecast}</h2>
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
          {data.days.map((d) => (
            <div key={d.date} className="flex w-[88px] shrink-0 flex-col items-center gap-1.5 rounded-card border border-line bg-surface p-3 shadow-card">
              <span className="text-[11px] font-semibold capitalize text-ink-600">{dayName(d.date)}</span>
              <Icon name={d.icon} className="h-7 w-7 text-brand-500" />
              <span className="text-sm font-semibold text-ink-900">{Math.round(d.tmax)}°</span>
              <span className="text-[11px] text-ink-400">{Math.round(d.tmin)}°</span>
              {d.rain > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-info-500">
                  <Icon name="droplet" className="h-3 w-3" />
                  {d.rain} mm
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-[11px] text-ink-400">{t.change}</p>
    </div>
  );
}
