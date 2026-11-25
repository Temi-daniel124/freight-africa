import { cn } from "@/lib/utils";

/** Two letters from a name: "Adaeze Okafor" is "AO". */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "").slice(0, 2);
  return letters.toUpperCase() || "FA";
}

/** A person's picture (D045): their chosen 3D face, or their initials until they choose one. */
export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-green-50 font-semibold text-green-800", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- small local SVG/PNG faces, no optimisation needed
        <img src={src} alt="" width={size} height={size} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initialsOf(name)}</span>
      )}
    </span>
  );
}
