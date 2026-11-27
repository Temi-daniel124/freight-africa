import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

// Freight Africa documents (combined brief section 7; sender-mockups README "PDFs"): A4, Plus Jakarta Sans
// embedded (static 500 / 600 / 700 cuts of JakartaFA, OFL), the logo top left and the title top right, a
// 2 px green rule, and on every page the centred mark at 5% and "FREIGHT AFRICA" at -32° and 4.5%, behind
// the content, with page numbers in the footer. pdfkit stays behind this wrapper (TOOLING-POLICY §5.7).

export const C = {
  ink: "#0F1A14",
  ink2: "#3C4A42",
  ink3: "#64716A",
  line: "#E6E8E3",
  paper: "#F5F5F1",
  green: "#0C5034",
  deep: "#083826",
  green300: "#9FD5B6",
};

// px in the HTML templates (794 px wide A4) to points.
export const px = (n: number) => n * 0.75;
export const PAGE = { w: 595.28, h: 841.89, x: px(64), right: 595.28 - px(64) };

const dir = join(process.cwd(), "src/lib/pdf");
let cache: { fonts: Record<number, Buffer>; logo: Buffer; mark: Buffer } | null = null;
function assets() {
  cache ??= {
    fonts: Object.fromEntries([500, 600, 700].map((w) => [w, readFileSync(join(dir, `fonts/JakartaFA-${w}.ttf`))])),
    logo: readFileSync(join(dir, "assets/logo.png")),
    mark: readFileSync(join(dir, "assets/mark.png")),
  };
  return cache;
}

export type Doc = PDFKit.PDFDocument;

/** "₦1,240,000" from kobo, the way the app writes money. */
export const naira = (kobo: number) => `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;

export function newDocument(title: string, meta: { subject: string }) {
  const a = assets();
  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, info: { Title: title, Subject: meta.subject, Author: "Freight Africa" } });
  doc.registerFont("r", a.fonts[500]);
  doc.registerFont("b", a.fonts[600]);
  doc.registerFont("x", a.fonts[700]);
  watermark(doc);
  doc.on("pageAdded", () => watermark(doc));
  return doc;
}

function watermark(doc: Doc) {
  const a = assets();
  const w = px(460);
  const h = (w * 650) / 600;
  doc.save();
  doc.opacity(0.05).image(a.mark, (PAGE.w - w) / 2, (PAGE.h - h) / 2, { width: w });
  doc.restore();
  doc.save();
  doc.rotate(-32, { origin: [PAGE.w / 2, PAGE.h / 2] });
  doc.font("x").fontSize(px(92)).fillColor(C.green).opacity(0.045);
  const word = "FREIGHT AFRICA";
  const spacing = px(4);
  const width = doc.widthOfString(word, { characterSpacing: spacing });
  // No width box, so it never wraps: placed by its own measured width, centred on the page.
  doc.text(word, PAGE.w / 2 - width / 2, PAGE.h / 2 - px(46), { lineBreak: false, characterSpacing: spacing });
  doc.restore();
  doc.opacity(1);
}

/** Logo top left, the title and its lines top right, the 2 px green rule. Returns the y under it. */
export function header(doc: Doc, title: string, lines: string[]) {
  doc.image(assets().logo, PAGE.x, px(56), { width: px(122) });
  doc.font("b").fontSize(px(30)).fillColor(C.ink).text(title, PAGE.x, px(52), { width: PAGE.right - PAGE.x, align: "right", lineBreak: false });
  let y = px(92);
  doc.font("r").fontSize(px(13)).fillColor(C.ink3);
  for (const line of lines) {
    doc.text(line, PAGE.x, y, { width: PAGE.right - PAGE.x, align: "right", lineBreak: false });
    y += px(19);
  }
  const rule = px(168);
  doc.rect(PAGE.x, rule, PAGE.right - PAGE.x, px(2)).fill(C.green);
  return rule + px(26);
}

/** A small capitals label (FROM, BILLED TO, TRIP …). */
export function label(doc: Doc, text: string, x: number, y: number, width?: number, align: "left" | "right" = "left") {
  doc.font("b").fontSize(px(11.5)).fillColor(C.ink3).text(text.toUpperCase(), x, y, { width, align, characterSpacing: px(0.8), lineBreak: false });
}

/** A block of lines: the first in 600 ink, the rest in 500 ink-2. Returns the y under it. */
export function block(doc: Doc, lines: string[], x: number, y: number, width: number, plain = false) {
  let at = y;
  lines.forEach((line, i) => {
    const first = i === 0 && !plain;
    doc.font(first ? "b" : "r").fontSize(px(13.5)).fillColor(first ? C.ink : C.ink2);
    doc.text(line, x, at, { width, lineGap: px(3) });
    at = doc.y;
  });
  return at;
}

/** The footer line and "Page n of m" on every page; call once at the end. */
export function finish(doc: Doc, footer: string): Promise<Buffer> {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = PAGE.h - px(58);
    doc.rect(PAGE.x, y - px(14), PAGE.right - PAGE.x, 0.75).fill(C.line);
    doc.font("r").fontSize(px(10.5)).fillColor(C.ink3);
    doc.text(footer, PAGE.x, y, { lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, PAGE.x, y, { width: PAGE.right - PAGE.x, align: "right", lineBreak: false });
  }
  return new Promise((resolve) => {
    const parts: Buffer[] = [];
    doc.on("data", (c: Buffer) => parts.push(c));
    doc.on("end", () => resolve(Buffer.concat(parts)));
    doc.end();
  });
}

/** A PDF download from a route handler. */
export function pdfResponse(bytes: Buffer, filename: string) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
