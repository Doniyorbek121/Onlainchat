"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import {
  CATEGORIES,
  AVATAR_COLORS,
  AVATAR_EMOJIS,
} from "@/lib/types";

export default function CreateCharacterForm({
  creatorName,
}: {
  creatorName: string;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [greeting, setGreeting] = useState("");
  const [persona, setPersona] = useState("");
  const [category, setCategory] = useState<string>("Assistant");
  const [avatarEmoji, setAvatarEmoji] = useState(AVATAR_EMOJIS[0]);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please give your character a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tagline,
          description,
          greeting,
          persona,
          category,
          avatarEmoji,
          avatarColor,
          visibility,
          creatorName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create character");
      router.push(`/chat/${data.character.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-bg-hover hover:text-white"
          >
            ←
          </Link>
          <h1 className="text-lg font-bold">Create a character</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <form
          onSubmit={submit}
          className="grid gap-8 lg:grid-cols-[1fr_320px]"
        >
          {/* Form fields */}
          <div className="flex flex-col gap-5">
            <Field label="Name" hint="What is your character called?">
              <input
                className="input"
                placeholder="e.g. Aria"
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Tagline" hint="A short one-liner shown on cards.">
              <input
                className="input"
                placeholder="Your warm, curious companion."
                maxLength={120}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </Field>

            <Field
              label="Description"
              hint="A public summary of who this character is."
            >
              <textarea
                className="input min-h-[80px] resize-y"
                placeholder="A kind and thoughtful friend who loves deep conversations…"
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <Field
              label="Greeting"
              hint="The first message the character sends."
            >
              <textarea
                className="input min-h-[70px] resize-y"
                placeholder="Hey, I'm Aria 💜 How's your day going?"
                maxLength={500}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
              />
            </Field>

            <Field
              label="Personality & instructions"
              hint="How should the character behave, speak and think? This shapes every reply."
            >
              <textarea
                className="input min-h-[140px] resize-y"
                placeholder="You are Aria, a warm, emotionally intelligent companion. You are supportive, curious and genuine…"
                maxLength={2000}
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
              />
            </Field>

            <Field label="Category">
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <p className="-mt-1 text-xs text-muted/70">
              Published as{" "}
              <span className="font-semibold text-white/90">{creatorName}</span>.
            </p>

            <Field label="Visibility">
              <div className="flex gap-2">
                {(["public", "private"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                      visibility === v
                        ? "border-brand bg-brand/15 text-white"
                        : "border-line bg-bg-soft text-muted hover:text-white"
                    }`}
                  >
                    {v === "public" ? "🌐 Public" : "🔒 Private"}
                  </button>
                ))}
              </div>
            </Field>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Preview / appearance */}
          <aside className="flex flex-col gap-5">
            <div className="card sticky top-24 flex flex-col gap-5 p-5">
              <div className="flex flex-col items-center gap-3 rounded-xl bg-bg-soft p-5">
                <Avatar emoji={avatarEmoji} color={avatarColor} size={80} />
                <div className="text-center">
                  <p className="font-bold">{name || "Character name"}</p>
                  <p className="text-xs text-muted">
                    {tagline || "Tagline preview"}
                  </p>
                </div>
              </div>

              <div>
                <p className="label">Avatar</p>
                <div className="grid grid-cols-8 gap-1.5">
                  {AVATAR_EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setAvatarEmoji(e)}
                      className={`flex h-8 items-center justify-center rounded-lg text-lg transition ${
                        avatarEmoji === e
                          ? "bg-brand/20 ring-1 ring-brand"
                          : "hover:bg-bg-hover"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label">Colour</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className={`h-7 w-7 rounded-full transition ${
                        avatarColor === c
                          ? "ring-2 ring-white ring-offset-2 ring-offset-bg-card"
                          : ""
                      }`}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? "Creating…" : "✦ Create & chat"}
              </button>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted/70">{hint}</p>}
    </div>
  );
}
