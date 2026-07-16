"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getClientIp } from "@/lib/http/client-ip";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPassword } from "@/lib/auth/password";

const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

/**
 * Accès admin par comptes email + mot de passe (table `admin_users`, mots de
 * passe hachés scrypt — voir lib/auth/password.ts). Le cookie de session est
 * auto-vérifiable (payload + signature HMAC) : `ADMIN_PASSWORD` ne sert plus
 * d'identifiant mais UNIQUEMENT de clé de signature serveur (déjà présent sur
 * Vercel, aucune nouvelle variable à configurer). Le payload embarque l'`id`
 * de l'admin connecté. La révocation (déconnexion) reste globale via une seule
 * ligne en base (admin_session_state.revoked_at).
 */
const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours

function sign(payload: string): string {
  return createHmac("sha256", env.ADMIN_PASSWORD ?? "")
    .update(payload)
    .digest("hex");
}

function buildSessionCookieValue(
  issuedAt: number,
  expiresAt: number,
  adminId: string
): string {
  // adminId est un uuid (pas de "." dedans) → délimiteur sûr.
  const payload = `${issuedAt}.${expiresAt}.${adminId}`;
  return `${payload}.${sign(payload)}`;
}

/** Vérifie signature + expiration seulement — la révocation est un check séparé (voir getRevokedAt). */
function parseSessionCookieValue(
  value: string
): { issuedAt: number; expiresAt: number; adminId: string } | null {
  const [issuedAtRaw, expiresAtRaw, adminId, signature] = value.split(".");
  if (!issuedAtRaw || !expiresAtRaw || !adminId || !signature) return null;

  const payload = `${issuedAtRaw}.${expiresAtRaw}.${adminId}`;
  const expected = sign(payload);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return null;
  }

  const issuedAt = Number(issuedAtRaw);
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) return null;
  if (Date.now() >= expiresAt) return null;

  return { issuedAt, expiresAt, adminId };
}

/** Horodatage de la dernière déconnexion (0 si jamais révoqué ou en cas d'erreur). */
async function getRevokedAt(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("admin_session_state")
      .select("revoked_at")
      .eq("id", true)
      .maybeSingle();
    return data ? new Date(data.revoked_at).getTime() : 0;
  } catch {
    // Supabase indisponible : on dégrade vers signature + expiration seules
    // plutôt que de bloquer tout accès admin pour une panne non liée à l'auth.
    return 0;
  }
}

export interface AdminLoginResult {
  success: boolean;
  error?: string;
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<AdminLoginResult> {
  if (!env.ADMIN_PASSWORD) {
    return { success: false, error: "Accès admin non configuré." };
  }

  const ip = getClientIp(await headers());
  const allowed = await checkActionRateLimit(
    ip,
    "admin_login",
    LOGIN_RATE_LIMIT,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return {
      success: false,
      error: "Trop de tentatives. Réessayez dans quelques minutes.",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const genericError = "Email ou mot de passe incorrect.";

  let admin: { id: string; password_hash: string } | null = null;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("admin_users")
      .select("id, password_hash")
      .eq("email", normalizedEmail)
      .maybeSingle();
    admin = data;
  } catch {
    return { success: false, error: "Service indisponible. Réessayez." };
  }

  // Message identique compte inconnu / mauvais mot de passe (pas d'énumération).
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return { success: false, error: genericError };
  }

  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_SECONDS * 1000;
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    buildSessionCookieValue(issuedAt, expiresAt, admin.id),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    }
  );

  return { success: true };
}

export async function logoutAdmin(): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase
      .from("admin_session_state")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", true);
  } catch {
    // Best-effort : le cookie local est supprimé dans tous les cas ci-dessous.
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export interface AdminSession {
  adminId: string;
}

/**
 * Redirige vers /admin/login si la session est absente/invalide/expirée/
 * révoquée. Renvoie l'admin courant (id) pour les usages qui en ont besoin.
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  const parsed = value ? parseSessionCookieValue(value) : null;

  if (!parsed) {
    redirect("/admin/login");
  }

  const revokedAt = await getRevokedAt();
  if (parsed.issuedAt <= revokedAt) {
    redirect("/admin/login");
  }

  return { adminId: parsed.adminId };
}
