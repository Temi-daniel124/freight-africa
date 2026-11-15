// Where a sign-up came from (privacy notice: "where you heard about us, if the link you used tells us").
// A share link such as https://freight-africa.com/?ref=whatsapp may land on any page, so the proxy keeps
// the link's name in a session cookie until the waitlist form is sent. It holds only that name.
export const SOURCE_COOKIE = "fa_ref";

const SOURCE_PATTERN = /^[a-z0-9_.-]{1,64}$/;

/** The link's name, lower-cased, or undefined when it is missing or not a plain name. */
export function cleanSource(value: string | null | undefined): string | undefined {
  const source = value?.trim().toLowerCase();
  return source && SOURCE_PATTERN.test(source) ? source : undefined;
}
