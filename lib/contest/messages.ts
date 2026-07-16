import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ContestPhase, ContestSettings } from "@/lib/contest/types";

/**
 * Sélection + formatage des messages du compte à rebours. Pur (partagé site
 * public / aperçu admin). Les jetons `{date…}` des messages éditables sont
 * remplacés par les dates configurées.
 */
function formatDate(date: Date | null): string {
  return date ? format(date, "d MMMM yyyy", { locale: fr }) : "—";
}

export function fillMessageTokens(template: string, settings: ContestSettings): string {
  return template
    .replaceAll("{dateOuvertureInscriptions}", formatDate(settings.registrationOpensAt))
    .replaceAll("{dateClotureInscriptions}", formatDate(settings.registrationClosesAt))
    .replaceAll("{dateConcours}", formatDate(settings.contestDate))
    .replaceAll("{dateResultats}", formatDate(settings.resultsDate));
}

export function messageForPhase(phase: ContestPhase, settings: ContestSettings): string {
  const m = settings.messages;
  let raw: string;

  switch (phase) {
    case "before_registration":
      raw = m.beforeRegistration;
      break;
    case "registration_open":
      raw = m.duringRegistration;
      break;
    case "registration_closed":
      raw = m.afterRegistration;
      break;
    case "contest_day":
      raw = m.contestDay;
      break;
    case "results_published":
      raw = m.afterResults;
      break;
    case "after_contest":
      // Après le concours, avant les résultats : les deux messages se
      // combinent naturellement (« Le concours est terminé. Les résultats
      // seront publiés prochainement. »).
      raw = [m.afterContest, m.beforeResults].filter(Boolean).join(" ");
      break;
  }

  return fillMessageTokens(raw, settings);
}
