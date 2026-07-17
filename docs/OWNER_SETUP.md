# Mise en service par le propriétaire

État au 17 juillet 2026 : l'application locale répond sur `http://localhost:3000/fr`, le projet Supabase `pkdwwwqjixwmivbiekrd` est relié, quatre migrations distantes sont appliquées et un compte gratuit réel existe. Les valeurs publiques Supabase sont déjà dans `.env.local`, qui n'est pas versionné.

## Voir et utiliser le compte gratuit maintenant

```powershell
cd "C:\Users\touat\Desktop\Nouveau dossier"
npm run dev
```

Ouvrir `http://localhost:3000/fr`. Créer le compte, confirmer l'email reçu, puis se connecter. Le CRUD sans image fonctionne avec la clé publique actuelle.

## Secret Supabase requis pour toute la V1

Dans Supabase, ouvrir le projet `POC`, puis **Project Settings > API Keys**. Copier une clé serveur secrète au format `sb_secret_...` et la placer directement dans `.env.local` :

```dotenv
SUPABASE_SECRET_KEY=sb_secret_...
```

Ne jamais envoyer cette valeur dans un chat, une capture, Git ou du code client. Elle active les uploads avec quota, la suppression complète de compte, le comptage MCP et les opérations serveur privilégiées.

Redémarrer `npm run dev` après toute modification de `.env.local`.

## Réglages Supabase Auth

Dans le dashboard Supabase :

1. garder le fournisseur Email actif et tester l'email de confirmation ;
2. définir le Site URL local sur `http://localhost:3000` pendant le développement ;
3. ajouter `http://localhost:3000/auth/callback` aux URL de redirection ;
4. après déploiement, ajouter `https://DOMAINE/auth/callback` et remplacer le Site URL ;
5. activer OAuth 2.1 Server, l'enregistrement dynamique et l'écran de consentement pour le MCP ;
6. conserver une clé de signature JWT asymétrique et tester la révocation d'une application.

Avant la production, imposer au moins 8 caractères et des caractères variés dans **Auth > Providers > Email**. La protection contre les mots de passe divulgués est recommandée par l'advisor Supabase, mais nécessite actuellement le plan Pro ou supérieur.

## Stripe requis pour les offres Pro et Max

Créer deux prix récurrents mensuels en EUR dans Stripe :

- Pro : 15 EUR par mois ;
- Max : 30 EUR par mois.

Configurer ensuite, directement dans `.env.local` puis dans l'hébergeur :

```dotenv
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_MAX_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_AUTOMATIC_TAX=false
```

Créer le webhook `https://DOMAINE/api/stripe/webhook` avec uniquement :

- `checkout.session.completed` ;
- `customer.subscription.created` ;
- `customer.subscription.updated` ;
- `customer.subscription.deleted`.

Activer le Customer Portal Stripe avec changement d'offre, moyen de paiement et résiliation. Passer `STRIPE_AUTOMATIC_TAX=true` seulement après avoir activé et vérifié Stripe Tax.

Tester en mode test avant de remplacer les clés `sk_test_...` par les clés live.

## Informations légales à fournir

Renseigner avant toute publication commerciale :

```dotenv
NEXT_PUBLIC_LEGAL_NAME=
NEXT_PUBLIC_LEGAL_ADDRESS=
NEXT_PUBLIC_LEGAL_REGISTRATION=
NEXT_PUBLIC_SUPPORT_EMAIL=
NEXT_PUBLIC_REFUND_POLICY=
NEXT_PUBLIC_HOSTING_DETAILS=
```

Faire relire CGU, confidentialité et mentions par un professionnel adapté au pays d'établissement. Les pages affichent volontairement « À renseigner avant publication » tant qu'une valeur manque.

## Déploiement Vercel

1. connecter ce dépôt à Vercel ;
2. définir `NEXT_PUBLIC_APP_URL=https://DOMAINE` ;
3. copier toutes les variables Supabase, Stripe et légales ;
4. générer un `CRON_SECRET` aléatoire d'au moins 32 caractères ;
5. déployer, puis vérifier `/api/health` ;
6. enregistrer le domaine de production dans Supabase et Stripe ;
7. vérifier le cron quotidien `/api/cron/reconcile` dans **Settings > Cron Jobs**.

Vercel enverra automatiquement `Authorization: Bearer CRON_SECRET` au cron configuré dans `vercel.json`.

## Recette authentifiée automatique

Créer un compte de test confirmé, puis définir uniquement dans l'environnement de test :

```dotenv
E2E_USER_EMAIL=
E2E_USER_PASSWORD=
```

Exécuter :

```powershell
npm run verify
npm run test:e2e
```

Ne jamais utiliser un compte client réel comme compte E2E.