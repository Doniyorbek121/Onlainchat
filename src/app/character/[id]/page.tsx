import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import TopBar from "@/components/TopBar";
import CharacterOwnerActions from "@/components/CharacterOwnerActions";
import { getCharacter } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const character = getCharacter(id);
  if (!character) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === character.creatorId;

  // P0: private characters are visible only to their creator.
  if (character.visibility === "private" && !isOwner) notFound();

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="card overflow-hidden">
          <div
            className="h-28"
            style={{
              background: `linear-gradient(135deg, ${character.avatarColor}55, transparent)`,
            }}
          />
          <div className="-mt-12 flex flex-col items-center gap-3 px-6 pb-8 text-center">
            <Avatar
              emoji={character.avatarEmoji}
              color={character.avatarColor}
              size={96}
              className="ring-4 ring-bg-card"
            />
            <div>
              <h1 className="text-2xl font-bold">{character.name}</h1>
              <p className="text-sm text-muted">by {character.creatorName}</p>
            </div>
            <span className="rounded-full bg-bg-soft px-3 py-1 text-xs font-medium text-muted">
              {character.category} · {character.interactions.toLocaleString()} chats
            </span>

            {character.tagline && (
              <p className="max-w-lg text-[15px] text-white/90">
                {character.tagline}
              </p>
            )}
            {character.description && (
              <p className="max-w-lg text-sm leading-relaxed text-muted">
                {character.description}
              </p>
            )}

            <Link
              href={`/chat/${character.id}`}
              className="btn-primary mt-2 px-8"
            >
              💬 Start chatting
            </Link>

            {isOwner && (
              <CharacterOwnerActions
                characterId={character.id}
                characterName={character.name}
              />
            )}
          </div>
        </div>

        {character.greeting && (
          <div className="card mt-6 p-5">
            <p className="label">First message</p>
            <p className="whitespace-pre-wrap text-sm text-white/90">
              {character.greeting}
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-muted hover:text-white">
            ← Back to discover
          </Link>
        </div>
      </main>
    </div>
  );
}
