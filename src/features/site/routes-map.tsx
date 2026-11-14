"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useState, type ReactNode } from "react";
import { StatusChip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import { MAP_HEIGHT, MAP_WIDTH, cities, corridorPaths, labelled, outlinePath, point } from "./nigeria-map";

type Corridor = { slug: string; name: string };
type RoutesMapProps = { heading: ReactNode; corridors: Corridor[]; status: string; mapLabel: string };

// DESIGN_SYSTEM.md 13.3 item 6: the corridors draw themselves on scroll; a card highlights its corridor.
export function RoutesMap({ heading, corridors, status, mapLabel }: RoutesMapProps) {
  const reduce = useReducedMotion();
  const [focus, setFocus] = useState<string | null>(null);

  return (
    <section id="routes" aria-labelledby="routes-title" className="bg-surface py-16 lg:py-24">
      <div className="mx-auto grid max-w-site gap-10 px-4 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-6">
        <div className="flex flex-col gap-8 lg:col-span-5">
          {heading}
          <ul className="flex flex-col gap-3">
            {corridors.map((corridor) => (
              <li key={corridor.slug}>
                <button
                  type="button"
                  aria-pressed={focus === corridor.slug}
                  onMouseEnter={() => setFocus(corridor.slug)}
                  onMouseLeave={() => setFocus(null)}
                  onFocus={() => setFocus(corridor.slug)}
                  onBlur={() => setFocus(null)}
                  onClick={() => setFocus(focus === corridor.slug ? null : corridor.slug)}
                  className={cn(
                    "flex min-h-16 w-full items-center justify-between gap-4 rounded-inner border px-4 py-3 text-left transition-colors motion-quick",
                    focus === corridor.slug ? "border-green-700 bg-green-50" : "border-line bg-surface hover:bg-green-50",
                  )}
                >
                  <span className="text-body-lg font-semibold text-ink">{corridor.name}</span>
                  <StatusChip tone="neutral" className="shrink-0">
                    {status}
                  </StatusChip>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-7">
          <svg role="img" aria-label={mapLabel} viewBox={`-60 -10 ${MAP_WIDTH + 120} ${MAP_HEIGHT + 20}`} className="h-auto w-full">
            <path d={outlinePath} className="fill-green-50 stroke-green-200" strokeWidth="2" strokeLinejoin="round" />
            {corridors.map((corridor, index) => {
              const dimmed = focus !== null && focus !== corridor.slug;
              return (
                <g key={corridor.slug} className={cn("transition-opacity motion-quick", dimmed ? "opacity-30" : "opacity-100")}>
                  <m.path
                    d={corridorPaths[corridor.slug]}
                    fill="none"
                    strokeWidth={focus === corridor.slug ? 9 : 7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="stroke-green-700"
                    initial={reduce ? false : { pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 1.2, delay: index * 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                  <path d={corridorPaths[corridor.slug]} fill="none" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" className="stroke-white" />
                </g>
              );
            })}
            {Object.keys(cities).map((key) => {
              const [x, y] = point(key as keyof typeof cities);
              return <circle key={key} cx={x} cy={y} r="5" className="fill-surface stroke-green-700" strokeWidth="2.5" />;
            })}
            {labelled.map(({ key, dx, dy, anchor }) => {
              const [x, y] = point(key);
              return (
                <text key={key} x={x + dx} y={y + dy} textAnchor={anchor} className="fill-ink text-label">
                  {cities[key].name}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}
