#!/usr/bin/env node
// Verifies that commits in this repository will be authored as the founder (D024).
// Usage: node scripts/check-git-identity.mjs          full check (session start)
//        node scripts/check-git-identity.mjs --quick  config only (used by the pre-commit hook)
import { execFileSync } from "node:child_process";

const NAME = "Temi-daniel124";
const EMAIL = "temmydaniel124@gmail.com";
const quick = process.argv.includes("--quick");

const git = (...args) => {
  try {
    return execFileSync("git", args, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};

if (git("rev-parse", "--is-inside-work-tree") !== "true") {
  console.error("Not inside a Git repository. Run: git init -b main");
  process.exit(1);
}

const problems = [];
const name = git("config", "user.name");
const email = git("config", "user.email");

if (name !== NAME) {
  problems.push(`user.name is "${name || "(not set)"}". Fix: git config user.name "${NAME}"`);
}
if (email !== EMAIL) {
  problems.push(`user.email is "${email || "(not set)"}". Fix: git config user.email "${EMAIL}"`);
}
if (git("config", "core.hooksPath") !== ".githooks") {
  problems.push("Git hooks are not active. Fix: git config core.hooksPath .githooks");
}

// Environment variables override Git config, so check them too.
const envExpect = {
  GIT_AUTHOR_NAME: NAME,
  GIT_COMMITTER_NAME: NAME,
  GIT_AUTHOR_EMAIL: EMAIL,
  GIT_COMMITTER_EMAIL: EMAIL,
};
for (const [key, expected] of Object.entries(envExpect)) {
  const value = process.env[key];
  if (value && value !== expected) {
    problems.push(`${key}="${value}" (from the shell or a --author option) overrides Git config. Unset it or use "${expected}".`);
  }
}

if (!quick && git("rev-parse", "--verify", "HEAD")) {
  const author = git("log", "-1", "--format=%an <%ae>");
  if (author !== `${NAME} <${EMAIL}>`) {
    problems.push(
      `The last commit is authored by "${author}". If it isn't pushed yet: git commit --amend --reset-author --no-edit`,
    );
  }
  if (/^\s*co-authored-by:/im.test(git("log", "-1", "--format=%B"))) {
    problems.push("The last commit has a Co-authored-by line. Amend it before pushing (D024).");
  }
}

if (problems.length) {
  console.error("Git identity check FAILED (docs/DEVELOPMENT-WORKFLOW.md §3):");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`OK: commits will be authored as ${NAME} <${EMAIL}>`);
