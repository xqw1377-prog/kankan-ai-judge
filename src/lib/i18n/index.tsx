import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Locale, Dictionary } from "./types";
import { zhCN } from "./zh-CN";
import { enUS } from "./en-US";

export type { Locale, Dictionary };

const dictionaries: Record<Locale, Dictionary> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

function detectLocale(): Locale {
  const saved = localStorage.getItem("kankan-locale");
  if (saved === "en-US" || saved === "zh-CN") return saved;
  const nav = navigator.language;
  if (nav.startsWith("en")) return "en-US";
  return "zh-CN";
}

interface I18nContextType {
  locale: Locale;
  t: Dictionary;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: "zh-CN",
  t: zhCN,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem("kankan-locale", l);
    setLocaleState(l);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t: dictionaries[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
