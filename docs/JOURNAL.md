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
