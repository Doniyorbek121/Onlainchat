import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import TopBar from "@/components/TopBar";
import CharacterOwnerActions from "@/components/CharacterOwnerActions";
import FavoriteButton from "@/components/FavoriteButton";
import ShareButton from "@/components/ShareButton";
import { getCharacter, isFavorited, getUserById } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const character = await getCharacter(id);
  if (!character) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === character.creatorId;

  // P0: private characters are visible only to their creator.
  if (character.visibility === "private" && !isOwner) notFound();

  const favorited = user ? await isFavorited(user.id, character.id) : false;
  const creator = await getUserById(character.creatorId);
  const { t } = await getServerI18n();

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
              imageUrl={character.avatarImage}
              size={96}
              className="ring-4 ring-bg-card"
            />
            <div>
              <h1 className="text-2xl font-bold">{character.name}</h1>
              <p className="text-sm text-muted">
                by{" "}
                {creator ? (
                  <Link
                    href={`/u/${creator.username}`}
                    className="text-brand-soft hover:underline"
                  >
                    {character.creatorName}
                  </Link>
                ) : (
                  character.creatorName
                )}
              </p>
            </div>
            <span className="rounded-full bg-bg-soft px-3 py-1 text-xs font-medium text-muted">
              {character.category} · {character.interactions.toLocaleString()} chats
              {character.favorites > 0 &&
                ` · ♥ ${character.favorites.toLocaleString()}`}
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

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Link href={`/chat/${character.id}`} className="btn-primary px-8">
                💬 {t("chat.startChatting")}
              </Link>
              <FavoriteButton
                characterId={character.id}
                initialFavorited={favorited}
                initialCount={character.favorites}
                isAuthed={Boolean(user)}
              />
              {character.visibility === "public" && (
                <ShareButton path={`/character/${character.id}`} />
              )}
            </div>

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
            ← {t("common.back")}
          </Link>
        </div>
      </main>
    </div>
  );
}
