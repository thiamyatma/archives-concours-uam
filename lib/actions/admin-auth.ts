"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";

/**
 * Accès admin minimal : un unique mot de passe (pas de comptes, pas de
 * Supabase Auth — volontairement supprimée avec l'ancien système PDF, voir
 * docs/pdf-downloads.md). Le cookie de session est auto-vérifiable (payload
 * + signature HMAC), donc sans état côté serveur : `ADMIN_PASSWORD` sert à
 * la fois de mot de passe et de clé de signature.
 */
const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours

function sign(payload: string): string {
  return createHmac("sha256", env.ADMIN_PASSWORD ?? "")
    .update(payload)
    .digest("hex");
}

function buildSessionCookieValue(expiresAt: number): string {
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

function isValidSessionCookieValue(value: string): boolean {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return false;
  }

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export interface AdminLoginResult {
  success: boolean;
  error?: string;
}

export async function loginAdmin(password: string): Promise<AdminLoginResult> {
  if (!env.ADMIN_PASSWORD) {
    return { success: false, error: "Accès admin non configuré." };
  }

  const expectedBuf = Buffer.from(env.ADMIN_PASSWORD);
  const actualBuf = Buffer.from(password);
  const matches =
    expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);

  if (!matches) {
    return { success: false, error: "Mot de passe incorrect." };
  }

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, buildSessionCookieValue(expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return { success: true };
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/** Redirige vers /admin/login si la session est absente/invalide/expirée. */
export async function requireAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;

  if (!value || !isValidSessionCookieValue(value)) {
    redirect("/admin/login");
  }
}
