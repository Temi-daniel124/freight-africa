// D044: the same "obvious PIN" rules as private.pin_is_weak in the database, so a screen can refuse a
// PIN before anything is created (the database still decides).

const FAVOURITES = new Set(["112233", "001122", "102030", "111222", "000111", "123321", "654456", "696969", "101010", "202020", "131313", "200000", "100000"]);

export function pinIsWeak(pin: string): boolean {
  if (!/^\d{6}$/.test(pin)) return true;
  if (/^(.)\1{5}$/.test(pin) || /^(..)\1\1$/.test(pin) || /^(...)\1$/.test(pin)) return true;
  if ("01234567890123456789".includes(pin) || "98765432109876543210".includes(pin)) return true;
  return FAVOURITES.has(pin);
}
