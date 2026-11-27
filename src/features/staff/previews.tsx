import type { ReactNode } from "react";

// Staff screens whose backend belongs to a later phase (combined brief 5f): built with sample data and
// shown only in /dev. Each entry says its phase in PROJECT-STATE ("UI built, backend Phase N").
export const STAFF_PREVIEWS: Record<string, () => ReactNode> = {};

export function StaffPreviews({ screen }: { screen: string }) {
  const render = STAFF_PREVIEWS[screen];
  return render ? <>{render()}</> : null;
}
