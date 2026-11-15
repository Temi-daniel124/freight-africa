import { ArrowLeftRight } from "lucide-react";
import { Fragment } from "react";

const SEPARATOR = " ⇄ ";

// "⇄" isn't in Inter (src/app/fonts/README.md), so the two-way arrow in corridor names is drawn as a Lucide
// icon. Screen readers hear "to"; copying the text gives the plain arrow.
export function CorridorText({ text }: { text: string }) {
  const parts = text.split(SEPARATOR);
  if (parts.length === 1) return text;
  // One span, so a flex parent (a chip) treats the name as one piece of text that can wrap.
  return (
    <span>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <>
              <span className="sr-only"> to </span>
              <ArrowLeftRight
                aria-hidden
                className="mx-[0.25em] inline-block size-[0.875em] -translate-y-[0.0625em] align-middle"
                strokeWidth={2}
              />
            </>
          ) : null}
          {part}
        </Fragment>
      ))}
    </span>
  );
}
