// D044: people invited by phone have no email of their own. Their account carries an internal,
// undeliverable address on a host with no mail records, so the server can create their session the same
// way as everyone else's. It is never shown and never mailed.

export const PHONE_ACCOUNT_HOST = "phone.freight-africa.com";

export function internalEmailFor(id: string) {
  return `p-${id.toLowerCase().replace(/[^0-9a-f]/g, "")}@${PHONE_ACCOUNT_HOST}`;
}

export function isInternalEmail(email: string | null | undefined) {
  return !!email && email.toLowerCase().endsWith(`@${PHONE_ACCOUNT_HOST}`);
}

/** The address to show or mail: an internal one is no address at all. */
export function realEmail(email: string | null | undefined) {
  return email && !isInternalEmail(email) ? email : "";
}
