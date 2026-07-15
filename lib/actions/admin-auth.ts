"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getClientIp } from "@/lib/http/client-ip";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

/**
 * Accès admin minimal : un unique mot de passe (pas de comptes, pas de
 * Supabase Auth — volontairement supprimée avec l'ancien système PDF, voir
 * docs/pdf-downloads.md). Le cookie de session est auto-vérifiable (payload
 * + signature HMAC) : `ADMIN_PASSWORD` sert à la fois de mot de passe et de
 * clé de signature. Seule la RÉVOCATION (déconnexion) a besoin d'un état
 * côté serveur — une seule ligne en base (admin_session_state.revoked_at)
 * suffit pour un usage mono-admin : se déconnecter invalide immédiatement
 * tous les cookies émis avant, même une copie capturée ailleurs.
 */
const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours

function sign(payload: string): string {
  return createHmac("sha256", env.ADMIN_PASSWORD ?? "")
    .update(payload)
    .digest("hex");
}

function buildSessionCookieValue(issuedAt: number, expiresAt: number): string {
  const payload = `${issuedAt}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Vérifie signature + expiration seulement — la révocation est un check séparé (voir getRevokedAt). */
function parseSessionCookieValue(
  value: string
): { issuedAt: number; expiresAt: number } | null {
  const [issuedAtRaw, expiresAtRaw, signature] = value.split(".");
  if (!issuedAtRaw || !expiresAtRaw || !signature) return null;

  const payload = `${issuedAtRaw}.${expiresAtRaw}`;
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

  return { issuedAt, expiresAt };
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
    // Supabase indisponible : on dégrade vers le comportement d'avant cette
    // fonctionnalité (signature + expiration seules) plutôt que de bloquer
    // tout accès admin pour une panne non liée à l'authentification.
    return 0;
  }
}

export interface AdminLoginResult {
  success: boolean;
  error?: string;
}

export async function loginAdmin(password: string): Promise<AdminLoginResult> {
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

  const expectedBuf = Buffer.from(env.ADMIN_PASSWORD);
  const actualBuf = Buffer.from(password);
  const matches =
    expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);

  if (!matches) {
    return { success: false, error: "Mot de passe incorrect." };
  }

  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_SECONDS * 1000;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, buildSessionCookieValue(issuedAt, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

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
    // Best-effort : le cookie local est supprimé dans tous les cas juste
    // en dessous, donc ce navigateur perd sa session même si la révocation
    // en base (qui protège contre une copie du cookie capturée ailleurs)
    // échoue exceptionnellement.
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/** Redirige vers /admin/login si la session est absente/invalide/expirée/révoquée. */
export async function requireAdminSession(): Promise<void> {
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
}
