import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hachage de mot de passe pour les comptes admin (`admin_users`). scrypt
 * (natif `node:crypto`, aucune dépendance) avec un sel aléatoire par compte.
 * Format stocké : `sel_hex:hash_hex`. Les mots de passe ne sont JAMAIS
 * stockés en clair — seule cette forme hachée vit en base.
 */
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

/** Vérification à temps constant (résiste au timing attack). */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
