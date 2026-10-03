import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SKIP_ENV_VALIDATION = "1";

test("encryptKey round-trips and does not leak plaintext", async () => {
  const { encryptKey, decryptKey } = await import("./crypto");
  const secret = "sk-ant-test-1234567890";
  const sealed = encryptKey(secret);
  assert.ok(!sealed.includes(secret));
  assert.equal(decryptKey(sealed), secret);
});

test("tampered ciphertext fails to decrypt", async () => {
  const { encryptKey, decryptKey } = await import("./crypto");
  const [iv, tag, data] = encryptKey("sk-abc").split(".");
  const flipped = Buffer.from(data, "base64");
  flipped[0] ^= 1;
  assert.throws(() => decryptKey([iv, tag, flipped.toString("base64")].join(".")));
});
