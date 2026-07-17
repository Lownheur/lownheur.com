# Exploitation V1

## Surveillance

- Santé publique minimale : `GET /api/health`.
- Réconciliation : `GET /api/cron/reconcile`, chaque jour à 03:00 UTC par Vercel.
- Événements structurés : `stripe.webhook_processed`, `stripe.webhook_duplicate`, `stripe.webhook_failed`, `reconciliation.completed`.
- Aucun contenu de catégorie, événement, objectif, planification ou image ne doit apparaître dans les logs.

Alerter sur : santé non-200, webhook en échec, cron en échec, hausse des 5xx, saturation des fonctions et échecs Auth. Vercel ne retente pas automatiquement un cron échoué ; l'opérateur doit examiner les logs et le relancer après correction.

## Sauvegardes

Le projet actuel doit être considéré comme gratuit tant qu'un abonnement Supabase payé n'est pas confirmé. Sur un plan gratuit, effectuer régulièrement des exports logiques hors site. Les plans Pro, Team et Enterprise possèdent des sauvegardes quotidiennes gérées ; Pro conserve actuellement sept jours.

La sauvegarde base ne contient pas les fichiers Supabase Storage. Sauvegarder séparément :

1. rôles, schéma et données PostgreSQL avec `supabase db dump` ;
2. le bucket privé `user-media` avec Supabase CLI Storage ;
3. les migrations Git, réglages Auth/OAuth, variables d'environnement et configuration Stripe ;
4. une somme de contrôle et la date de chaque archive.

Références officielles :

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Test de restauration

Ne jamais commencer le premier test sur la production.

1. créer un projet Supabase de restauration isolé ;
2. restaurer rôles, schéma puis données ;
3. restaurer les objets Storage ;
4. reconfigurer Auth, OAuth, clés, URL et bucket ;
5. exécuter les migrations manquantes ;
6. vérifier Auth, RLS à deux comptes, quatre CRUD, URL signées, quotas et MCP ;
7. consigner date, durée, RPO, RTO et écarts ;
8. supprimer le projet de test seulement après validation.

La tâche V1-071 reste en cours tant qu'une restauration complète, Storage inclus, n'a pas été prouvée.

## Déploiement et rollback

Avant déploiement :

```powershell
npm ci
npm run verify
npm run test:e2e
```

Après déploiement, vérifier accueil FR/EN, inscription, connexion, quatre CRUD, upload privé, page Usage, Checkout test, webhook, MCP OAuth, révocation et `/api/health`.

Pour un défaut applicatif, promouvoir le dernier déploiement Vercel sain. Pour une migration, appliquer une migration corrective vers l'avant ; ne jamais supprimer une colonne ou restaurer la base à l'aveugle. Une restauration Supabase implique une indisponibilité et doit être annoncée.

## Incident

1. qualifier impact, début et périmètre sans copier de donnée privée ;
2. révoquer immédiatement toute clé exposée ;
3. suspendre Checkout ou MCP si cela limite l'impact ;
4. corriger, tester, déployer et exécuter le smoke test ;
5. réconcilier stockage et abonnements ;
6. documenter la chronologie et notifier les personnes concernées si la loi l'impose.