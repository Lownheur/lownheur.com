# Flux d'ingénierie

## Portes de validation

1. **Vision** : besoin et frontière des versions écrits.
2. **Version approuvée** : contrat fonctionnel, hors périmètre et critères de sortie validés.
3. **Développement** : tâches prises une par une, preuves et commits atomiques.
4. **Release candidate** : périmètre gelé, tests et audits complets.
5. **Stable** : défauts bloquants corrigés, déploiement et rollback prouvés.
6. **Publiée** : smoke test production et validation explicite du propriétaire.

Une porte échouée renvoie à la porte précédente concernée. La V2 n'est pas spécifiée tant que la V1 n'est pas publiée et observée.

## Cycle d'une tâche

1. Vérifier que la version est approuvée et que la tâche a des critères d'acceptation.
2. Passer la tâche à `EN COURS`; noter toute décision nouvelle avant de coder.
3. Implémenter le plus petit changement cohérent.
4. Tester au niveau adapté : unité, intégration, E2E et/ou sécurité.
5. Mettre à jour tâche, changelog, décision et journal seulement si concernés.
6. Relire le diff, puis créer un commit atomique `type(V1-xxx): description`.

## Branches et revue

- `main` doit rester déployable.
- Une branche courte par tâche : `feat/V1-xxx-description`, `fix/...`, `docs/...`.
- Fusion après critères d'acceptation, contrôles CI et revue du diff.
- Aucun secret, fichier d'environnement réel, build généré ou dépendance vendored dans Git.

## Définition de terminé

Une tâche est `TERMINÉ` seulement si le comportement demandé fonctionne, les erreurs sont traitées, l'accessibilité et les deux langues sont couvertes si l'UI change, les contrôles passent et la documentation utile reflète le résultat réel.

## Gestion des changements

Une demande qui modifie le contrat V1 est écrite dans `docs/DECISIONS.md` avec impact sur délai, données, sécurité et tâches. Elle n'entre dans la version qu'après décision explicite. Les idées acceptées pour plus tard vont dans la vision, sans code préparatoire.

