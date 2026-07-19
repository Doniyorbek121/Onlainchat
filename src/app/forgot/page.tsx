import { Suspense } from "react";
import { redirect } from "next/navigation";
import ForgotForm from "@/components/ForgotForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
