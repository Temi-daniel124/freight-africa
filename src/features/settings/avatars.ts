// D045: the 3D faces a person can choose (Microsoft Fluent Emoji 3D, MIT, darker skin tones). Only the
// key is stored (profiles.avatar_key); we never ask for or store gender.
export const AVATARS = ["face-01", "face-02", "face-03", "face-04", "face-05", "face-06", "face-07", "face-08", "face-09", "face-10", "face-11", "face-12"] as const;
export type AvatarKey = (typeof AVATARS)[number];

export function avatarSrc(key: string | null | undefined) {
  return key && (AVATARS as readonly string[]).includes(key) ? `/avatars/${key}.webp` : null;
}
