import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_CONTEST_SETTINGS } from "@/config/contest";
import type {
  ContestBanner,
  ContestButtons,
  ContestInfo,
  ContestMessages,
  ContestSettings,
  CountdownOptions,
} from "@/lib/contest/types";

/** Tag de revalidation invalidé par updateContestSettings (voir lib/actions/contest-settings.ts). */
export const CONTEST_SETTINGS_TAG = "contest-settings";

/**
 * Ligne brute (sérialisable : dates en chaîne ISO) telle que renvoyée par
 * Supabase. On garde volontairement cette forme À TRAVERS `unstable_cache`
 * (qui sérialise son résultat) — les objets `Date` sont reconstruits APRÈS le
 * cache, dans getContestSettings.
 */
type ContestSettingsRow = {
  year: number;
  official_name: string;
  subtitle: string;
  description: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  contest_date: string | null;
  results_date: string | null;
  messages: Record<string, unknown>;
  banner: Record<string, unknown>;
  countdown: Record<string, unknown>;
  buttons: Record<string, unknown>;
  info: Record<string, unknown>;
};

async function fetchRow(): Promise<ContestSettingsRow | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("contest_settings")
      .select(
        "year, official_name, subtitle, description, registration_opens_at, registration_closes_at, contest_date, results_date, messages, banner, countdown, buttons, info"
      )
      .eq("id", true)
      .maybeSingle();

    if (error) {
      console.error("getContestSettings a échoué:", error.message);
      return null;
    }
    return data as ContestSettingsRow | null;
  } catch (error) {
    console.error("getContestSettings a échoué:", error);
    return null;
  }
}

const fetchRowCached = unstable_cache(fetchRow, ["contest-settings"], {
  tags: [CONTEST_SETTINGS_TAG],
});

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapRow(row: ContestSettingsRow): ContestSettings {
  const d = DEFAULT_CONTEST_SETTINGS;
  return {
    year: row.year ?? d.year,
    officialName: row.official_name ?? d.officialName,
    subtitle: row.subtitle ?? d.subtitle,
    description: row.description ?? d.description,
    registrationOpensAt: parseDate(row.registration_opens_at),
    registrationClosesAt: parseDate(row.registration_closes_at),
    contestDate: parseDate(row.contest_date),
    resultsDate: parseDate(row.results_date),
    // Fusion avec les défauts : une clé jsonb manquante ne casse rien.
    messages: { ...d.messages, ...(row.messages as Partial<ContestMessages>) },
    banner: { ...d.banner, ...(row.banner as Partial<ContestBanner>) },
    countdown: { ...d.countdown, ...(row.countdown as Partial<CountdownOptions>) },
    buttons: { ...d.buttons, ...(row.buttons as Partial<ContestButtons>) },
    info: { ...d.info, ...(row.info as Partial<ContestInfo>) },
  };
}

/**
 * Paramètres du concours, source de vérité du site public. Caché entre
 * requêtes (`unstable_cache`, tag révalidable) et dédupliqué dans la requête
 * (`cache` React). Repli silencieux sur les défauts si la base est
 * indisponible — le site public ne casse jamais.
 */
export const getContestSettings = cache(async (): Promise<ContestSettings> => {
  const row = await fetchRowCached();
  return row ? mapRow(row) : DEFAULT_CONTEST_SETTINGS;
});
