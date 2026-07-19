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

- Serveur MCP distant OAuth avec 30 outils, découverte standard, quotas et sérialisation compacte.
- Compatibilité OAuth ChatGPT corrigée : tous les outils MCP annoncent désormais explicitement leurs scopes d'authentification.
- Les créations et modifications MCP de catégories, événements et objectifs acceptent une image envoyée par ChatGPT; neuf actions médias dédiées permettent aussi de définir, lister et retirer ces images sans chemin texte.

- Écran de consentement OAuth, page Connexions IA, guides FR/EN et révocation des applications.

- Paramètres de profil, langue, fuseau horaire, avatar privé et suppression définitive du compte.

- Galeries d’images privées pour catégories, événements et objectifs avec quotas, URL signées et confirmations.

- Checkout Stripe, portail client, webhooks idempotents et écran Usage et offre.
- Pages Confidentialité, CGU, Mentions légales et Support en français et anglais.
- Healthcheck, logs structurés, réconciliation quotidienne, en-têtes de sécurité, robots et sitemap.
- Parcours E2E publics desktop/mobile et parcours authentifié activable par compte de test.
- Refonte des pages Catégories, Événements, Objectifs et Planifications : listes centrées sur le contenu, ajout/modification/suppression en modales accessibles et illustrations SVG quand aucune image n’est disponible.
- Les cartes de planification reprennent l’image de l’événement ou de l’objectif associé lorsqu’elle existe.
- Configuration d'une bêta technique Sites publique pour tester le compte gratuit et le MCP distant avant Stripe et le déploiement commercial.
- Dashboard mobile densifié : suppression du second en-tête, langue et thème regroupés avec le logo, cartes en deux colonnes dès 360 px et recherche compacte.
- Navigation du dashboard simplifiée : Connexions IA et Usage et offre sont désormais regroupés dans Paramètres.
- Expérience mobile restructurée avec navigation fixe à icônes, en-tête compact, ajout sur une ligne et grille adaptative de deux à trois colonnes.
- Accueil du dashboard et Paramètres densifiés sur mobile : statistiques compactes, raccourcis côte à côte, profil en deux colonnes et suppression du compte repliable.

### Documentation

- Création du contrat, de l'architecture proposée, du workflow et du plan de réalisation de la V1.
- Ajout du dashboard documentaire humain autonome, recherchable et responsive.
- Ajout du guide propriétaire et du runbook sauvegarde, restauration, monitoring et rollback.
