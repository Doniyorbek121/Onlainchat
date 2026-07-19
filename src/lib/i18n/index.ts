import { en, messages, type Dict } from "./messages";

export type { Dict };
export { LOCALES } from "./config";

/** Merges the requested locale over English so missing keys fall back. */
export function getDict(locale: string): Dict {
  return { ...en, ...(messages[locale] ?? {}) };
}

/** Replaces {token} placeholders in a translated string. */
export function interpolate(
  value: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`
  );
}

/** Builds a translator function bound to a dictionary. Client- and server-safe. */
export function makeT(dict: Dict) {
  return (key: string, vars?: Record<string, string | number>): string =>
    interpolate(dict[key] ?? en[key as keyof typeof en] ?? key, vars);
}
