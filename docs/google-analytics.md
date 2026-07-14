# Google Analytics 4 (GA4)

Suivi d'audience du site via GA4, chargé **uniquement en production**, et
**uniquement après consentement** de l'utilisateur (bannière cookies). En
développement, aucun script Google n'est jamais chargé.

## Architecture

| Élément                                          | Rôle                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `lib/analytics/events.ts`                        | Catalogue typé des 11 événements (`ANALYTICS_EVENTS`) + type des paramètres  |
| `lib/analytics/gtag.ts`                          | Bas niveau : ID de mesure, `pageview()`, `gtagEvent()`, gardes `window.gtag` |
| `lib/analytics/consent.ts`                       | Consentement persisté (localStorage), `parseConsent()` (pur, testé)          |
| `lib/analytics/track.ts`                         | `trackEvent()` + wrappers typés (un par événement)                           |
| `lib/hooks/use-analytics.ts`                     | Hook `useAnalytics()` pour émettre un événement depuis un Client Component   |
| `components/analytics/analytics.tsx`             | Orchestrateur monté dans le layout : décide quoi charger selon consentement  |
| `components/analytics/google-analytics.tsx`      | Injecte gtag.js (`next/script`, `afterInteractive`)                          |
| `components/analytics/route-tracker.tsx`         | Envoie un `page_view` à chaque navigation SPA                                |
| `components/analytics/cookie-consent-banner.tsx` | Bannière Accepter / Refuser                                                  |

Sessions et visiteurs uniques sont mesurés **automatiquement** par GA4 une
fois gtag chargé — aucun code spécifique nécessaire.

## Créer une propriété GA4 et récupérer le Measurement ID

1. Aller sur [analytics.google.com](https://analytics.google.com/).
2. **Admin** (roue crantée) → **Créer** → **Propriété**. Renseigner nom,
   fuseau horaire, devise.
3. Choisir la plateforme **Web**, saisir l'URL du site
   (`https://archives-concours-uam.vercel.app`) et un nom de flux.
4. Une fois le flux Web créé, copier l'**ID de mesure** affiché en haut à
   droite : il commence par `G-` (ex. `G-ABC123XYZ`).

## Configurer la variable d'environnement

L'ID est la seule configuration nécessaire.

### En local

Dans `.env.local` :

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-ABC123XYZ
```

> Note : même configuré en local, GA ne se charge pas en `npm run dev`
> (chargement réservé à la production). Pour tester le flux réel, faire un
> build de production local : `npm run build && npm start`.

### Sur Vercel

```bash
vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID production
# coller l'ID G-XXXX quand demandé, puis redéployer :
vercel --prod
```

Ou via **Project Settings → Environment Variables** dans le dashboard Vercel.

Sans cette variable, aucun script GA n'est chargé et aucune bannière ne
s'affiche — le site fonctionne normalement.

## Suivre le trafic

Tout se consulte dans l'interface **Google Analytics** (pas de dashboard
custom dans l'app) :

- **Rapports → En temps réel** : visiteurs actifs immédiatement.
- **Rapports → Engagement → Pages et écrans** : pages les plus vues.
- **Rapports → Engagement → Événements** : les événements personnalisés
  (`view_subject`, etc.) avec leurs paramètres (`department`, `year`…).
- Visiteurs uniques et sessions : **Rapports → Acquisition** / **Audience**.

Astuce : marquer un événement comme « conversion » dans **Admin → Événements**
pour le suivre plus finement.

## Envoyer un événement

Depuis n'importe quel Client Component :

```tsx
"use client";
import { useAnalytics } from "@/lib/hooks/use-analytics";

function MyComponent() {
  const { trackViewSubject } = useAnalytics();
  return (
    <button onClick={() => trackViewSubject({ department: "dsti", year: 2025 })}>
      Voir
    </button>
  );
}
```

Ou directement via la fonction (hors composant / dans un handler) :

```ts
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

trackEvent(ANALYTICS_EVENTS.SHARE_SUBJECT, { department: "dgo", year: 2024 });
```

Tous les envois sont **sûrs** : no-op silencieux si GA n'est pas chargé
(dev, consentement refusé, ID absent) — inutile de vérifier quoi que ce soit
avant d'appeler.

## Événements disponibles

Les 11 événements sont définis et prêts à l'emploi. Certains n'ont pas
encore de déclencheur câblé car la fonctionnalité correspondante n'existe
pas dans l'application actuelle (recherche, filtres, comptes, signalement,
partage) — ils restent prêts pour le jour où ces fonctions arrivent.

| Événement           | Câblé ? | Déclencheur                                      |
| ------------------- | ------- | ------------------------------------------------ |
| `view_subject`      | ✅      | Ouverture d'une épreuve (`/departements/x/AAAA`) |
| `contact`           | ✅      | Clic sur l'e-mail de contact (footer)            |
| `open_subject`      | dormant | —                                                |
| `search_subject`    | dormant | (pas de recherche)                               |
| `filter_department` | dormant | (pas de filtres)                                 |
| `filter_year`       | dormant | (pas de filtres)                                 |
| `filter_subject`    | dormant | (pas de filtres)                                 |
| `login`             | dormant | (pas de comptes)                                 |
| `signup`            | dormant | (pas de comptes)                                 |
| `report_document`   | dormant | (pas de signalement)                             |
| `share_subject`     | dormant | (pas de bouton partager)                         |

## Ajouter un nouvel événement

1. Ajouter la clé dans `ANALYTICS_EVENTS` (`lib/analytics/events.ts`).
2. Ajouter un wrapper typé dans `lib/analytics/track.ts` et, si utile, dans
   `lib/hooks/use-analytics.ts`.
3. Appeler le wrapper au bon endroit (Client Component).
4. Vérifier dans GA4 → **Événements** (temps réel) après acceptation des
   cookies sur un build de production.
