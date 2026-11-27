import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StaffShell } from "@/features/shell/staff-shell";
import { NoAccess, StaffOverview, StaffWork } from "@/features/staff/home";
import { StaffPreviews, STAFF_PREVIEWS } from "@/features/staff/previews";

export const metadata: Metadata = { title: "Staff console screens", robots: { index: false, follow: false } };

// The staff console frame and pages (admin-mockups). Preview and development only: without a staff
// session the database returns nothing, so the lists show their empty states; later-phase screens use
// their own sample data, clearly only here.

const clock = () => Date.now();
type Search = Promise<{ screen?: string }>;

async function Chosen({ searchParams }: { searchParams: Search }) {
  const { screen = "work" } = await searchParams;
  const person = { name: "Kemi Ogunleye", role: "Operations" };
  if (screen === "work") return <StaffShell base="/dev/staff" page="work" person={person}><StaffWork name={person.name} now={clock()} /></StaffShell>;
  if (screen === "overview") return <StaffShell base="/dev/staff" page="overview" person={{ name: "Temi Adebayo", role: "Super admin" }}><StaffOverview now={clock()} /></StaffShell>;
  if (screen === "noaccess") return <StaffShell base="/dev/staff" page="fees" person={{ name: "Tolu Bakare", role: "Support" }} staffRole="support" bare><NoAccess page="fees" /></StaffShell>;
  if (screen in STAFF_PREVIEWS) return <StaffPreviews screen={screen} />;
  notFound();
}

export default function StaffScreensPage({ searchParams }: { searchParams: Search }) {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  return (
    <Suspense>
      <Chosen searchParams={searchParams} />
    </Suspense>
  );
}
