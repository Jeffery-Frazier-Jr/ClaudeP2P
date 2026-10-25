// Turns a public key into a short, readable tag like "7F3K".
// The real backend will compute this from the key in Rust; this mirrors it.
// Crockford base32 skips I, L, O and U so tags are hard to misread.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function tagFromId(hexId: string): string {
  // First 20 bits of the key → 4 base32 characters.
  const bits = parseInt(hexId.slice(0, 5), 16);
  let tag = '';
  for (let i = 3; i >= 0; i--) tag += ALPHABET[(bits >> (i * 5)) & 31];
  return tag;
}
