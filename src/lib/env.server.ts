import "server-only";
import { z } from "zod";

// Server-only secrets (SECURITY.md section 2.1). Values for later slices are optional until the slice that
// uses them lands; that code checks for them and fails loudly when they are missing.
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
  CODE_HMAC_SECRET: z.string().min(32),
  JOBS_SECRET: z.string().min(32).optional(),
  TRACK_TOKEN_SECRET: z.string().min(32).optional(),
  RESEND_API_KEY: z.string().min(10).optional(),
  EMAIL_FROM: z.string().min(3).default("Freight Africa <no-reply@mail.freight-africa.com>"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

// Read lazily so a build without secrets still succeeds; a request without them fails loudly.
export function serverEnv(): ServerEnv {
  cached ??= serverEnvSchema.parse(process.env);
  return cached;
}
