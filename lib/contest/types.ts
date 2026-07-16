/**
 * Types du domaine « paramètres du concours ». Partagés serveur/client (aucun
 * import server-only ici). La source de vérité est la table Supabase
 * `contest_settings` (voir lib/contest/settings.ts) ; `config/contest.ts`
 * fournit les valeurs par défaut de repli.
 */

export type BannerType = "info" | "success" | "warning" | "error";
export type CountdownPosition = "left" | "right";

/** Un message par état du concours (voir getContestPhase). Peut contenir des
 * jetons `{dateOuvertureInscriptions}`, `{dateClotureInscriptions}`,
 * `{dateConcours}`, `{dateResultats}` remplacés à l'affichage. */
export interface ContestMessages {
  beforeRegistration: string;
  duringRegistration: string;
  afterRegistration: string;
  contestDay: string;
  afterContest: string;
  beforeResults: string;
  afterResults: string;
}

export interface ContestBanner {
  enabled: boolean;
  title: string;
  message: string;
  type: BannerType;
  /** Couleur d'accent optionnelle (hex). Vide = style dérivé du `type`. */
  color: string;
}

export interface CountdownOptions {
  enabled: boolean;
  floatingWidget: boolean;
  position: CountdownPosition;
  showSeconds: boolean;
  showProgress: boolean;
}

export interface ContestButtons {
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
}

export interface ContestInfo {
  location: string;
  convocationTime: string;
  startTime: string;
  documents: string;
  allowedMaterial: string;
  instructions: string;
  officialUrl: string;
}

export interface ContestSettings {
  year: number;
  officialName: string;
  subtitle: string;
  description: string;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  contestDate: Date | null;
  resultsDate: Date | null;
  messages: ContestMessages;
  banner: ContestBanner;
  countdown: CountdownOptions;
  buttons: ContestButtons;
  info: ContestInfo;
}

export type ContestPhase =
  | "before_registration"
  | "registration_open"
  | "registration_closed"
  | "contest_day"
  | "after_contest"
  | "results_published";
