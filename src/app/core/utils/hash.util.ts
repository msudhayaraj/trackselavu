/** Simple, fast, deterministic string hash (FNV-1a) for SMS fingerprinting. Not cryptographic. */
export function fingerprintText(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ').toLowerCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** SHA-256 hex digest, used for app-lock PIN hashing. Never store the raw PIN. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
