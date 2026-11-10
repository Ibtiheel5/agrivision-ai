import { createContext, useContext, useMemo, useState } from "react";
import { STRINGS, getLang, setLang } from "./i18n";

const Ctx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setL] = useState(getLang());
  const value = useMemo(
    () => ({
      lang,
      t: (k, params) => {
        const value = STRINGS[lang][k];
        return typeof value === "function" ? value(params) : value ?? k;
      },
      toggle: () => {
        const n = lang === "derja" ? "fr" : "derja";
        setLang(n);
        setL(n);
      },
    }),
    [lang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
