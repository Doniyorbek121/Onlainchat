export interface LocaleMeta {
  code: string;
  name: string; // native name
  dir: "ltr" | "rtl";
}

// 22 supported interface languages. The AI itself replies in whatever language
// the user writes in, so conversations aren't limited to this list.
export const LOCALES: LocaleMeta[] = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "uz", name: "O‘zbekcha", dir: "ltr" },
  { code: "ru", name: "Русский", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "de", name: "Deutsch", dir: "ltr" },
  { code: "pt", name: "Português", dir: "ltr" },
  { code: "it", name: "Italiano", dir: "ltr" },
  { code: "tr", name: "Türkçe", dir: "ltr" },
  { code: "pl", name: "Polski", dir: "ltr" },
  { code: "uk", name: "Українська", dir: "ltr" },
  { code: "nl", name: "Nederlands", dir: "ltr" },
  { code: "id", name: "Bahasa Indonesia", dir: "ltr" },
  { code: "vi", name: "Tiếng Việt", dir: "ltr" },
  { code: "hi", name: "हिन्दी", dir: "ltr" },
  { code: "bn", name: "বাংলা", dir: "ltr" },
  { code: "zh", name: "中文", dir: "ltr" },
  { code: "ja", name: "日本語", dir: "ltr" },
  { code: "ko", name: "한국어", dir: "ltr" },
  { code: "th", name: "ไทย", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "fa", name: "فارسی", dir: "rtl" },
];

export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "oc_lang";

export function isSupported(code: string | undefined | null): boolean {
  return Boolean(code && LOCALES.some((l) => l.code === code));
}

export function localeDir(code: string): "ltr" | "rtl" {
  return LOCALES.find((l) => l.code === code)?.dir ?? "ltr";
}
