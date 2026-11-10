import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ConfBadge from "../components/ConfBadge";
import Icon from "../components/Icon";
import { useLang } from "../LangContext";
import { clearHistory, loadHistory } from "../services/history";

function formatLabel(label, emptyLabel) {
  return label?.replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim() || emptyLabel;
}

function formatDate(value, lang) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "fr-TN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function History() {
  const { lang, t } = useLang();
  const [items, setItems] = useState(loadHistory);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const scored = items.filter((item) => item.confidence != null);
  const average = scored.length
    ? Math.round((scored.reduce((sum, item) => sum + item.confidence, 0) / scored.length) * 100)
    : null;

  const filteredItems = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const hasDetection = Boolean(item.top);
      if (filter === "findings" && !hasDetection) return false;
      if (filter === "none" && hasDetection) return false;
      return !search || formatLabel(item.top, "").toLocaleLowerCase().includes(search);
    });
  }, [filter, items, query]);

  const confirmDelete = () => {
    clearHistory();
    setItems([]);
    setConfirmClear(false);
  };

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-[#edf0e9] bg-white px-6 py-10 text-center shadow-[0_6px_24px_rgba(38,63,38,0.05)]">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eff7e9] text-[#63964a]">
          <Icon name="leaf" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-[#263b2b]">{t("emptyHomeTitle")}</h2>
        <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-[#818a7e]">{t("empty")}</p>
        <Link to="/scan" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#4b963b] px-4 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]">
          <Icon name="scan" className="h-4 w-4" />
          {t("startScan")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-5 text-[#768075]">{t("historyIntro")}</p>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-[#1a6843] to-[#39854a] p-4 text-white shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Icon name="scan" className="h-[18px] w-[18px]" />
          </span>
          <p className="mt-3 text-2xl font-semibold">{items.length}</p>
          <p className="text-[11px] text-white/75">{t("totalAnalyses")}</p>
        </div>
        <div className="rounded-2xl border border-[#edf0e9] bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff7e9] text-[#629547]">
            <Icon name="chart" className="h-[18px] w-[18px]" />
          </span>
          <p className="mt-3 text-2xl font-semibold text-[#263b2b]">{average == null ? "—" : `${average}%`}</p>
          <p className="text-[11px] text-[#879087]">{t("avgConfidence")}</p>
        </div>
      </section>

      <label className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-[#e9ede5] bg-white px-3 text-[#879087] focus-within:border-[#78a965] focus-within:ring-2 focus-within:ring-[#e5f1dc]">
        <Icon name="search" className="h-[18px] w-[18px] shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t("searchAnalyses")}
          placeholder={t("searchAnalyses")}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#304033] outline-none placeholder:text-[#a2a99f]"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("history")}>
        {[
          ["all", "filterAll"],
          ["findings", "filterFindings"],
          ["none", "filterNoFinding"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${filter === value ? "bg-[#246841] text-white shadow-sm" : "bg-white text-[#737e72] ring-1 ring-[#e8ede4]"}`}
          >
            {t(label)}
          </button>
        ))}
        <button type="button" onClick={() => setConfirmClear(true)} className="ml-auto shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-[#a75a45]">
          {t("clear")}
        </button>
      </div>

      {filteredItems.length ? (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <article key={item.date} className="flex items-center gap-3 rounded-2xl border border-[#edf0e9] bg-white p-3 shadow-[0_4px_14px_rgba(38,63,38,0.035)]">
              <img src={item.thumb} alt="" className="h-[62px] w-[62px] shrink-0 rounded-xl bg-[#f0f3ea] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#2c3d30]">{formatLabel(item.top, t("noDetection"))}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-[#92998f]">
                  <Icon name="clock" className="h-3 w-3" />
                  {formatDate(item.date, lang)}
                </p>
              </div>
              {item.confidence != null && <ConfBadge value={item.confidence} />}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-[#dce6d5] bg-white px-4 py-8 text-center text-sm text-[#818a7e]">{t("noResults")}</p>
      )}

      {confirmClear && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#16271c]/45 px-5 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="clear-history-title" className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fbefec] text-[#b6614b]">
              <Icon name="history" className="h-5 w-5" />
            </span>
            <h2 id="clear-history-title" className="mt-4 text-base font-semibold text-[#263b2b]">{t("clearConfirmTitle")}</h2>
            <p className="mt-2 text-sm leading-5 text-[#7d867b]">{t("clearConfirmBody")}</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirmClear(false)} className="min-h-11 flex-1 rounded-xl bg-[#f0f3ed] px-3 text-sm font-semibold text-[#586458]">
                {t("cancel")}
              </button>
              <button type="button" onClick={confirmDelete} className="min-h-11 flex-1 rounded-xl bg-[#a94f3c] px-3 text-sm font-semibold text-white">
                {t("confirmClear")}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
