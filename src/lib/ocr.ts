// Reading plates and expiry dates from photos, on the phone (TOOLING-POLICY: tesseract.js). The reading
// only prefills the field: the person checks it and the value they confirm is what's saved. Nothing
// leaves the phone for this. The worker, engine and English model are served from /tesseract.

/** Nigerian plates: 3 letters, 2–3 digits, 2 letters (LSR 305 GH, KJA-482-XA). Common misreads fixed. */
export function findPlate(text: string): string | null {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9\s-]/g, " ");
  const match = /\b([A-Z]{3})[\s-]*([0-9OIL]{2,3})[\s-]*([A-Z0-9]{2})\b/.exec(cleaned);
  if (!match) return null;
  const digits = match[2].replace(/O/g, "0").replace(/[IL]/g, "1");
  const tail = match[3].replace(/0/g, "O").replace(/1/g, "I");
  if (!/^\d{2,3}$/.test(digits) || !/^[A-Z]{2}$/.test(tail)) return null;
  return `${match[1]}${digits}${tail}`;
}

const MONTHS: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, SEPT: 9, OCT: 10, NOV: 11, DEC: 12 };

function iso(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * The expiry date on a paper, as YYYY-MM-DD: a date next to "expir…" or "valid until" if there is one,
 * otherwise the latest date on the page (papers show issue and expiry; expiry is the later). Day first,
 * as Nigerian papers write it.
 */
export function findExpiry(text: string): string | null {
  const upper = text.toUpperCase();
  const dates: { iso: string; at: number }[] = [];
  for (const m of upper.matchAll(/\b(\d{1,2})[\s./-]+(\d{1,2})[\s./-]+(\d{4}|\d{2})\b/g)) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const value = iso(year, Number(m[2]), Number(m[1]));
    if (value) dates.push({ iso: value, at: m.index ?? 0 });
  }
  for (const m of upper.matchAll(/\b(\d{1,2})(?:ST|ND|RD|TH)?[\s./-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEPT|SEP|OCT|NOV|DEC)[A-Z]*[\s.,/-]*(\d{4})\b/g)) {
    const value = iso(Number(m[3]), MONTHS[m[2]], Number(m[1]));
    if (value) dates.push({ iso: value, at: m.index ?? 0 });
  }
  if (!dates.length) return null;
  const label = /EXP|VALID\s*(UNTIL|TILL|TO)|DUE/.exec(upper);
  if (label) {
    const after = dates.filter((d) => d.at >= label.index).sort((a, b) => a.at - b.at)[0];
    if (after) return after.iso;
  }
  return dates.map((d) => d.iso).sort().at(-1) ?? null;
}

type Worker = { recognize: (image: Blob) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };
let workerPromise: Promise<Worker> | null = null;

async function worker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(({ createWorker }) =>
      createWorker("eng", 1, { workerPath: "/tesseract/worker.min.js", corePath: "/tesseract", langPath: "/tesseract", gzip: true }) as unknown as Promise<Worker>,
    );
  }
  return workerPromise;
}

/** The text in a photo, or "" if it can't be read (old phones, no memory): the person types it instead. */
export async function readText(image: Blob): Promise<string> {
  try {
    const w = await worker();
    const { data } = await w.recognize(image);
    return data.text ?? "";
  } catch {
    workerPromise = null;
    return "";
  }
}
