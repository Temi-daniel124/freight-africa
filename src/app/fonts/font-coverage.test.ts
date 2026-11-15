import { readFileSync } from "node:fs";
import { join } from "node:path";
import { brotliDecompressSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import messages from "@/messages/en.json";

// DESIGN_SYSTEM.md 2.1: every character in the interface must exist in InterFA.woff2, or it is drawn in a
// fallback font. This reads the font's character map straight from the WOFF2 file.

// The WOFF2 known-table list, in spec order (index = the low 6 bits of a directory entry's flags).
const KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca",
  "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea",
  "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL",
  "SVG ", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar",
  "gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat",
  "Gloc", "Feat", "Sill",
];

function readBase128(buf: Buffer, pos: { at: number }) {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = buf[pos.at++];
    value = (value << 7) | (byte & 0x7f);
    if (!(byte & 0x80)) return value;
  }
  throw new Error("bad UIntBase128");
}

function codePoints(file: string) {
  const buf = readFileSync(file);
  const numTables = buf.readUInt16BE(12);
  const compressedSize = buf.readUInt32BE(20);
  const pos = { at: 48 };
  const tables: { tag: string; length: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[pos.at++];
    let tag = KNOWN_TAGS[flags & 0x3f];
    if ((flags & 0x3f) === 63) {
      tag = buf.toString("latin1", pos.at, pos.at + 4);
      pos.at += 4;
    }
    const version = flags >> 6;
    const origLength = readBase128(buf, pos);
    const transformed = tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    tables.push({ tag, length: transformed ? readBase128(buf, pos) : origLength });
  }
  const data = brotliDecompressSync(buf.subarray(pos.at, pos.at + compressedSize));
  let offset = 0;
  let cmap: Buffer | undefined;
  for (const table of tables) {
    if (table.tag === "cmap") cmap = data.subarray(offset, offset + table.length);
    offset += table.length;
  }
  if (!cmap) throw new Error("no cmap table");

  const points = new Set<number>();
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const sub = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(sub);
    if (format === 12) {
      for (let g = 0; g < cmap.readUInt32BE(sub + 12); g++) {
        const start = cmap.readUInt32BE(sub + 16 + g * 12);
        const end = cmap.readUInt32BE(sub + 20 + g * 12);
        for (let c = start; c <= end; c++) points.add(c);
      }
    } else if (format === 4) {
      const segments = cmap.readUInt16BE(sub + 6) / 2;
      for (let s = 0; s < segments; s++) {
        const end = cmap.readUInt16BE(sub + 14 + s * 2);
        const start = cmap.readUInt16BE(sub + 16 + segments * 2 + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) points.add(c);
      }
    }
  }
  return points;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("InterFA.woff2", () => {
  const font = codePoints(join(__dirname, "InterFA.woff2"));

  it("has the naira sign and the letters for Hausa, Yoruba and Igbo", () => {
    for (const ch of "₦ɓɗƙƁƊƘẹọṣịụṅǹ") expect(font.has(ch.codePointAt(0)!), ch).toBe(true);
  });

  it("has no ⇄, which is why CorridorText draws it as an icon", () => {
    expect(font.has(0x21c4)).toBe(false);
  });

  it("covers every character in src/messages/en.json", () => {
    // ⇄ is drawn as an icon by CorridorText, never as text.
    const text = strings(messages).join("").replaceAll("⇄", "");
    const missing = [...new Set(text)].filter((ch) => !/\s/.test(ch) && !font.has(ch.codePointAt(0)!));
    expect(missing).toEqual([]);
  });
});
