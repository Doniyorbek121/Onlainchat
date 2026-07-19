"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type Dict } from "@/lib/i18n";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface I18nValue {
  t: TFn;
  locale: string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  dict,
  locale,
  children,
}: {
  dict: Dict;
  locale: string;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ t: makeT(dict), locale }), [dict, locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Client-side translator hook. Falls back to the key if used outside a provider. */
export function useT(): TFn {
  const ctx = useContext(I18nContext);
  return ctx?.t ?? ((key: string) => key);
}

export function useLocale(): string {
  return useContext(I18nContext)?.locale ?? "en";
}
