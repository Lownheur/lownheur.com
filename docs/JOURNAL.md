# Journal des jalons

## 2026-07-17 — Fondation documentaire

- Vision initiale transformée en contrat V1 vérifiable.
- Dépôt Git initialisé et règles de traçabilité établies.
- V1 laissée volontairement au statut `BROUILLON À VALIDER`; aucun code applicatif créé.
- Prochaine porte : décisions du propriétaire, puis approbation du contrat et de l'architecture.


## 2026-07-17 — Dashboard documentaire humain

- Interface locale créée pour parcourir et rechercher toutes les sources Markdown.
- Générateur reproductible ajouté; les futures modifications `.md` doivent déclencher sa régénération.

## 2026-07-17 — Fondation applicative validée

- Next.js 16, React 19, TypeScript strict, Supabase SSR, Stripe, MCP SDK et next-intl installés avec versions épinglées.
- Page d'accueil FR/EN et thèmes clair/sombre créés.
- Lint, types, tests et build de production validés; contrôle visuel navigateur reporté au lot E2E car le navigateur intégré est indisponible.

## 2026-07-17 — Identité, données et dashboard intégrés

- Authentification Supabase SSR et pages FR/EN intégrées.
- Migration V1 écrite avec isolation RLS, stockage privé et quotas atomiques; application locale en attente du moteur Docker.
- CRUD web des quatre ressources relié à une couche métier partagée, avec lint, types, 6 tests et build de production verts.

## 2026-07-17 — Serveur MCP et OAuth intégrés

- Endpoint Streamable HTTP protégé par OAuth Supabase, consentement et révocation ajoutés.
- 21 outils V1 branchés sur la couche métier partagée et le quota atomique.
- 12 tests, chaîne verify, build production et smoke test protocolaire local verts; validation clients réels reportée à l’environnement déployé.

## 2026-07-17 — Profil et médias privés intégrés

- Profil, langue, fuseau, avatar et suppression de compte ajoutés.
- Uploads d’images validés côté serveur, réservés dans le quota et servis par URL signées.
- Nettoyage des médias partagé avec les suppressions web/MCP; 16 tests et build production verts.

## 2026-07-17 — Supabase réel et préparation marché

- Projet Supabase réel connecté; quatre migrations appliquées et isolation RLS prouvée avec deux identités temporaires.
- Compte gratuit réel créé; accueil, inscription et connexion répondent en HTTP 200.
- Stripe, offre/usage, pages légales, santé, sécurité, réconciliation et E2E desktop/mobile intégrés.
- Publication encore conditionnée aux secrets serveur, à Stripe, aux informations légales, au déploiement et à la recette MCP.

## 2026-07-18 — Refonte du dashboard de ressources

- Les formulaires permanents ont été remplacés par des modales accessibles et responsive pour les quatre ressources V1.
- Chaque carte possède une zone visuelle avec image privée ou illustration SVG dédiée; les planifications héritent du visuel de leur cible.
- Le parcours complet et les modales ont été validés sur Supabase réel en desktop/mobile avec audit Axe WCAG A/AA.

## 2026-07-18 — Préparation de la bêta MCP publique

- Un environnement Sites distinct de la future production Vercel a été créé pour la validation distante du compte gratuit et du MCP.
- Les variables Supabase publiques et serveur ainsi qu'un secret de réconciliation ont été installés dans l'hébergeur; Stripe reste volontairement absent.
- L'environnement est destiné à des données de test et ne constitue pas la publication stable de la V1.
