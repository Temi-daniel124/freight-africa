// How closely a bank's account name matches the verified owner or business name, 0 to 100
// (DATA-MODEL bank_accounts.name_match_score; below 80 waits for staff, SYSTEM-LOGIC §10).
// Words are compared without case, punctuation or business suffixes, in any order, so
// "MUSA IBRAHIM TRANSPORT ENT" matches "Ibrahim Musa" and "Musa Haulage Ltd".

const NOISE = new Set(["LTD", "LIMITED", "ENT", "ENTERPRISE", "ENTERPRISES", "NIG", "NIGERIA", "CO", "COMPANY", "AND", "THE", "MR", "MRS", "MISS", "DR", "ALHAJI", "CHIEF"]);

function words(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !NOISE.has(word));
}

/** The share of the reference name's words found in the account name, as 0–100; the best of several references. */
export function nameMatchScore(accountName: string, references: string[]): number {
  const account = new Set(words(accountName));
  let best = 0;
  for (const reference of references) {
    const wanted = words(reference);
    if (!wanted.length) continue;
    const found = wanted.filter((word) => account.has(word)).length;
    best = Math.max(best, Math.round((found / wanted.length) * 100));
  }
  return best;
}
