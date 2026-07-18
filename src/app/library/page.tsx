import Link from "next/link";
import TopBar from "@/components/TopBar";
import Avatar from "@/components/Avatar";
import { peekUserId } from "@/lib/session";
import {
  listConversationsForUser,
  getCharacter,
  listMessages,
} from "@/lib/db";

export const dynamic = "force-dynamic";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function LibraryPage() {
  const userId = await peekUserId();
  const conversations = userId ? listConversationsForUser(userId) : [];

  const items = conversations
    .map((conv) => {
      const character = getCharacter(conv.characterId);
      if (!character) return null;
      const msgs = listMessages(conv.id);
      const last = msgs[msgs.length - 1];
      return { conv, character, last };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">My chats</h1>

        {items.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-12 text-center">
            <span className="text-4xl">💬</span>
            <p className="text-muted">You haven&apos;t started any chats yet.</p>
            <Link href="/" className="btn-primary mt-2">
              Discover characters
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map(({ conv, character, last }) => (
              <Link
                key={conv.id}
                href={`/chat/${character.id}`}
                className="card flex items-center gap-3 p-3 transition-colors hover:border-brand/50 hover:bg-bg-hover"
              >
                <Avatar
                  emoji={character.avatarEmoji}
                  color={character.avatarColor}
                  size={48}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{character.name}</p>
                    <span className="shrink-0 text-[11px] text-muted">
                      {timeAgo(conv.updatedAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted">
                    {last
                      ? `${last.role === "user" ? "You: " : ""}${last.content}`
                      : "New chat"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
