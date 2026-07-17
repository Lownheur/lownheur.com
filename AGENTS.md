# Règles de travail Lownheur

Ces règles s'appliquent à tout humain ou agent IA travaillant dans ce dépôt.

## Source de vérité

1. Lire `docs/versions/V1.md`, `docs/TASKS_V1.md` et `docs/DECISIONS.md` avant toute modification.
2. Ne développer que la version marquée `APPROUVÉE`.
3. Ne jamais introduire une idée V2/V3 dans la V1 sans décision écrite et validation explicite du propriétaire.
4. Si les documents et le code divergent, arrêter, signaler l'écart et corriger la source de vérité validée.

## Traçabilité minimale obligatoire

- Une tâche possède un identifiant stable (`V1-xxx`) et des critères d'acceptation.
- Avant le travail : passer la tâche à `EN COURS` dans `docs/TASKS_V1.md`.
- Après le travail : exécuter les contrôles requis, noter les preuves utiles, passer la tâche à `TERMINÉ`.
- Toute décision qui change le périmètre, les données, la sécurité ou l'architecture va dans `docs/DECISIONS.md`.
- Tout changement visible par l'utilisateur va dans `docs/CHANGELOG.md`.
- Les jalons seulement vont dans `docs/JOURNAL.md`; ne pas y recopier chaque commande.
- Après toute modification d'un fichier Markdown, régénérer `dashboard_human_developper.html` avec `node scripts/generate-doc-dashboard.mjs`.
- Chaque commit doit être atomique et référencer la tâche : `type(V1-xxx): description`.

## Qualité

- TypeScript strict, code et identifiants en anglais, interface et documentation produit disponibles en français et anglais.
- Les règles métier sont partagées par l'interface web et le MCP; aucune duplication de logique d'autorisation.
- Toute table exposée est protégée par RLS et par une vérification de propriété utilisateur.
- Aucune clé secrète dans le client ou dans Git.
- Une tâche n'est terminée que si lint, types, tests concernés et critères d'acceptation passent.
- Toute fonctionnalité importante possède au minimum un test de comportement; les parcours critiques possèdent un test E2E.

## Discipline de périmètre

Privilégier la solution la plus petite qui respecte la V1. Ne pas ajouter d'IA intégrée, d'éditeur vidéo, de connecteur tiers, de récurrence ou de notification tant que la V1 ne les inclut pas explicitement.

