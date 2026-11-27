import "server-only";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env.server";
import { CODE_PROOF_COOKIE, CODE_PROOF_MINUTES, codeProof, codeProofValid } from "./code-proof";

const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/auth" };

export async function setCodeProof(userId: string, sessionId: string) {
  (await cookies()).set(CODE_PROOF_COOKIE, codeProof(userId, sessionId, serverEnv().CODE_HMAC_SECRET), { ...options, maxAge: CODE_PROOF_MINUTES * 60 });
}

export async function hasCodeProof(userId: string, sessionId: string) {
  return codeProofValid((await cookies()).get(CODE_PROOF_COOKIE)?.value, userId, sessionId, serverEnv().CODE_HMAC_SECRET);
}

export async function clearCodeProof() {
  (await cookies()).delete({ name: CODE_PROOF_COOKIE, path: "/auth" });
}
