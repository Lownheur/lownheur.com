# Changelog

Les changements sont regroupés par version selon Keep a Changelog, sans recopier les commits.

## [Non publié]

### Ajouté

- Application Next.js 16 initialisée avec TypeScript strict, CI, tests et build de production.
- Page d'accueil responsive, thèmes clair/sombre et navigation français/anglais.

- Parcours d’authentification FR/EN : inscription, connexion, récupération et renouvellement de mot de passe.

- Schéma Supabase V1 avec contraintes, RLS, stockage privé et compteurs de quotas atomiques.

- Dashboard responsive avec vue d’ensemble et CRUD des catégories, événements, objectifs et planifications.

- Couche métier partagée préparant les mêmes opérations pour l’interface web et le MCP.

- Serveur MCP distant OAuth avec 21 outils, découverte standard, quotas et sérialisation compacte.

- Écran de consentement OAuth, page Connexions IA, guides FR/EN et révocation des applications.

- Paramètres de profil, langue, fuseau horaire, avatar privé et suppression définitive du compte.

- Galeries d’images privées pour catégories, événements et objectifs avec quotas, URL signées et confirmations.

- Checkout Stripe, portail client, webhooks idempotents et écran Usage et offre.
- Pages Confidentialité, CGU, Mentions légales et Support en français et anglais.
- Healthcheck, logs structurés, réconciliation quotidienne, en-têtes de sécurité, robots et sitemap.
- Parcours E2E publics desktop/mobile et parcours authentifié activable par compte de test.

### Documentation

- Création du contrat, de l'architecture proposée, du workflow et du plan de réalisation de la V1.
- Ajout du dashboard documentaire humain autonome, recherchable et responsive.
- Ajout du guide propriétaire et du runbook sauvegarde, restauration, monitoring et rollback.

