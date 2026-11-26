import { Link } from "react-router-dom";
import Icon from "./Icon";
import { useLang } from "../LangContext";

const TXT = {
  fr: { humidity: "Humidité", rain: "Pluie", wind: "Vent", days: "5 prochains jours", off: "Météo indisponible" },
  derja: { humidity: "Ratouba", rain: "Mtar", wind: "Ri7", days: "5 iyem el jeyin", off: "El ta9s mouch mawjoud" },
};

const jour = (iso) => new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(new Date(iso));

/** Météo du jour et prévisions courtes, en carte verte. */
export default function WeatherCard({ weather, failed }) {
  const { lang } = useLang();
  const t = TXT[lang] ?? TXT.fr;

  if (!weather) {
    return failed ? (
      <p className="rounded-[1.25rem] border border-dashed border-line bg-surface px-4 py-3 text-center text-xs text-ink-400">{t.off}</p>
    ) : (
      <div className="h-[196px] animate-breathe rounded-[1.25rem] bg-line" role="status" />
    );
  }

  return (
    <Link
      to="/weather"
      className="block animate-pop-in overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-forest-800 via-forest-700 to-brand-600 p-4 text-white shadow-raised transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">
            <Icon name="pin" className="h-3.5 w-3.5" />
            {weather.place.name}
          </p>
          <p className="mt-1.5 flex items-start gap-1 text-[2.5rem] font-semibold leading-none">
            {Math.round(weather.current.temperature)}
            <span className="mt-1 text-base font-medium text-white/70">°C</span>
          </p>
          <p className="mt-1 text-sm text-white/80">{weather.current.description}</p>
        </div>
        <Icon name={weather.current.icon} className="h-12 w-12 shrink-0 text-lime-200" />
      </div>

      <div className="mt-3.5 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-black/15 py-2.5">
        {[
          ["droplet", t.humidity, `${weather.current.humidity} %`],
          ["rain", t.rain, `${weather.days[0] ? weather.days[0].rain : 0} mm`],
          ["wind", t.wind, `${Math.round(weather.current.wind)} km/h`],
        ].map(([icon, label, value]) => (
          <div key={label} className="flex flex-col items-center gap-0.5 px-1">
            <Icon name={icon} className="h-4 w-4 text-lime-200" />
            <span className="text-[9px] text-white/60">{label}</span>
            <span className="text-[11px] font-semibold">{value}</span>
          </div>
        ))}
      </div>

      {/* Prévisions courtes */}
      <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">{t.days}</p>
      <div className="mt-2 flex gap-2">
        {weather.days.slice(0, 5).map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-white/10 py-2">
            <span className="text-[9px] capitalize text-white/65">{jour(d.date)}</span>
            <Icon name={d.icon} className="h-4 w-4 text-lime-200" />
            <span className="text-[11px] font-semibold">{Math.round(d.tmax)}°</span>
          </div>
        ))}
      </div>
    </Link>
  );
}
