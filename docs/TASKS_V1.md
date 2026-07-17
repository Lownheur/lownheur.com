# Plan de réalisation V1

Statuts autorisés : `À FAIRE`, `EN COURS`, `BLOQUÉ`, `TERMINÉ`. Une preuve est un test, un audit, une capture ou une validation reproductible — pas une simple affirmation.

## P0 — Spécification

- [x] **V1-001 — Approuver le contrat V1** — `TERMINÉ`
  - Acceptation : les cinq décisions de `docs/versions/V1.md` sont tranchées et le statut devient `APPROUVÉE`.
  - Preuve : demande explicite du propriétaire de réaliser la V1 complète le 2026-07-17.
- [ ] **V1-002 — Approuver architecture et modèle de données** — `À FAIRE`
  - Acceptation : stack, hébergement, auth MCP et schéma sont cohérents avec le contrat approuvé.
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

- [ ] **V1-020 — Implémenter inscription, connexion et récupération** — `À FAIRE`
- [ ] **V1-021 — Implémenter profil, paramètres et suppression de compte** — `À FAIRE`
- [ ] **V1-022 — Créer migrations, contraintes et politiques RLS** — `À FAIRE`
- [ ] **V1-023 — Configurer médias privés et quotas de stockage** — `À FAIRE`

## P3 — Dashboard

- [ ] **V1-030 — Construire shell, sidebar et vue d'ensemble** — `À FAIRE`
- [ ] **V1-031 — CRUD catégories** — `À FAIRE`
- [ ] **V1-032 — CRUD événements et médias** — `À FAIRE`
- [ ] **V1-033 — CRUD objectifs et médias** — `À FAIRE`
- [ ] **V1-034 — CRUD planifications et agenda à venir** — `À FAIRE`

## P4 — MCP

- [ ] **V1-040 — Valider auth/transport sur les clients ciblés** — `À FAIRE`
- [ ] **V1-041 — Implémenter serveur MCP et schémas d'outils** — `À FAIRE`
- [ ] **V1-042 — Partager règles métier et erreurs avec le web** — `À FAIRE`
- [ ] **V1-043 — Tester isolation, concurrence, pagination et compatibilité** — `À FAIRE`

## P5 — Offres et facturation

- [ ] **V1-050 — Implémenter comptage atomique et application des limites** — `À FAIRE`
- [ ] **V1-051 — Implémenter Checkout, portail et webhooks idempotents** — `À FAIRE`
- [ ] **V1-052 — Construire écrans offre et utilisation** — `À FAIRE`

## P6 — Acquisition et conformité

- [ ] **V1-060 — Construire accueil responsive et pricing** — `À FAIRE`
- [ ] **V1-061 — Publier guides de connexion vérifiés** — `À FAIRE`
- [ ] **V1-062 — Ajouter confidentialité, CGU, mentions et support** — `À FAIRE`

## P7 — Sortie

- [ ] **V1-070 — Finaliser tests E2E, accessibilité et sécurité** — `À FAIRE`
- [ ] **V1-071 — Prouver sauvegarde, restauration, monitoring et rollback** — `À FAIRE`
- [ ] **V1-072 — Déployer la release candidate et effectuer la recette** — `À FAIRE`
- [ ] **V1-073 — Publier V1 et réaliser le smoke test production** — `À FAIRE`

Les critères détaillés de chaque tâche seront écrits juste avant son démarrage, à partir du contrat approuvé, pour rester précis sans produire une documentation prématurée.

