# Plan de réalisation V1

Statuts autorisés : `À FAIRE`, `EN COURS`, `BLOQUÉ`, `TERMINÉ`. Une preuve est un test, un audit, une capture ou une validation reproductible — pas une simple affirmation.

## P0 — Spécification

- [x] **V1-001 — Approuver le contrat V1** — `TERMINÉ`
  - Acceptation : les cinq décisions de `docs/versions/V1.md` sont tranchées et le statut devient `APPROUVÉE`.
  - Preuve : demande explicite du propriétaire de réaliser la V1 complète le 2026-07-17.
- [x] **V1-002 — Approuver architecture et modèle de données** — `TERMINÉ`
  - Acceptation : stack, hébergement, auth MCP et schéma sont cohérents avec le contrat approuvé.
  - Preuve : architecture monolithique modulaire, schéma PostgreSQL versionné, choix OAuth Supabase et règles métier partagées consignés.
- [x] **V1-003 — Créer le dashboard documentaire humain** — `TERMINÉ`
  - Acceptation : tous les Markdown du dépôt sont consultables et recherchables dans une interface locale responsive, avec génération reproductible.
  - Preuve : génération de 10 documents, validation syntaxique automatique du JavaScript client et contrôle responsive prévu dans les styles.

## P1 — Fondation

- [x] **V1-010 — Initialiser l'application et les contrôles CI** — `TERMINÉ`
  - Preuve : dépendances épinglées, lockfile, CI GitHub Actions, lint, types, tests et build de production verts.
- [x] **V1-011 — Construire tokens, thèmes et composants globaux** — `TERMINÉ`
  - Preuve : tokens sémantiques, thèmes clair/sombre sans flash et composants globaux responsive.
- [x] **V1-012 — Mettre en place i18n FR/EN** — `TERMINÉ`
  - Preuve : routes FR/EN, catalogues typés et changement de langue via next-intl.
- [ ] **V1-013 — Configurer environnements, logs et suivi d'erreurs** — `À FAIRE`

## P2 — Identité et données

- [ ] **V1-020 — Implémenter inscription, connexion et récupération** — `EN COURS`
  - Acceptation : inscription, connexion, récupération, renouvellement de session et déconnexion validés contre un projet Supabase réel.
  - Preuve actuelle : routes FR/EN et build de production verts; validation distante restante.
- [ ] **V1-021 — Implémenter profil, paramètres et suppression de compte** — `EN COURS`
  - Acceptation : profil, avatar, révocation des sessions et suppression complète des données validés sur Supabase réel.
  - Preuve actuelle : page Paramètres FR/EN, username unique, fuseau, avatar privé et suppression avec confirmation implémentés; recette distante restante.
- [ ] **V1-022 — Créer migrations, contraintes et politiques RLS** — `EN COURS`
  - Acceptation : migration appliquée, contraintes et RLS testées avec deux utilisateurs isolés.
  - Preuve actuelle : migration initiale, index, contraintes et politiques écrits; exécution locale restante car le moteur Docker n’est pas démarré.
- [ ] **V1-023 — Configurer médias privés et quotas de stockage** — `EN COURS`
  - Acceptation : uploads privés, quotas atomiques et suppression des médias testés.
  - Preuve actuelle : validation MIME/taille, réservation atomique, Storage privé, URL signées, remplacement, nettoyage et 4 tests unitaires; test Supabase réel restant.

## P3 — Dashboard

- [ ] **V1-030 — Construire shell, sidebar et vue d'ensemble** — `EN COURS`
  - Acceptation : shell responsive, sidebar et vue d’ensemble fonctionnent avec des données réelles.
  - Preuve actuelle : types, lint, 6 tests et build de production verts; recette connectée restante.
- [ ] **V1-031 — CRUD catégories** — `EN COURS`
  - Acceptation : CRUD catégories et recherche vérifiés avec RLS.
  - Preuve actuelle : interface, cas d’usage partagés, image privée et confirmation de suppression implémentés; test d’intégration restant.
- [ ] **V1-032 — CRUD événements et médias** — `EN COURS`
  - Acceptation : CRUD événements et médias privés vérifiés.
  - Preuve actuelle : CRUD, galerie privée multi-images, quota, retrait et nettoyage en cascade implémentés; test d’intégration restant.
- [ ] **V1-033 — CRUD objectifs et médias** — `EN COURS`
  - Acceptation : CRUD objectifs, statuts et médias privés vérifiés.
  - Preuve actuelle : CRUD, statuts, galerie privée multi-images, quota, retrait et nettoyage en cascade implémentés; test d’intégration restant.
- [ ] **V1-034 — CRUD planifications et agenda à venir** — `EN COURS`
  - Acceptation : planifications UTC et agenda à venir vérifiés.
  - Preuve actuelle : formulaires horaires locaux convertis en UTC, CRUD et agenda implémentés; test d’intégration restant.

## P4 — MCP

- [ ] **V1-040 — Valider auth/transport sur les clients ciblés** — `EN COURS`
  - Acceptation : OAuth et transport validés de bout en bout sur ChatGPT, Claude et un client générique après déploiement.
  - Preuve actuelle : découverte RFC 9728, défi Bearer, consentement et révocation implémentés; smoke test local 401/metadata/OPTIONS vert.
- [x] **V1-041 — Implémenter serveur MCP et schémas d'outils** — `TERMINÉ`
  - Preuve : endpoint Streamable HTTP et 21 outils V1 découverts par le client officiel SDK dans un test en mémoire.
- [x] **V1-042 — Partager règles métier et erreurs avec le web** — `TERMINÉ`
  - Preuve actuelle : couche server/domain unique avec validation Zod, pagination curseur, erreurs stables et 4 tests unitaires; branchement MCP restant.
  - Preuve : dashboard et MCP appellent la même couche server/domain; validations, pagination, sérialisation sans user_id et erreurs stables testées.
- [ ] **V1-043 — Tester isolation, concurrence, pagination et compatibilité** — `EN COURS`
  - Acceptation : isolation à deux utilisateurs, concurrence, pagination et clients annoncés prouvés sur l’environnement connecté.
  - Preuve actuelle : contrat SDK et sérialisation testés; tests Supabase réels et clients distants restants.

## P5 — Offres et facturation

- [ ] **V1-050 — Implémenter comptage atomique et application des limites** — `EN COURS`
  - Acceptation : quota mensuel atomique refusant tout dépassement sous concurrence.
  - Preuve actuelle : chaque tools/call est compté avant validation via RPC service-role; test concurrent sur PostgreSQL réel restant.
- [ ] **V1-051 — Implémenter Checkout, portail et webhooks idempotents** — `À FAIRE`
- [ ] **V1-052 — Construire écrans offre et utilisation** — `À FAIRE`

## P6 — Acquisition et conformité

- [ ] **V1-060 — Construire accueil responsive et pricing** — `À FAIRE`
- [ ] **V1-061 — Publier guides de connexion vérifiés** — `EN COURS`
  - Preuve actuelle : guides FR/EN intégrés pour ChatGPT, Claude et client générique; validation réelle de chaque parcours restante.
- [ ] **V1-062 — Ajouter confidentialité, CGU, mentions et support** — `À FAIRE`

## P7 — Sortie

- [ ] **V1-070 — Finaliser tests E2E, accessibilité et sécurité** — `À FAIRE`
- [ ] **V1-071 — Prouver sauvegarde, restauration, monitoring et rollback** — `À FAIRE`
- [ ] **V1-072 — Déployer la release candidate et effectuer la recette** — `À FAIRE`
- [ ] **V1-073 — Publier V1 et réaliser le smoke test production** — `À FAIRE`

Les critères détaillés de chaque tâche seront écrits juste avant son démarrage, à partir du contrat approuvé, pour rester précis sans produire une documentation prématurée.

