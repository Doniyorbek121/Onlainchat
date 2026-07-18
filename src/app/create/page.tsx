import { redirect } from "next/navigation";
import CreateCharacterForm from "@/components/CreateCharacterForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/create");
  return <CreateCharacterForm creatorName={user.displayName || user.username} />;
}
