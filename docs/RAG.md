# Assistant IA (RAG sur polytech.sn)

Chatbot Q/A communautaire qui répond aux questions sur l'UAM / Polytech
Diamniadio en se basant **uniquement** sur le contenu public de
[polytech.sn](https://polytech.sn). Génération via l'API Groq.

## Vue d'ensemble

```
polytech.sn ──(cron hebdo, GitHub Actions)──► scripts/scrape-polytech.ts
                                                       │
                                                       ▼
                                     Supabase: polytech_pages / polytech_chunks
                                                       │
Utilisateur ─► ChatWidget / /assistant ─► POST /api/chat
                                                       │
                                     1) rate-limit par IP (rag_query_log)
                                     2) retrieval : search_polytech_chunks()
                                     3) génération : Groq (streaming SSE)
                                                       │
                                                       ▼
                                          réponse + sources citées
```

## Pourquoi pas d'embeddings vectoriels ?

**L'API Groq n'expose pas d'endpoint d'embeddings public.** Générer des
embeddings aurait donc nécessité un fournisseur tiers (OpenAI, etc.), une
clé API et un coût supplémentaires. À la place, le retrieval s'appuie sur la
**recherche plein texte native de Postgres** (`tsvector`/`websearch_to_tsquery`,
configuration `french`) :

- Gratuit, aucune dépendance externe supplémentaire.
- Suffisant pour un site institutionnel de taille modeste (quelques centaines
  de pages) où le vocabulaire est assez homogène (admissions, filières,
  campus…).
- Déjà le pattern utilisé ailleurs dans ce projet pour la recherche de
  documents (`documents_search_idx` dans `supabase/schema.sql`).

Limite connue : contrairement à des embeddings sémantiques, la recherche
plein texte ne retrouve pas bien les reformulations très éloignées du
vocabulaire source (synonymes rares). Si la qualité des réponses s'avère
insuffisante en usage réel, la prochaine étape recommandée est d'ajouter
`pgvector` + un fournisseur d'embeddings, sans changer le reste du pipeline
(le retrieval est isolé dans `lib/rag/search.ts`).

## Composants

| Fichier                                  | Rôle                                                               |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `scripts/scrape-polytech.ts`             | Crawl BFS de polytech.sn, extraction texte, découpage en chunks    |
| `supabase/migrations/*_polytech_rag.sql` | Tables `polytech_pages`/`polytech_chunks`/`rag_query_log`, RPC     |
| `lib/rag/search.ts`                      | Retrieval : appelle la RPC `search_polytech_chunks`                |
| `lib/rag/rate-limit.ts`                  | Rate-limit par IP hashée (SHA-256), 24h glissantes                 |
| `lib/rag/groq.ts`                        | Construction du prompt + appel streaming à l'API Groq              |
| `app/api/chat/route.ts`                  | Route Handler : orchestre rate-limit → retrieval → streaming SSE   |
| `components/chat/use-assistant-chat.ts`  | Hook client : état des messages, parsing du flux SSE               |
| `components/chat/chat-panel.tsx`         | UI du chat (messages, sources citées, saisie)                      |
| `components/chat/chat-widget.tsx`        | Widget flottant, présent sur toutes les pages via `app/layout.tsx` |
| `app/assistant/page.tsx`                 | Page dédiée `/assistant`                                           |

## Scraping

```bash
npm run scrape:polytech
```

- Parcourt polytech.sn en largeur (BFS), même origine uniquement, jusqu'à
  200 pages / profondeur 4 (ajustable en tête de fichier).
- Respecte les règles `Disallow` de `robots.txt` (parseur minimal,
  `User-agent: *` uniquement).
- Extrait le texte des balises de contenu (`main`, `article`,
  `.entry-content`…), ignore nav/header/footer/scripts.
- Ne ré-indexe une page que si son contenu a changé (hash SHA-256 comparé à
  `polytech_pages.content_hash`) — évite de recalculer inutilement les chunks.
- Découpe chaque page en passages d'environ 1100 caractères avec un
  chevauchement de 150 caractères, pour ne pas couper une information au
  milieu d'un chunk.

**Planification** : `.github/workflows/scrape-polytech.yml` relance le
scraping tous les lundis (cron) et peut être déclenché manuellement
(`workflow_dispatch`). Nécessite les secrets de dépôt
`NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.

## Sécurité & abus

- **Rate-limit** : 30 questions / IP / 24h par défaut
  (`RAG_MAX_QUESTIONS_PER_IP_PER_DAY`). L'IP n'est jamais stockée en clair,
  seulement son hash SHA-256, uniquement pour compter les requêtes.
- **RLS** : `polytech_pages`/`polytech_chunks` sont en lecture publique
  (contenu déjà public sur polytech.sn) mais aucune policy d'écriture —
  seul le service role (scraper, `/api/chat`) peut modifier ces tables.
- **Prompt système** : contraint le modèle à ne répondre qu'à partir du
  contexte fourni, à rappeler que l'assistant est communautaire et non
  officiel, et à rediriger vers polytech.sn / l'administration pour toute
  information sensible (frais exacts, dates limites).
- Si `GROQ_API_KEY` est absent, `/api/chat` répond immédiatement avec un
  message d'erreur explicite plutôt que de planter — le reste du site n'est
  jamais affecté.

## Variables d'environnement

Voir `.env.example` :

- `GROQ_API_KEY` (obligatoire pour activer l'assistant — [console.groq.com](https://console.groq.com))
- `GROQ_MODEL` (optionnel, défaut `llama-3.3-70b-versatile` — voir
  [console.groq.com/docs/models](https://console.groq.com/docs/models) pour
  la liste à jour des modèles disponibles)
- `RAG_MAX_QUESTIONS_PER_IP_PER_DAY` (optionnel, défaut `30`)

## Limites connues / pistes d'amélioration

- Retrieval full-text plutôt que sémantique (voir plus haut).
- Pas de mémoire de conversation multi-tours côté serveur : chaque question
  est traitée indépendamment (le contexte de la conversation précédente
  n'est pas renvoyé à Groq). Simple à ajouter si besoin, en incluant
  l'historique dans `messages` de `lib/rag/groq.ts`.
- Le parseur `robots.txt` est volontairement minimal (pas de gestion de
  `Allow`, de wildcards `*`/`$`, ni de `Crawl-delay`).
- Le modèle par défaut (`GROQ_MODEL`) peut être retiré du catalogue Groq au
  fil du temps — si `/api/chat` renvoie une erreur `model_decommissioned` ou
  similaire, mettre à jour `GROQ_MODEL` avec un modèle actuel.
