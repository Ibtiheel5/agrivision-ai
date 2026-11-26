import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import DiagnosticPosition from "../components/DiagnosticPosition";
import { useLang } from "../LangContext";
import { useSettings } from "../services/settings";
import { clearHistory, loadHistory } from "../services/history";
import { clearConversations, listConversations } from "../services/conversations";
import { getJSON } from "../lib/assistant";

const TXT = {
  fr: {
    intro: "Tout est enregistré sur cet appareil. Rien n'est envoyé à un compte.",
    language: "Langue", languageHint: "Français ou derja tunisienne",
    place: "Mon gouvernorat", placeHint: "Sert à la météo et à la carte des risques",
    voice: "Réponses vocales par défaut", voiceHint: "L'assistant lit ses réponses à voix haute",
    share: "Partager ma position", shareHint: "Position arrondie à 1 km, pour alimenter la carte. Jamais la photo.",
    threshold: "Seuil de confiance", thresholdHint: "En dessous, la détection n'est pas affichée",
    data: "Mes données",
    analyses: (n) => `${n} analyse${n > 1 ? "s" : ""} enregistrée${n > 1 ? "s" : ""}`,
    chats: (n) => `${n} conversation${n > 1 ? "s" : ""} enregistrée${n > 1 ? "s" : ""}`,
    clearA: "Effacer les analyses", clearC: "Effacer les conversations",
    confirmA: "Effacer toutes les analyses de cet appareil ?",
    confirmC: "Effacer toutes les conversations de cet appareil ?",
    about: "À propos", server: "Serveur", on: "Activé", off: "Désactivé",
  },
  derja: {
    intro: "El koll mahfoudh fel appareil hedha. Ma yetb3athch l 7atta compte.",
    language: "El lougha", languageHint: "Français walla derja tounsiya",
    place: "El wilaya mte3i", placeHint: "Lel ta9s w el carte",
    voice: "Jaweb bel sawt", voiceHint: "El mousa3ed ya9ra el jaweb bel sawt",
    share: "Charek el blasa", shareHint: "Blasa m9arba b 1 km, bech t3awen el carte. Ma yetb3ath 7atta taswira.",
    threshold: "Niveau eth9a", thresholdHint: "Ta7t hedha, el natija ma tetbayenech",
    data: "El données mte3i",
    analyses: (n) => `${n} ta7lil mahfoudh`,
    chats: (n) => `${n} 7adith mahfoudh`,
    clearA: "Fassa5 et-ta7lil", clearC: "Fassa5 el 7adiths",
    confirmA: "Tfassa5 et-ta7lil el koll ?",
    confirmC: "Tfassa5 el 7adiths el koll ?",
    about: "3la el application", server: "Serveur", on: "Ya5dem", off: "Mat9affel",
  },
};

function Row({ icon, title, hint, children }) {
  return (
    <div className="flex items-start gap-3 border-b border-line py-4 last:border-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-800">{title}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-4 text-ink-400">{hint}</p>}
        <div className="mt-2.5">{children}</div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, labelOn, labelOff }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2.5 rounded-pill px-1 py-1 pr-3 text-xs font-semibold transition ${
        checked ? "bg-brand-50 text-brand-700" : "bg-canvas text-ink-500"
      }`}
    >
      <span className={`flex h-6 w-11 items-center rounded-pill p-0.5 transition ${checked ? "bg-brand-500" : "bg-ink-400/40"}`}>
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </span>
      {checked ? labelOn : labelOff}
    </button>
  );
}

/** Réglages : langue, météo, voix, confidentialité et données locales. */
export default function Settings() {
  const { lang, toggle } = useLang();
  const t = TXT[lang] ?? TXT.fr;
  const [settings, update] = useSettings();
  const [places, setPlaces] = useState([]);
  const [counts, setCounts] = useState({ analyses: 0, chats: 0 });

  useEffect(() => {
    getJSON("/weather/places").then(setPlaces).catch(() => setPlaces([]));
    setCounts({ analyses: loadHistory().length, chats: listConversations().length });
  }, []);

  const wipe = (kind) => {
    const ok = window.confirm(kind === "analyses" ? t.confirmA : t.confirmC);
    if (!ok) return;
    if (kind === "analyses") clearHistory();
    else clearConversations();
    setCounts({ analyses: loadHistory().length, chats: listConversations().length });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-ink-500">{t.intro}</p>

      <section className="rounded-card border border-line bg-surface px-4 shadow-card">
        <Row icon="globe" title={t.language} hint={t.languageHint}>
          <div className="inline-flex rounded-pill bg-canvas p-1">
            {[["fr", "Français"], ["derja", "الدارجة"]].map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => lang !== code && toggle()}
                aria-pressed={lang === code}
                className={`rounded-pill px-3.5 py-1.5 text-xs font-semibold transition ${
                  lang === code ? "bg-brand-500 text-white shadow-card" : "text-ink-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>

        <Row icon="pin" title={t.place} hint={t.placeHint}>
          <select
            value={settings.place}
            onChange={(e) => update({ place: e.target.value })}
            className="min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink-800 outline-none focus:border-brand-300"
          >
            {(places.length ? places : [{ id: settings.place, name: settings.place }]).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Row>

        <Row icon="volume" title={t.voice} hint={t.voiceHint}>
          <Toggle checked={settings.voiceReplies} onChange={(v) => update({ voiceReplies: v })} labelOn={t.on} labelOff={t.off} />
        </Row>

        <Row icon="map" title={t.share} hint={t.shareHint}>
          <Toggle checked={settings.shareLocation} onChange={(v) => update({ shareLocation: v })} labelOn={t.on} labelOff={t.off} />
        </Row>

        <Row icon="sliders" title={t.threshold} hint={t.thresholdHint}>
          <div className="flex items-center gap-3">
            <input
              type="range" min="0.05" max="0.95" step="0.05"
              value={settings.threshold}
              onChange={(e) => update({ threshold: Number(e.target.value) })}
              className="h-1.5 flex-1 accent-brand-500"
            />
            <span className="w-12 text-right text-sm font-semibold tabular-nums text-ink-800">
              {Math.round(settings.threshold * 100)} %
            </span>
          </div>
        </Row>
      </section>

      {/* Diagnostic : dit pourquoi la position ne part pas, utile surtout sur téléphone. */}
      <DiagnosticPosition />

      <section className="rounded-card border border-line bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold text-ink-900">{t.data}</h2>
        <p className="mt-2 text-xs text-ink-500">{t.analyses(counts.analyses)}</p>
        <p className="text-xs text-ink-500">{t.chats(counts.chats)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => wipe("analyses")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-danger-50 px-3.5 text-xs font-semibold text-danger-500">
            <Icon name="trash" className="h-4 w-4" />
            {t.clearA}
          </button>
          <button type="button" onClick={() => wipe("chats")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-danger-50 px-3.5 text-xs font-semibold text-danger-500">
            <Icon name="trash" className="h-4 w-4" />
            {t.clearC}
          </button>
        </div>
      </section>
    </div>
  );
}
