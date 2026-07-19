/**
 * Baseline text-safety screening for user-generated content (character names,
 * personas, descriptions, greetings). This is a first line of defence — a fast,
 * deterministic filter that blocks the highest-risk categories before content
 * is ever stored or sent to the model. It is intentionally conservative and
 * pairs with human moderation (the reports queue) and the model provider's own
 * guardrails; it is not a substitute for either.
 *
 * The primary target is the sexualisation of minors (CSAE), which is illegal
 * everywhere and the single biggest liability for an open UGC + AI platform.
 * Operators can extend the blocklist for their own policy via the
 * MODERATION_BLOCKLIST env var (comma-separated terms).
 */

export interface ScreenResult {
  ok: boolean;
  category?: "csae" | "blocked-term";
  reason?: string;
}

/**
 * Base normalisation: lowercase, strip punctuation, collapse whitespace.
 * Digits are preserved so numeric age detection still works.
 */
function normalizeBase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Leetspeak normalisation for term matching only (turns digits into the
 * letters they commonly stand in for, so "ch1ld"/"s3x" are caught). Not used
 * for numeric age detection, which needs the real digits.
 */
function normalizeLeet(base: string): string {
  return base
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t");
}

// Terms that indicate a minor.
const MINOR_TERMS = [
  "child",
  "children",
  "kid",
  "kids",
  "minor",
  "underage",
  "under age",
  "preteen",
  "pre teen",
  "toddler",
  "infant",
  "loli",
  "lolicon",
  "shota",
  "shotacon",
  "little girl",
  "little boy",
  "schoolgirl",
  "schoolboy",
  "elementary schooler",
  "grade schooler",
  "middle schooler",
  "prepubescent",
];

// Sexual terms. Kept clinical/unambiguous; presence alongside a minor term is
// what triggers a block.
const SEXUAL_TERMS = [
  "sex",
  "sexual",
  "sexy",
  "nude",
  "naked",
  "nsfw",
  "porn",
  "explicit",
  "erotic",
  "erotica",
  "fuck",
  "blowjob",
  "genital",
  "aroused",
  "orgasm",
  "masturbat",
  "fondle",
  "molest",
];

function hasAny(haystack: string, terms: string[]): boolean {
  return terms.some((t) => haystack.includes(t));
}

/** Detects an explicit "<n> year old" style age under 18. */
function mentionsUnderageNumber(text: string): boolean {
  const re = /(\b\d{1,2})\s*(?:yo|y o|years? old|year old)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const age = parseInt(m[1], 10);
    if (age >= 0 && age <= 17) return true;
  }
  return false;
}

function extraBlocklist(): string[] {
  return (process.env.MODERATION_BLOCKLIST || "")
    .split(",")
    .map((t) => normalizeLeet(normalizeBase(t)))
    .filter(Boolean);
}

/**
 * Screen a single block of text. Returns ok:false with a category when the
 * content violates the baseline policy.
 */
export function screenText(input: string): ScreenResult {
  if (!input) return { ok: true };
  const base = normalizeBase(input);
  const leet = normalizeLeet(base);

  // Standalone terms that are prohibited on their own.
  if (/\bloli(?:con)?\b/.test(leet) || /\bshota(?:con)?\b/.test(leet)) {
    return { ok: false, category: "csae", reason: "sexualised-minor-term" };
  }

  // Age detection uses real digits (base); term detection uses leet.
  const minor =
    hasAny(leet, MINOR_TERMS) || mentionsUnderageNumber(base);
  const sexual = hasAny(leet, SEXUAL_TERMS);
  if (minor && sexual) {
    return { ok: false, category: "csae", reason: "minor+sexual" };
  }

  const blocked = extraBlocklist().find((t) => leet.includes(t));
  if (blocked) {
    return { ok: false, category: "blocked-term", reason: blocked };
  }

  return { ok: true };
}

/**
 * Screen all free-text fields of a character. Returns the first violation.
 */
export function screenCharacterFields(fields: {
  name?: string;
  tagline?: string;
  description?: string;
  greeting?: string;
  persona?: string;
}): ScreenResult {
  const combined = [
    fields.name,
    fields.tagline,
    fields.description,
    fields.greeting,
    fields.persona,
  ]
    .filter(Boolean)
    .join("\n");
  return screenText(combined);
}

/** User-facing message for a blocked submission (no internal detail leaked). */
export const MODERATION_MESSAGE =
  "This content violates our content policy and can't be published. If you believe this is a mistake, contact support.";
