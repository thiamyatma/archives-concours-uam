# Entraînement QCM

## Vue d'ensemble

En complément des archives Markdown (`content/archives/**`, texte intégral
d'une épreuve), certaines matières disposent d'une **grille de correction
QCM** : `content/qcm/<groupe>/<annee>/<matiere>.json`. Chaque fichier
contient, pour les 20 questions à choix multiples d'une matière, la bonne
réponse, une justification pédagogique, le concept évalué et une difficulté
estimée — préparés par relecture et calcul rigoureux de chaque question
source (voir « Limites et défauts assumés » plus bas), pas générés
automatiquement à l'exécution.

Contrairement aux archives, il n'y a pas de dossier par département : le
contenu est indexé par `contentGroup` (`lib/departements.ts`), puisqu'une
grille QCM est partagée par tous les départements d'un même groupe
d'épreuve, exactement comme le Markdown source.

```
content/qcm/<groupe>/<annee>/<matiere-slug>.json
  lib/qcm/schema.ts    (validation Zod à la lecture)
  lib/qcm/data.ts       (lecture disque + cache(), server-only)
  lib/qcm/images.ts     (illustrations optionnelles pour les questions de logique)
  lib/qcm/scoring.ts     (correction pure : réponses candidat → score/bilan)
       │
       └─ components/qcm/qcm-runner.tsx (Client Component)
             └─ app/departements/[code]/[annee]/entrainement/[matiere]/page.tsx
```

## Schéma d'un fichier

```json
{
  "matiere": "Mathématiques",
  "nombre_questions": 20,
  "questions": [
    {
      "numero": 21,
      "question": "...",
      "propositions": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "bonne_reponse": "B",
      "reponse_candidat": null,
      "resultat": null,
      "justification": "...",
      "concept": "...",
      "difficulte": "Facile | Moyenne | Difficile"
    }
  ],
  "resume": {
    "score": null,
    "pourcentage": null,
    "niveau": null,
    "commentaire": null,
    "chapitres_a_revoir": null
  }
}
```

`reponse_candidat`, `resultat` et tous les champs de `resume` sont toujours
`null` dans le fichier source : ils ne sont calculés que côté client, en
mémoire, pendant la session du candidat (voir plus bas). `lib/qcm/schema.ts`
valide ce format à la lecture (`qcmMatiereSchema`) ; `lib/qcm/data.test.ts`
valide les 16 fichiers existants (conformité au schéma + numéros de question
consécutifs + options non dupliquées, à l'exception des doublons connus et
volontairement conservés — voir plus bas).

Le slug de matière (`mathematiques`, `physique-chimie`, ...) se déduit du
titre de section Markdown (`ÉPREUVE DE MATHÉMATIQUES`) via
`lib/qcm/slug.ts#slugifyMatiereTitle` — pas de table figée, toute nouvelle
matière obtient son slug automatiquement.

## Déroulé côté candidat (aucun serveur impliqué)

`components/qcm/qcm-runner.tsx` est un Client Component qui reçoit les
questions complètes (bonne réponse incluse) en props. Il gère localement :

1. La sélection/modification des réponses, question par question, tant que
   le candidat n'a pas cliqué sur « Voir ma correction ».
2. Au clic, `lib/qcm/scoring.ts#corrigerQcm` (fonction pure, aucune E/S)
   compare les réponses du candidat aux `bonne_reponse` et calcule le
   `resume` (score, pourcentage, niveau, commentaire, chapitres à revoir).
3. L'affichage bascule alors en mode correction : bonne réponse en vert,
   mauvaise sélection du candidat en rouge, justification/concept/difficulté
   affichés par question, bilan complet en haut de page
   (`components/qcm/qcm-summary.tsx`).

Rien n'est envoyé ni persisté côté serveur — recharger la page réinitialise
la session, un « Recommencer » explicite fait de même volontairement. Ce
choix (aucune API dédiée à la correction) est délibéré : il n'y a pas
d'enjeu de triche à empêcher pour un outil d'auto-entraînement pédagogique,
contrairement à un examen surveillé.

### Niveaux (`resume.niveau`)

| Pourcentage | Niveau      |
| ----------- | ----------- |
| ≥ 90 %      | Excellent   |
| 80–89 %     | Très bon    |
| 70–79 %     | Bon         |
| 50–69 %     | Moyen       |
| < 50 %      | À renforcer |

### Chapitres à revoir

`corrigerQcm` classe les `concept` des questions ratées par poids d'erreur
décroissant (une question « Difficile » ratée pèse plus qu'une « Facile »),
à égalité par ordre alphabétique — déterministe, testé dans
`lib/qcm/scoring.test.ts`.

## Illustrations (questions de logique visuelles)

Quelques questions de logique renvoient à une image déjà utilisée par
l'épreuve Markdown (`public/archives/<groupe>/<annee>/q<numero>.jpg`,
voir `docs/ARCHITECTURE.md`). `lib/qcm/images.ts#getQuestionImageUrl` vérifie
simplement l'existence du fichier — ce chemin n'est pas stocké dans le JSON
(hors du schéma demandé), il est recalculé par la page à chaque requête.

## Limites et défauts assumés

Ces grilles ont été préparées par relecture attentive et calcul explicite
(scripts Node ponctuels pour tout ce qui est numérique/combinatoire) plutôt
que par simple intuition, avec une règle stricte : **ne jamais inventer une
réponse**. Quand l'énoncé source lui-même contient un défaut, il est
documenté tel quel dans le champ `justification` de la question concernée,
plutôt que silencieusement « corrigé » (ce qui trahirait l'épreuve réelle) :

- **Options dupliquées dans l'énoncé source** (deux propositions strictement
  identiques) : `dgo-du2adt/2024/mathematiques.json#38`,
  `dsti-dgae-dstaan/2024/mathematiques.json#21`,
  `dsti-dgae-dstaan/2024/physique-chimie.json#9`. La première occurrence est
  retenue par convention. Allowlist explicite dans `lib/qcm/data.test.ts`.
- **Aucune option ne correspond exactement à la valeur calculée** :
  `dgo-du2adt/2024/mathematiques.json#26` (dénombrement — la valeur
  rigoureuse est 9, aucune des 4 options ne vaut 9), et l'équation
  logarithmique `dsti-dgae-dstaan/2024/mathematiques.json#39` (la solution
  algébrique ne vérifie pas le domaine de définition). L'option la plus
  proche du raisonnement correct est retenue et le défaut expliqué.
- **Plusieurs propositions mathématiquement vraies simultanément** :
  `dgo-du2adt/2024/mathematiques.json#37` (propriétés de
  $f(x)=\frac{e^x+e^{-x}}{e^x-e^{-x}}$) — 3 des 4 options sont vraies,
  la plus caractéristique est retenue.
- **Masse molaire visiblement erronée dans l'énoncé source** :
  `dsti-dgae-dstaan/2025/physique-chimie.json#19` (« M = 1,87 g/mol » pour
  un acide aminé, incohérent) — la réponse retenue s'appuie sur la
  description structurelle (chaîne ramifiée) plutôt que sur cette valeur.
- **Puzzles visuels (images) à faible confiance** : les questions de logique
  61–80 qui renvoient à une image de figures géométriques ou de dominos
  (`dgo-du2adt/2024/logique.json#73`, `#74`, `#79`, et leur équivalent
  partagé `dsti-dgae-dstaan/2024/logique.json`) ne peuvent pas être vérifiées
  avec la même rigueur qu'un calcul ; la réponse proposée est une estimation
  raisonnée, explicitement signalée comme telle dans la justification.

## Contenu partagé entre groupes/années

Comme pour les archives Markdown, certaines matières sont strictement
identiques d'un fichier à l'autre (même texte source, même questions) :

- 2024 : `anglais` et `logique` sont identiques entre `dgo-du2adt` et
  `dsti-dgae-dstaan` (seuls `francais`/`physique-chimie` et `mathematiques`
  diffèrent par département).
- 2025 : `mathematiques`, `anglais` et `logique` sont identiques entre les
  deux groupes (seul `francais`/`physique-chimie` diffère).

Ces fichiers sont dupliqués tels quels sur le disque (pas de symlink ni
d'indirection) — plus simple à maintenir et cohérent avec le choix déjà fait
pour `content/archives/**`.
