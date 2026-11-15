import { describe, expect, it } from "vitest";
import { publicEnvSchema } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://czlowhaycaivpgimcefk.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_0123456789abcdef",
};

describe("publicEnvSchema", () => {
  it("accepts the Supabase URL and key and defaults the site URL", () => {
    expect(publicEnvSchema.parse(valid).NEXT_PUBLIC_SITE_URL).toBe("https://freight-africa.com");
  });

  it("fails loudly when a value is missing or malformed", () => {
    expect(() => publicEnvSchema.parse({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined })).toThrow();
    expect(() => publicEnvSchema.parse({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow();
  });
});
