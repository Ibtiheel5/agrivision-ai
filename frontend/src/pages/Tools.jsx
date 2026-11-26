import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { useLang } from "../LangContext";

const GROUPS = (fr) => [
  {
    title: fr ? "Mon exploitation" : "El 3azba mte3i",
    items: [
      { to: "/history", icon: "history", title: fr ? "Historique" : "El 9dim", desc: fr ? "Toutes tes analyses, gardées sur cet appareil." : "Ettachkhis el koll, mahfoudh fel appareil." },
      { to: "/plants", icon: "leaf", title: fr ? "Mes plantes" : "Nabati", desc: fr ? "Le carnet de suivi de tes cultures." : "Carnet el nabatet mte3ek." },
    ],
  },
  {
    title: fr ? "Terrain" : "Fel ghabra",
    items: [
      { to: "/weather", icon: "cloud", title: fr ? "Météo agricole" : "Ta9s el fla7a", desc: fr ? "Prévisions, risques de maladie et fenêtres de traitement." : "El ta9s, el amradh el momkna w wa9t el 3ilaj." },
      { to: "/risk-map", icon: "map", title: fr ? "Carte des risques" : "Carte el ma5ater", desc: fr ? "Où les maladies sont signalées en ce moment." : "Win el amradh mawjoudin tawa." },
    ],
  },
  {
    title: fr ? "Analyse avancée" : "Ta7lil mitkadem",
    items: [
      { to: "/advanced", icon: "live", title: fr ? "Détection en direct" : "Kachf direct", desc: fr ? "Webcam, exemples et seuil de confiance." : "Webcam, exemples w niveau eth9a." },
      { to: "/model", icon: "model", title: fr ? "Le modèle" : "El modèle", desc: fr ? "Version, métriques et état de l'API." : "Version, métriques w 7alet el API." },
    ],
  },
  {
    title: fr ? "Application" : "El application",
    items: [
      { to: "/settings", icon: "settings", title: fr ? "Réglages" : "Réglages", desc: fr ? "Langue, gouvernorat, voix, confidentialité." : "Lougha, wilaya, sawt, khossousiya." },
    ],
  },
];

/** Page Outils : tout ce qui n'est pas dans la barre du bas. */
export default function Tools() {
  const { lang } = useLang();
  const fr = lang !== "derja";
  return (
    <div className="space-y-6">
      {GROUPS(fr).map((group, gi) => (
        <section key={group.title}>
          <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">{group.title}</h2>
          <div className="space-y-2">
            {group.items.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                style={{ animationDelay: `${(gi * 2 + i) * 30}ms` }}
                className="flex animate-fade-up items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card transition hover:border-brand-200 active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-800">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-ink-400">{item.desc}</span>
                </span>
                <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ink-400" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
