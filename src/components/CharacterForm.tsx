"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { apiFetch } from "@/lib/http";
import {
  CATEGORIES,
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  type Character,
} from "@/lib/types";

export default function CharacterForm({
  creatorName,
  mode = "create",
  character,
}: {
  creatorName: string;
  mode?: "create" | "edit";
  character?: Character;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [name, setName] = useState(character?.name ?? "");
  const [tagline, setTagline] = useState(character?.tagline ?? "");
  const [description, setDescription] = useState(character?.description ?? "");
  const [greeting, setGreeting] = useState(character?.greeting ?? "");
  const [persona, setPersona] = useState(character?.persona ?? "");
  const [category, setCategory] = useState<string>(
    character?.category ?? "Assistant"
  );
  const [avatarEmoji, setAvatarEmoji] = useState(
    character?.avatarEmoji ?? AVATAR_EMOJIS[0]
  );
  const [avatarColor, setAvatarColor] = useState(
    character?.avatarColor ?? AVATAR_COLORS[0]
  );
  const [avatarImage, setAvatarImage] = useState(character?.avatarImage ?? "");
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [visibility, setVisibility] = useState<"public" | "private">(
    character?.visibility ?? "public"
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setImageError(null);
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageError("Image is too large (max 8MB).");
      return;
    }
    try {
      const dataUrl = await resizeToDataUrl(file, 256);
      setAvatarImage(dataUrl);
    } catch {
      setImageError("Couldn't process that image.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please give your character a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(
        isEdit ? `/api/characters/${character!.id}` : "/api/characters",
        {
          method: isEdit ? "PATCH" : "POST",
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
            avatarImage,
            visibility,
            creatorName,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || `Could not ${isEdit ? "save" : "create"} character`
        );
      router.push(isEdit ? `/character/${data.character.id}` : `/chat/${data.character.id}`);
      router.refresh();
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
          <h1 className="text-lg font-bold">
            {isEdit ? "Edit character" : "Create a character"}
          </h1>
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
                <Avatar
                  emoji={avatarEmoji}
                  color={avatarColor}
                  imageUrl={avatarImage}
                  size={80}
                />
                <div className="text-center">
                  <p className="font-bold">{name || "Character name"}</p>
                  <p className="text-xs text-muted">
                    {tagline || "Tagline preview"}
                  </p>
                </div>
              </div>

              <div>
                <p className="label">Photo</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickImage}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="btn-ghost flex-1 !py-2 text-xs"
                  >
                    {avatarImage ? "Change photo" : "📷 Upload photo"}
                  </button>
                  {avatarImage && (
                    <button
                      type="button"
                      onClick={() => setAvatarImage("")}
                      className="btn-ghost !py-2 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {imageError && (
                  <p className="mt-1.5 text-xs text-red-300">{imageError}</p>
                )}
                {avatarImage && (
                  <p className="mt-1.5 text-xs text-muted/70">
                    A photo overrides the emoji avatar below.
                  </p>
                )}
              </div>

              <div>
                <p className="label">Emoji</p>
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
                {saving
                  ? "Saving…"
                  : isEdit
                  ? "✓ Save changes"
                  : "✦ Create & chat"}
              </button>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}

/** Draws the image centre-cropped into a `size`×`size` square and returns a
 *  compressed JPEG data URL, keeping avatar payloads small enough to store. */
function resizeToDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load error"));
    };
    img.src = url;
  });
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
