import { cn } from "@/lib/utils";
import { Box, City, Cloud, Pin, Platform, Route, Shield } from "./pieces";

// D045 scenes built from the pieces. Decorative: hidden from screen readers.

type SceneProps = { className?: string };

/** Welcome and onboarding: the city, clouds, a platform with the pin, shield and box on a dashed route. */
export function SafeTripScene({ className }: SceneProps) {
  return (
    <svg viewBox="0 0 400 360" aria-hidden className={cn("h-auto w-full", className)}>
      <City x={70} y={230} s={1} />
      <Cloud x={92} y={84} s={0.9} />
      <Cloud x={318} y={64} s={1.1} />
      <Pin x={72} y={196} s={0.38} />
      <Pin x={330} y={170} s={0.34} />
      <Platform x={200} y={262} w={330} />
      <Route d="M44 250 C70 226 100 236 120 252 S170 300 210 292 S290 250 330 268 S360 300 340 318" />
      <Pin x={150} y={268} s={1.15} />
      <Box x={252} y={274} s={0.95} />
      <Shield x={196} y={294} s={0.82} />
    </svg>
  );
}

/** Track a trip: the box with a pin beside it, under two clouds. */
export function TrackScene({ className }: SceneProps) {
  return (
    <svg viewBox="0 0 320 220" aria-hidden className={cn("h-auto w-full", className)}>
      <Cloud x={84} y={58} s={0.8} />
      <Cloud x={252} y={44} s={0.95} />
      <Route d="M40 196 C90 170 130 200 170 190 S250 160 290 176" />
      <Box x={140} y={190} s={1.1} />
      <Pin x={232} y={196} s={0.95} />
    </svg>
  );
}

/** Empty states: a single box on the platform with a cloud. */
export function EmptyScene({ className }: SceneProps) {
  return (
    <svg viewBox="0 0 240 180" aria-hidden className={cn("h-auto w-full", className)}>
      <Cloud x={70} y={50} s={0.7} />
      <Cloud x={186} y={36} s={0.8} />
      <Platform x={120} y={136} w={200} />
      <Box x={120} y={150} s={0.8} />
    </svg>
  );
}
