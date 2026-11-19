import { redirect } from "next/navigation";

// After sign-in, /app opens the shell for the person's active role (ux-conventions §2). Organisations and
// roles arrive with slice 4; until then everyone lands in the shipper shell, which checks the session.
export default function AppPage() {
  redirect("/app/ship");
}
