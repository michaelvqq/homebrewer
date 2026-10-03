import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env.server";

// AES-256-GCM; output is base64 "iv.tag.ciphertext".
const key = () => createHash("sha256").update(serverEnv.KEY_ENCRYPTION_SECRET).digest();

export function encryptKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decryptKey(encoded: string): string {
  const [iv, tag, data] = encoded.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// null when the key was sealed with a different KEY_ENCRYPTION_SECRET (e.g. saved locally, read on Vercel).
export function tryDecryptKey(encoded: string): string | null {
  try {
    return decryptKey(encoded);
  } catch {
    return null;
  }
}
