const encoder = new TextEncoder();
const decoder = new TextDecoder();

const keyString = Deno.env.get("AES_SECRET_KEY")!;
const keyData = encoder.encode(keyString);
export const aesKey = await crypto.subtle.importKey(
  "raw",
  keyData,
  { name: "AES-GCM" },
  false,
  ["encrypt", "decrypt"],
);

export async function encrypt(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoder.encode(text),
  );
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
}

export async function decrypt(enc) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(enc.iv) },
    aesKey,
    new Uint8Array(enc.data),
  );
  return decoder.decode(decrypted);
}