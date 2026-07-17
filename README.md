# Lownheur

Lownheur est un SaaS pour organiser catégories, événements, objectifs et planifications depuis une interface web ou une IA compatible MCP.

La V1 approuvée est en réalisation avancée. Le socle, l'authentification, le dashboard, les médias privés, le serveur MCP, les offres, les pages légales et les contrôles automatisés sont implémentés. La publication reste conditionnée aux secrets propriétaire, à Stripe live, au déploiement et à la recette clients MCP.

## Lancer localement

```powershell
npm install
npm run dev
```

Ouvrir `http://localhost:3000/fr`.

Consulter [`docs/OWNER_SETUP.md`](docs/OWNER_SETUP.md) pour les variables manquantes et [`docs/OPERATIONS.md`](docs/OPERATIONS.md) pour sauvegarde, monitoring et rollback.

## Vérifications

```powershell
npm run verify
npm run test:e2e
```

## Documents de référence

- [`docs/versions/V1.md`](docs/versions/V1.md) : contrat fonctionnel approuvé.
- [`docs/TASKS_V1.md`](docs/TASKS_V1.md) : état réel et preuves.
- [`docs/architecture/V1.md`](docs/architecture/V1.md) : architecture.
- [`docs/OWNER_SETUP.md`](docs/OWNER_SETUP.md) : actions du propriétaire.
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md) : exploitation.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) : décisions.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) : changements visibles.

Ouvrir `dashboard_human_developper.html` pour parcourir et rechercher toutes les sources Markdown.
