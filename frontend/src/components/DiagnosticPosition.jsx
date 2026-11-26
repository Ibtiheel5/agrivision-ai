import { useState } from "react";
import Icon from "./Icon";
import { useLang } from "../LangContext";
import { messageRaison, testerPosition } from "../services/risk";

const TXT = {
  fr: {
    titre: "Partage de position",
    intro: "Teste la chaîne complète et affiche précisément ce qui bloque.",
    bouton: "Tester ma position",
    encours: "Test en cours…",
    https: "Page en HTTPS",
    api: "Géolocalisation disponible",
    partage: "Partage activé dans les réglages",
    permission: "Autorisation du navigateur",
    precision: (m) => `Position obtenue, précision ${m} m`,
    etats: { granted: "accordée", denied: "refusée", prompt: "sera demandée", null: "inconnue" },
  },
  derja: {
    titre: "Mcharket el blasa",
    intro: "Jarreb el selsla kemla w chouf chnowa el 7ajez bel dhabt.",
    bouton: "Jarreb el blasa mte3i",
    encours: "9a3ed njarreb…",
    https: "El page b HTTPS",
    api: "El géolocalisation mawjouda",
    partage: "El mcharka met7alla fel réglages",
    permission: "Permission mte3 el navigateur",
    precision: (m) => `L9ina el blasa, di99a ${m} m`,
    etats: { granted: "m3atya", denied: "marfoudha", prompt: "bech tetotlob", null: "mahich ma3roufa" },
  },
};

/** Bloc à poser dans l'écran Réglages, sous l'interrupteur de partage de position. */
export default function DiagnosticPosition() {
  const { lang } = useLang() ?? {};
  const t = TXT[lang] ?? TXT.fr;
  const [res, setRes] = useState(null);
  const [encours, setEncours] = useState(false);

  const lancer = async () => {
    setEncours(true);
    setRes(null);
    setRes(await testerPosition());
    setEncours(false);
  };

  const libelle = { https: t.https, api: t.api, partage: t.partage };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-sm font-bold text-forest-800">{t.titre}</h3>
      <p className="mt-1 text-[12px] leading-5 text-ink-500">{t.intro}</p>

      <button
        type="button"
        onClick={lancer}
        disabled={encours}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        <Icon name="pin" className="h-4 w-4" />
        {encours ? t.encours : t.bouton}
      </button>

      {res && (
        <div className="mt-3 space-y-2" role="status">
          {res.etapes.map((e) => (
            <p key={e.cle} className="flex items-center gap-2 text-[12px] text-ink-700">
              <Icon
                name={e.ok ? "check" : "close"}
                className={`h-4 w-4 shrink-0 ${e.ok ? "text-brand-600" : "text-danger-500"}`}
              />
              {libelle[e.cle]}
            </p>
          ))}
          <p className="flex items-center gap-2 text-[12px] text-ink-700">
            <Icon name="info" className="h-4 w-4 shrink-0 text-ink-400" />
            {t.permission} : {t.etats[res.permission] ?? t.etats.null}
          </p>
          <p
            className={`rounded-xl p-3 text-[12px] leading-5 ${
              res.ok ? "bg-brand-50 text-forest-800" : "bg-red-50 text-red-800"
            }`}
          >
            {res.ok ? t.precision(res.precisionM) : messageRaison(res.raison, lang)}
          </p>
        </div>
      )}
    </section>
  );
}
