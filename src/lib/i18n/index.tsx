import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Locale, Dictionary } from "./types";
import { zhCN } from "./zh-CN";
import { enUS } from "./en-US";

export type { Locale, Dictionary };

const dictionaries: Record<Locale, Dictionary> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

/** Saved choice wins. Otherwise follow the system language. Non-Chinese systems use English. */
export function localeFromSignals(saved: string | null, language: string | undefined): Locale {
  if (saved === "en-US" || saved === "zh-CN") return saved;
  return (language || "").toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

function detectLocale(): Locale {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("kankan-locale");
  } catch {
    saved = null;
  }
  const language = typeof navigator === "undefined" ? undefined : navigator.language;
  return localeFromSignals(saved, language);
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

  useEffect(() => {
    document.documentElement.lang = locale === "en-US" ? "en" : "zh-CN";
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, t: dictionaries[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
