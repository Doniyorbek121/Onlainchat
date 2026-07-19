import { redirect } from "next/navigation";
import CharacterForm from "@/components/CharacterForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/create");
  return <CharacterForm creatorName={user.displayName || user.username} />;
}
