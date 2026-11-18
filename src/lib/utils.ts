import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our font-size tokens would otherwise be read as text colours and dropped.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "title-1", "title-2", "body-lg", "body", "body-sm", "control", "label", "caption", "micro"],
      radius: ["button", "pill", "input", "inner", "nav", "map", "tile", "card", "sheet"],
      shadow: ["raised", "floating", "pill", "pill-scrolled", "panel-card"],
      tracking: ["caps", "plate"],
    },
    classGroups: {
      "border-w": [{ border: ["field"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
