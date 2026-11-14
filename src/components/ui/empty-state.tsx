import type { ReactNode } from "react";
import { RoadLine } from "./road-line";

type EmptyStateProps = { illustration: ReactNode; message: string; action?: ReactNode };

export function EmptyState({ illustration, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex w-full max-w-64 flex-col items-center gap-2">
        {illustration}
        <RoadLine />
      </div>
      <p className="max-w-80 text-body-lg text-ink">{message}</p>
      {action}
    </div>
  );
}
