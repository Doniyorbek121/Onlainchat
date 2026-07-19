import Link from "next/link";
import Avatar from "./Avatar";
import type { Character } from "@/lib/types";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

export default function CharacterCard({ character }: { character: Character }) {
  return (
    <Link
      href={`/chat/${character.id}`}
      className="card group flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:bg-bg-hover"
    >
      <div className="flex items-start gap-3">
        <Avatar
          emoji={character.avatarEmoji}
          color={character.avatarColor}
          imageUrl={character.avatarImage}
          size={52}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white group-hover:text-brand-soft">
            {character.name}
          </h3>
          <p className="truncate text-xs text-muted">
            by {character.creatorName}
          </p>
        </div>
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted">
        {character.tagline || character.description || "Say hello to get started."}
      </p>

      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="rounded-full bg-bg-soft px-2.5 py-1 text-[11px] font-medium text-muted">
          {character.category}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted">
          <span className="text-brand-soft">◆</span>
          {formatCount(character.interactions)} chats
        </span>
      </div>
    </Link>
  );
}
