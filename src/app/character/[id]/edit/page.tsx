import { notFound, redirect } from "next/navigation";
import CharacterForm from "@/components/CharacterForm";
import { getCurrentUser } from "@/lib/auth";
import { getCharacter } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/character/${id}/edit`);

  const character = getCharacter(id);
  if (!character) notFound();
  if (character.creatorId !== user.id) redirect(`/character/${id}`);

  return (
    <CharacterForm
      mode="edit"
      character={character}
      creatorName={user.displayName || user.username}
    />
  );
}
