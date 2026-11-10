import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { useLang } from "../LangContext";

const tools = [
  { to: "/advanced", icon: "live", title: "toolLiveTitle", description: "toolLiveIntro" },
  { to: "/model", icon: "model", title: "toolModelTitle", description: "toolModelIntro" },
];

export default function Tools() {
  const { t } = useLang();
  return (
    <div className="space-y-3">
      <p className="mb-4 text-sm leading-6 text-[#768075]">{t("toolsIntro")}</p>
      {tools.map((tool) => (
        <Link key={tool.to} to={tool.to} className="flex items-center gap-3 rounded-2xl border border-[#edf0e9] bg-white p-4 shadow-[0_4px_16px_rgba(38,63,38,0.04)] transition hover:border-[#d7e5d0] active:scale-[0.99]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff7e9] text-[#598c40]">
            <Icon name={tool.icon} className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[#2d3e31]">{t(tool.title)}</span>
            <span className="mt-1 block text-xs leading-5 text-[#818a7e]">{t(tool.description)}</span>
          </span>
          <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-[#81917d]" />
        </Link>
      ))}
    </div>
  );
}
