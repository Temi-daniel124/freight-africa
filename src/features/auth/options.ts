import "server-only";

// Which sign-in methods are switched on. Email codes always work. Google and WhatsApp stay off until the
// founder has set up the Google OAuth client and the WhatsApp number (PROJECT-STATE.md section 4); each is
// switched on with a Vercel environment variable set to "on". These move to the settings table when the
// settings slice of Phase 1 lands.
export type SignInOptions = { google: boolean; whatsapp: boolean };

export function signInOptions(): SignInOptions {
  return {
    google: process.env.AUTH_GOOGLE === "on",
    whatsapp: process.env.AUTH_WHATSAPP === "on",
  };
}
