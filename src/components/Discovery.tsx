"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CharacterCard from "./CharacterCard";
import { useT } from "./I18nProvider";
import type { Character } from "@/lib/types";

const FILTERS = [
  "All",
  "Assistant",
  "Companion",
  "Roleplay",
  "Creative",
  "Games",
  "Education",
  "Anime",
  "History",
  "Famous",
  "Helper",
];

export default function Discovery({
  initial,
  initialHasMore,
}: {
  initial: Character[];
  initialHasMore: boolean;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState<Character[]>(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const firstRun = useRef(true);

  const featured = useMemo(
    () =>
      [...initial].sort((a, b) => b.interactions - a.interactions).slice(0, 3),
    [initial]
  );

  async function fetchPage(offset: number, replace: boolean) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("offset", String(offset));
      if (query.trim()) params.set("search", query.trim());
      if (filter !== "All") params.set("category", filter);
      const res = await fetch(`/api/characters?${params.toString()}`);
      const data = await res.json();
      const next: Character[] = data.characters ?? [];
      setItems((prev) => (replace ? next : [...prev, ...next]));
      setHasMore(Boolean(data.hasMore));
    } catch {
      /* keep what we have */
    } finally {
      setLoading(false);
    }
  }

  // Re-query the server when the search text or category filter changes
  // (debounced). Skips the initial mount, which already has SSR data.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = setTimeout(() => fetchPage(0, true), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter]);

  const showFeatured = query === "" && filter === "All" && featured.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Search */}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          ⌕
        </span>
        <label htmlFor="discovery-search" className="sr-only">
          {t("home.search")}
        </label>
        <input
          id="discovery-search"
          type="search"
          className="input pl-10"
          placeholder={t("home.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Featured */}
      {showFeatured && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("home.trending")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CharacterCard key={`f-${c.id}`} character={c} />
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div
        className="-mx-1 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Category filter"
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-brand text-white"
                : "bg-bg-card text-muted hover:bg-bg-hover hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <section aria-busy={loading}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {filter === "All" ? t("home.exploreHeading") : filter}
          <span className="ml-2 text-muted/60">{items.length}</span>
        </h2>
        {items.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-12 text-center">
            <span className="text-3xl">🔍</span>
            <p className="text-muted">No characters match your search.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => fetchPage(items.length, false)}
              disabled={loading}
              className="btn-ghost px-8"
            >
              {loading ? t("loading") : t("loadMore")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
