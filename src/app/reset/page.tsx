import { Suspense } from "react";
import ResetForm from "@/components/ResetForm";

export const dynamic = "force-dynamic";

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
