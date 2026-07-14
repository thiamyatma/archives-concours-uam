/**
 * Catalogue des événements GA4 personnalisés. Les noms suivent la
 * convention GA4 (snake_case). Tous sont définis ici pour offrir une API
 * typée complète ; seuls certains ont un déclencheur câblé aujourd'hui
 * (voir docs/google-analytics.md) — les autres ciblent des fonctionnalités
 * qui n'existent pas encore dans l'application et restent prêts à l'emploi.
 */
export const ANALYTICS_EVENTS = {
  VIEW_SUBJECT: "view_subject",
  SEARCH_SUBJECT: "search_subject",
  FILTER_DEPARTMENT: "filter_department",
  FILTER_YEAR: "filter_year",
  FILTER_SUBJECT: "filter_subject",
  OPEN_SUBJECT: "open_subject",
  LOGIN: "login",
  SIGNUP: "signup",
  CONTACT: "contact",
  REPORT_DOCUMENT: "report_document",
  SHARE_SUBJECT: "share_subject",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Paramètres attachés à un événement. Les clés « métier » les plus
 * courantes sont explicites (autocomplétion) ; l'index signature autorise
 * n'importe quel paramètre GA4 supplémentaire sans casser le typage.
 */
export interface AnalyticsEventParams {
  department?: string;
  year?: number | string;
  subject?: string;
  document_type?: string;
  [key: string]: string | number | boolean | undefined;
}
