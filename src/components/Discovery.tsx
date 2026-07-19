"use client";

import { useMemo, useState } from "react";
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
  characters,
}: {
  characters: Character[];
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return characters.filter((c) => {
      const matchesFilter = filter === "All" || c.category === filter;
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [characters, query, filter]);

  const featured = useMemo(
    () => [...characters].sort((a, b) => b.interactions - a.interactions).slice(0, 3),
    [characters]
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Search */}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          ⌕
        </span>
        <input
          className="input pl-10"
          placeholder={t("home.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Featured */}
      {query === "" && filter === "All" && featured.length > 0 && (
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
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
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
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {filter === "All" ? t("home.exploreHeading") : filter}
          <span className="ml-2 text-muted/60">{filtered.length}</span>
        </h2>
        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-12 text-center">
            <span className="text-3xl">🔍</span>
            <p className="text-muted">No characters match your search.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
