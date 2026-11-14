// Nigerian mobile numbers: 10 digits after +234 (0803 123 4567 is +2348031234567).
function nationalDigits(raw: string) {
  return raw.replace(/\D/g, "").replace(/^234/, "").replace(/^0/, "");
}

// Shows a number as "803 123 4567" while it is typed.
export function formatNigerianPhone(raw: string) {
  const digits = nationalDigits(raw).slice(0, 10);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean).join(" ");
}

// Returns +234XXXXXXXXXX, or null when it can't be a Nigerian mobile number.
export function normaliseNigerianPhone(raw: string) {
  const digits = nationalDigits(raw);
  return /^[789][01]\d{8}$/.test(digits) ? `+234${digits}` : null;
}
