import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isSupported,
  localeDir,
} from "./config";
import { getDict, makeT } from ".";

/** Server-side: resolves the active locale from the cookie. */
export async function getLocale(): Promise<string> {
  const store = await cookies();
  const code = store.get(LOCALE_COOKIE)?.value;
  return isSupported(code) ? (code as string) : DEFAULT_LOCALE;
}

/** Server-side translator + locale metadata for the current request. */
export async function getServerI18n() {
  const locale = await getLocale();
  const dict = getDict(locale);
  return { locale, dir: localeDir(locale), dict, t: makeT(dict) };
}
