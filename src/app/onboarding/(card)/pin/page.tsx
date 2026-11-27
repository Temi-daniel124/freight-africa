import { redirect } from "next/navigation";

// The PIN moved to sign-in for everyone (D044); old links land on the new screens.
export default function OldPinPage() {
  redirect("/auth/pin/new?next=/app/drive");
}
