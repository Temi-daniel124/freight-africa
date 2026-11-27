import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A "use server" file may only export async functions; anything else makes Next reject the whole
// module at request time, so every action in it fails (it took booking down once). Types are fine.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('"use server" files', () => {
  const servers = files("src").filter((f) => /^\s*["']use server["']/.test(readFileSync(f, "utf8")));
  it("are found", () => expect(servers.length).toBeGreaterThan(5));
  it.each(servers)("%s exports only async functions and types", (file) => {
    const bad = readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => /^export\s+(const|let|var|class|function\s|\{|default\s+(?!async))/.test(line) && !/^export\s+\{\s*type\b|^export\s+type\b/.test(line));
    expect(bad).toEqual([]);
  });
});
