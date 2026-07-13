/**
 * Scrape polytech.sn et indexe son contenu dans Supabase pour l'assistant IA.
 *
 * Usage : npm run scrape:polytech
 * Requiert NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans
 * l'environnement (chargés depuis .env.local en local, ou injectés en
 * secrets dans le workflow GitHub Actions en CI/cron).
 *
 * Approche volontairement simple (pas de framework de crawling) : parcours
 * en largeur (BFS) du site, même origine uniquement, profondeur et nombre de
 * pages plafonnés pour rester poli avec le serveur de l'école.
 */
import "dotenv/config";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import type { Database } from "../types/database";

const ORIGIN = "https://polytech.sn";
const MAX_PAGES = 200;
const MAX_DEPTH = 4;
const REQUEST_DELAY_MS = 400;
const CHUNK_TARGET_SIZE = 1100;
const CHUNK_OVERLAP = 150;
const USER_AGENT =
  "ArchivesConcoursUAM-Bot/1.0 (+https://github.com/thiamyatma/archives-concours-uam)";

const SKIP_PATH_PATTERNS = [
  /\/wp-admin\//,
  /\/wp-json\//,
  /\/feed\/?$/,
  /\/xmlrpc\.php$/,
  /\?replytocom=/,
  /\/wp-content\/uploads\//, // fichiers (pdf, images...), pas des pages HTML
];

function log(message: string) {
  console.log(`[scrape-polytech] ${message}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour lancer le scraping."
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Parseur minimal de robots.txt : ne gère que `User-agent: *` + `Disallow`. */
async function fetchDisallowedPaths(): Promise<string[]> {
  try {
    const res = await fetch(`${ORIGIN}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return [];

    const text = await res.text();
    const disallowed: string[] = [];
    let inWildcardBlock = false;

    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (/^user-agent:\s*\*/i.test(line)) {
        inWildcardBlock = true;
        continue;
      }
      if (/^user-agent:/i.test(line)) {
        inWildcardBlock = false;
        continue;
      }
      const match = inWildcardBlock ? /^disallow:\s*(\S+)/i.exec(line) : null;
      if (match) disallowed.push(match[1]!);
    }

    return disallowed;
  } catch {
    return [];
  }
}

function isDisallowed(pathname: string, disallowedPaths: string[]) {
  return disallowedPaths.some((prefix) => pathname.startsWith(prefix));
}

function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    url.hash = "";
    if (url.origin !== ORIGIN) return null;
    if (SKIP_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname + url.search))) {
      return null;
    }
    // Normalise le slash final pour éviter les doublons /page et /page/.
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return null;
  }
}

interface ScrapedPage {
  url: string;
  title: string;
  section: string;
  text: string;
  links: string[];
}

function extractSection(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment ?? "accueil";
}

async function scrapePage(url: string): Promise<ScrapedPage | null> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok || !contentType.includes("text/html")) return null;

  const html = await res.text();
  const $ = cheerio.load(html);

  $("script, style, noscript, nav, header, footer, form, iframe, svg").remove();

  const links = $("a[href]")
    .map((_, el) => $(el).attr("href") ?? "")
    .get()
    .map((href) => normalizeUrl(href, url))
    .filter((href): href is string => Boolean(href));

  const title = $("title").first().text().trim() || $("h1").first().text().trim() || url;

  const contentRoot = $("main, article, .entry-content, #content").first();
  const scope = contentRoot.length > 0 ? contentRoot : $("body");

  const text = scope
    .find("h1, h2, h3, h4, p, li, td, th, figcaption")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((line) => line.length > 0)
    .join("\n");

  return {
    url,
    title,
    section: extractSection(new URL(url).pathname),
    text,
    links,
  };
}

/** Découpe un texte en passages de taille cible, avec chevauchement, sans couper les lignes. */
function chunkText(text: string): string[] {
  const lines = text.split("\n").filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    current.push(line);
    currentLength += line.length + 1;

    if (currentLength >= CHUNK_TARGET_SIZE) {
      chunks.push(current.join("\n"));
      // Chevauchement : on repart avec les dernières lignes du chunk précédent.
      let overlapLength = 0;
      const overlapLines: string[] = [];
      for (let i = current.length - 1; i >= 0 && overlapLength < CHUNK_OVERLAP; i--) {
        overlapLines.unshift(current[i]!);
        overlapLength += current[i]!.length;
      }
      current = overlapLines;
      currentLength = overlapLength;
    }
  }

  if (current.length > 0) chunks.push(current.join("\n"));

  return chunks.filter((chunk) => chunk.trim().length > 40);
}

async function upsertPage(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  page: ScrapedPage
) {
  const contentHash = createHash("sha256").update(page.text).digest("hex");

  const { data: existing } = await supabase
    .from("polytech_pages")
    .select("id, content_hash")
    .eq("url", page.url)
    .maybeSingle();

  if (existing && existing.content_hash === contentHash) {
    await supabase
      .from("polytech_pages")
      .update({ fetched_at: new Date().toISOString() })
      .eq("id", existing.id);
    return { pageId: existing.id, changed: false };
  }

  const { data: upserted, error } = await supabase
    .from("polytech_pages")
    .upsert(
      {
        url: page.url,
        title: page.title,
        section: page.section,
        content_hash: contentHash,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "url" }
    )
    .select("id")
    .single();

  if (error || !upserted) {
    throw new Error(`Échec de l'upsert pour ${page.url}: ${error?.message}`);
  }

  // On repart d'une base propre pour les chunks de cette page.
  await supabase.from("polytech_chunks").delete().eq("page_id", upserted.id);

  const chunks = chunkText(page.text);
  if (chunks.length > 0) {
    const { error: chunksError } = await supabase.from("polytech_chunks").insert(
      chunks.map((content, index) => ({
        page_id: upserted.id,
        chunk_index: index,
        content,
      }))
    );
    if (chunksError) {
      throw new Error(
        `Échec de l'insertion des chunks pour ${page.url}: ${chunksError.message}`
      );
    }
  }

  return { pageId: upserted.id, changed: true, chunkCount: chunks.length };
}

async function main() {
  const supabase = getSupabaseServiceClient();
  const disallowedPaths = await fetchDisallowedPaths();

  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: `${ORIGIN}/`, depth: 0 }];

  let scrapedCount = 0;
  let changedCount = 0;

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const next = queue.shift()!;
    if (visited.has(next.url) || next.depth > MAX_DEPTH) continue;
    visited.add(next.url);

    const pathname = new URL(next.url).pathname;
    if (isDisallowed(pathname, disallowedPaths)) {
      log(`Ignoré (robots.txt) : ${next.url}`);
      continue;
    }

    try {
      const page = await scrapePage(next.url);
      await sleep(REQUEST_DELAY_MS);

      if (!page || page.text.length < 60) {
        log(`Ignoré (pas de contenu exploitable) : ${next.url}`);
        continue;
      }

      const result = await upsertPage(supabase, page);
      scrapedCount++;
      if (result.changed) changedCount++;
      log(
        `OK (${result.changed ? "mis à jour" : "inchangé"}) [${scrapedCount}/${MAX_PAGES}] ${next.url}`
      );

      if (next.depth < MAX_DEPTH) {
        for (const link of page.links) {
          if (!visited.has(link)) queue.push({ url: link, depth: next.depth + 1 });
        }
      }
    } catch (error) {
      log(`Erreur sur ${next.url}: ${(error as Error).message}`);
    }
  }

  log(`Terminé : ${scrapedCount} pages scrapées, ${changedCount} mises à jour.`);
}

main().catch((error) => {
  console.error("[scrape-polytech] Échec fatal:", error);
  process.exit(1);
});
