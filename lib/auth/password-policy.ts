export type PasswordPolicyError = { ok: false; reason: string };
export type PasswordPolicyOk = { ok: true };

export function validatePolicy(password: string): PasswordPolicyOk | PasswordPolicyError {
  if (password.length < 12) return { ok: false, reason: "Password must be at least 12 characters." };
  if (!/[a-z]/.test(password)) return { ok: false, reason: "Password must contain a lowercase letter." };
  if (!/[A-Z]/.test(password)) return { ok: false, reason: "Password must contain an uppercase letter." };
  if (!/\d/.test(password)) return { ok: false, reason: "Password must contain a digit." };
  if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, reason: "Password must contain a symbol." };
  return { ok: true };
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function randomIndex(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function pick(set: string): string {
  return set[randomIndex(set.length)] ?? set[0]!;
}

/** Policy-compliant password for admin-set resets (not the 8-digit invite OTP). */
export function generateRandomPassword(length = 16): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    const tmp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = tmp;
  }
  return chars.join("");
}
