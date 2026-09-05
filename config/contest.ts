import type { ContestSettings } from "@/lib/contest/types";

/**
 * Valeurs par défaut des paramètres du concours. La source de vérité en
 * production est la table Supabase `contest_settings` (voir
 * lib/contest/settings.ts) ; ces défauts servent UNIQUEMENT de repli si la
 * ligne est absente ou illisible — le site public ne casse jamais. Ils
 * reflètent l'état initial seedé par la migration
 * `20260722000000_contest_settings.sql`.
 *
 * Pour changer les infos du concours en production : utiliser
 * /admin/parametres (aucune modification de code / redéploiement requis).
 */
export const DEFAULT_CONTEST_SETTINGS: ContestSettings = {
  year: 2026,
  officialName: "Concours d'entrée Polytech Diamniadio 2026",
  subtitle:
    "École Supérieure Polytechnique de Diamniadio — Université Amadou Mahtar Mbow de Dakar",
  description: "Concours d'entrée de l'UAM.",
  registrationOpensAt: new Date("2026-07-23T00:00:00+00:00"),
  registrationClosesAt: new Date("2026-08-16T23:59:59+00:00"),
  contestDate: new Date("2026-08-22T08:00:00+00:00"),
  resultsDate: null,
  messages: {
    beforeRegistration: "Les inscriptions ouvriront bientôt.",
    duringRegistration:
      "Les inscriptions au concours sont ouvertes jusqu'au {dateClotureInscriptions}.",
    afterRegistration:
      "Les inscriptions sont terminées. Le concours aura lieu le {dateConcours}.",
    contestDay: "Le concours a lieu aujourd'hui ! Bonne chance à tous les candidats.",
    afterContest: "Le concours est terminé.",
    beforeResults: "Les résultats seront publiés prochainement.",
    afterResults: "Les résultats sont disponibles.",
  },
  banner: {
    enabled: false,
    title: "",
    message: "",
    type: "info",
    color: "",
  },
  countdown: {
    enabled: true,
    floatingWidget: false,
    position: "right",
    showSeconds: true,
    showProgress: false,
  },
  buttons: {
    primaryLabel: "Consulter les anciennes épreuves",
    primaryUrl: "/departements",
    secondaryLabel: "Déposer mon dossier",
    secondaryUrl: "https://depot.uam.sn/concours",
  },
  info: {
    location: "",
    convocationTime: "",
    startTime: "",
    documents: "",
    allowedMaterial: "",
    instructions: "",
    officialUrl: "https://depot.uam.sn/concours",
  },
  seo: {
    title: "",
    description: "",
    ogImageUrl: "",
    keywords: "",
  },
  stats: {
    showExams: true,
    showDownloads: true,
    showViews: true,
  },
};
