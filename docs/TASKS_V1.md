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
  - Preuve : génération de 12 documents, validation syntaxique automatique du JavaScript client et interface responsive.

## P1 — Fondation

- [x] **V1-010 — Initialiser l'application et les contrôles CI** — `TERMINÉ`
  - Preuve : dépendances épinglées, lockfile, CI GitHub Actions, lint, types, tests et build de production verts.
- [x] **V1-011 — Construire tokens, thèmes et composants globaux** — `TERMINÉ`
  - Preuve : tokens sémantiques, thèmes clair/sombre sans flash et composants globaux responsive.
- [x] **V1-012 — Mettre en place i18n FR/EN** — `TERMINÉ`
  - Preuve : routes FR/EN, catalogues typés et changement de langue via next-intl.
- [ ] **V1-013 — Configurer environnements, logs et suivi d'erreurs** — `EN COURS`
  - Preuve : healthcheck, logs JSON, en-têtes de sécurité, robots/sitemap et cron de réconciliation implémentés; alertes externes de production encore à configurer.

## P2 — Identité et données

- [ ] **V1-020 — Implémenter inscription, connexion et récupération** — `EN COURS`
  - Acceptation : inscription, connexion, récupération, renouvellement de session et déconnexion validés contre un projet Supabase réel.
  - Preuve : projet Supabase réel connecté, inscription email active, compte gratuit créé et routes accueil/inscription/connexion en HTTP 200; récupération et révocation de session restent à recetter.
- [ ] **V1-021 — Implémenter profil, paramètres et suppression de compte** — `EN COURS`
  - Acceptation : profil, avatar, révocation des sessions et suppression complète des données validés sur Supabase réel.
  - Preuve actuelle : page Paramètres FR/EN, username unique, fuseau, avatar privé et suppression avec confirmation implémentés; recette distante restante.
- [x] **V1-022 — Créer migrations, contraintes et politiques RLS** — `TERMINÉ`
  - Acceptation : migration appliquée, contraintes et RLS testées avec deux utilisateurs isolés.
  - Preuve : quatre migrations appliquées au projet Supabase réel; 12 tables avec RLS; isolation lecture/mise à jour/suppression prouvée avec deux utilisateurs temporaires dans une transaction annulée; corrections des advisors appliquées.
- [ ] **V1-023 — Configurer médias privés et quotas de stockage** — `EN COURS`
  - Acceptation : uploads privés, quotas atomiques et suppression des médias testés.
  - Preuve actuelle : validation MIME/taille, réservation atomique, Storage privé, URL signées, remplacement, nettoyage et 4 tests unitaires; test Supabase réel restant.

## P3 — Dashboard

- [x] **V1-030 — Construire shell, sidebar et vue d'ensemble** — `TERMINÉ`
  - Acceptation : shell responsive, sidebar et vue d’ensemble fonctionnent avec des données réelles.
  - Preuve : shell, sidebar, compteurs et vue d’ensemble validés avec des données Supabase réelles sur Chromium desktop et mobile.
- [x] **V1-031 — CRUD catégories** — `TERMINÉ`
  - Acceptation : CRUD catégories et recherche vérifiés avec RLS.
  - Preuve : création, modification et suppression en modales validées sur Supabase réel en desktop/mobile; recherche et RLS vérifiées.
- [ ] **V1-032 — CRUD événements et médias** — `EN COURS`
  - Acceptation : CRUD événements et médias privés vérifiés.
  - Preuve actuelle : CRUD événement validé sur Supabase réel en desktop/mobile, galerie privée multi-images, quota, retrait et nettoyage en cascade implémentés; upload avec clé serveur réelle restant.
- [ ] **V1-033 — CRUD objectifs et médias** — `EN COURS`
  - Acceptation : CRUD objectifs, statuts et médias privés vérifiés.
  - Preuve actuelle : CRUD et statut objectif validés sur Supabase réel en desktop/mobile, galerie privée multi-images, quota, retrait et nettoyage en cascade implémentés; upload avec clé serveur réelle restant.
- [x] **V1-034 — CRUD planifications et agenda à venir** — `TERMINÉ`
  - Acceptation : planifications UTC et agenda à venir vérifiés.
  - Preuve : création et suppression d’une planification UTC, compteurs et agenda validés sur Supabase réel en desktop/mobile; la carte reprend l’image de sa cible ou une illustration SVG.
- [x] **V1-035 — Densifier le dashboard mobile** — `TERMINÉ`
  - Acceptation : un seul en-tête reste visible, les contrôles langue/thème demeurent accessibles et les ressources s’affichent sur deux colonnes dès 360 px sans texte illisible ni débordement.
  - Preuve : contrôle Chromium à 360 × 800 px; aucune seconde topbar, grille mesurée à deux colonnes de 153 px, aucun débordement horizontal, cartes ramenées à 220 px et barre d’outils à 109 px; lint, types et 18 tests unitaires verts.
- [x] **V1-036 — Simplifier la navigation du dashboard** — `TERMINÉ`
  - Acceptation : les entrées Connexions IA et Usage et offre quittent la navigation principale et restent clairement accessibles depuis Paramètres en français et en anglais.
  - Preuve : navigation réduite de huit à six liens; deux raccourcis bilingues ajoutés dans Paramètres; lint, types, 18 tests et build de production verts.
- [x] **V1-037 — Repenser l’expérience mobile du dashboard** — `TERMINÉ`
  - Acceptation : aucune barre de défilement de navigation n’est visible, les destinations restent accessibles, l’ajout et la recherche tiennent sur une ligne et les cartes commencent dans la première moitié de l’écran dès 360 px.
  - Preuve : contrôles Chromium à 360 × 800 et 567 × 700 px; navigation fixe en bas, aucun débordement horizontal, cartes à 200 px du haut, deux colonnes à 360 px et trois à 567 px; lint, types, 18 tests et build de production verts.
- [x] **V1-038 — Densifier l’accueil du dashboard et Paramètres sur mobile** — `TERMINÉ`
  - Acceptation : les statistiques et raccourcis sont visibles sans longue succession de cartes, le profil utilise efficacement la largeur et la suppression du compte reste accessible sans dominer la page.
  - Preuve : à 360 × 800 px, statistiques ramenées de 268 à 182 px, panneau À venir terminé à 521 px, raccourcis Paramètres ramenés de 296 à 62 px et profil complet terminé à 590 px; zone de suppression repliable validée; lint, types, 18 tests et build Next.js verts.

## P4 — MCP

- [ ] **V1-040 — Valider auth/transport sur les clients ciblés** — `EN COURS`
  - Acceptation : OAuth et transport validés de bout en bout sur ChatGPT, Claude et un client générique après déploiement.
  - Preuve actuelle : découverte RFC 9728, défi Bearer, consentement et révocation implémentés; smoke test local 401/metadata/OPTIONS vert; environnement Sites public préparé avec Supabase réel pour la recette distante.
- [x] **V1-041 — Implémenter serveur MCP et schémas d'outils** — `TERMINÉ`
  - Preuve : endpoint Streamable HTTP et 21 outils V1 découverts par le client officiel SDK dans un test en mémoire.
- [x] **V1-042 — Partager règles métier et erreurs avec le web** — `TERMINÉ`
  - Preuve actuelle : couche server/domain unique avec validation Zod, pagination curseur, erreurs stables et 4 tests unitaires; branchement MCP restant.
  - Preuve : dashboard et MCP appellent la même couche server/domain; validations, pagination, sérialisation sans user_id et erreurs stables testées.
- [ ] **V1-043 — Tester isolation, concurrence, pagination et compatibilité** — `EN COURS`
  - Acceptation : isolation à deux utilisateurs, concurrence, pagination et clients annoncés prouvés sur l’environnement connecté.
  - Preuve actuelle : isolation RLS réelle à deux utilisateurs et concurrence réelle des quotas validées; pagination distante et clients MCP annoncés restent à prouver.

## P5 — Offres et facturation

- [x] **V1-050 — Implémenter comptage atomique et application des limites** — `TERMINÉ`
  - Acceptation : quota mensuel atomique refusant tout dépassement sous concurrence.
  - Preuve : 20 sessions PostgreSQL concurrentes au seuil gratuit ont produit exactement 10 acceptations puis 10 refus pour le MCP et le stockage, sans dépasser 1 000 appels ni 100 000 000 octets; droits payants limités à active/trialing.
- [ ] **V1-051 — Implémenter Checkout, portail et webhooks idempotents** — `EN COURS`
  - Preuve : Checkout, portail, quatre événements webhook signés, journal idempotent, synchronisation convergente et résiliation avant suppression implémentés; clés Stripe et recette test/live restantes.
- [x] **V1-052 — Construire écrans offre et utilisation** — `TERMINÉ`
  - Preuve : écran FR/EN d'offre et d'utilisation, compteurs MCP/stockage, états d'abonnement, trois offres et accès portail intégrés; lint, types, tests et build verts.

## P6 — Acquisition et conformité

- [x] **V1-060 — Construire accueil responsive et pricing** — `TERMINÉ`
  - Preuve : accueil, pricing, thèmes et changement FR/EN vérifiés par 4 E2E Playwright verts sur Chromium desktop et mobile.
- [ ] **V1-061 — Publier guides de connexion vérifiés** — `EN COURS`
  - Preuve actuelle : guides FR/EN intégrés pour ChatGPT, Claude et client générique; validation réelle de chaque parcours restante.
- [ ] **V1-062 — Ajouter confidentialité, CGU, mentions et support** — `EN COURS`
  - Preuve : pages confidentialité, CGU, mentions et support publiées en FR/EN; identité légale, politique de remboursement et relecture professionnelle restent à fournir.

## P7 — Sortie

- [ ] **V1-070 — Finaliser tests E2E, accessibilité et sécurité** — `EN COURS`
  - Preuve : 18 tests unitaires et 8 E2E desktop/mobile verts, dont parcours authentifié complet et audits Axe WCAG A/AA des pages publiques, du dashboard et d’une modale; clients MCP réels et protection Supabase contre les mots de passe divulgués restent à valider.
- [ ] **V1-071 — Prouver sauvegarde, restauration, monitoring et rollback** — `EN COURS`
  - Preuve : réconciliation stockage testée sur la base réelle, synchronisation Stripe et cron quotidien Vercel configurés, runbook écrit; export Storage et restauration complète restent à prouver.
- [ ] **V1-072 — Déployer la release candidate et effectuer la recette** — `À FAIRE`
- [ ] **V1-073 — Publier V1 et réaliser le smoke test production** — `À FAIRE`

Les critères détaillés de chaque tâche seront écrits juste avant son démarrage, à partir du contrat approuvé, pour rester précis sans produire une documentation prématurée.
