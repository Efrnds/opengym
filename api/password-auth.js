/* Email/password helpers — Node crypto.scrypt, no extra deps. */
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const MAX_EMAIL = 120;
const MAX_NAME = 40;

export function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase().slice(0, MAX_EMAIL);
}

export function emailOk(email) {
  if (!email || email.length < 5 || email.length > MAX_EMAIL) return false;
  // Practical check — not full RFC; enough to catch typos and junk.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function passwordIssue(raw) {
  const p = String(raw ?? '');
  if (p.length < MIN_PASSWORD) return `password must be at least ${MIN_PASSWORD} characters`;
  if (p.length > MAX_PASSWORD) return `password must be at most ${MAX_PASSWORD} characters`;
  return null;
}

export function nameOk(raw) {
  const n = String(raw || '').trim();
  return n.length > 0 && n.length <= MAX_NAME;
}

/** Encode as scrypt$N$r$p$saltB64$urlHashB64 */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = await scrypt(String(password), salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${Buffer.from(hash).toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  const parts = String(encoded || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const n = +parts[1], r = +parts[2], p = +parts[3];
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  let salt, expect;
  try {
    salt = Buffer.from(parts[4], 'base64url');
    expect = Buffer.from(parts[5], 'base64url');
  } catch { return false; }
  if (!salt.length || expect.length !== KEYLEN) return false;
  let got;
  try {
    got = await scrypt(String(password), salt, KEYLEN, { N: n, r, p });
  } catch { return false; }
  try {
    return crypto.timingSafeEqual(Buffer.from(got), expect);
  } catch { return false; }
}

/** Find user by normalized email. */
export function findUserByEmail(users, email) {
  const e = normalizeEmail(email);
  if (!e) return null;
  return users.find(u => u.email === e) || null;
}

/**
 * Sliding-window attempt counter keyed by IP (or email). Returns true if the
 * attempt is allowed and recorded; false if the bucket is full.
 */
export function checkAuthRateLimit(map, key, { limit = 20, windowMs = 15 * 60 * 1000, now = Date.now() } = {}) {
  if (!key) return true;
  let rec = map.get(key);
  if (!rec || rec.resetAt <= now) {
    rec = { count: 0, resetAt: now + windowMs };
    map.set(key, rec);
  }
  if (rec.count >= limit) return false;
  rec.count++;
  return true;
}
