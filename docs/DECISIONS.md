# Registre des décisions

## Format

`ID — date — statut — décision — raison — conséquences`

## Décisions

- **D-001 — 2026-07-17 — ACCEPTÉE — Développer par versions à portes de validation.** Raison : protéger le périmètre et obtenir une vraie V1 commercialisable. Conséquence : aucune V2/V3 avant la sortie stable de V1.
- **D-002 — 2026-07-17 — ACCEPTÉE — Tracer l'état réel dans Markdown et Git.** Raison : conserver un contexte humain/IA durable sans journal inutile. Conséquence : tâches, décisions et changements visibles sont mis à jour avec le code concerné.
- **D-003 — 2026-07-17 — ACCEPTÉE — Utiliser un monolithe Next.js modulaire avec Supabase et Stripe.** Raison : réduire le temps de mise sur le marché tout en gardant des frontières extractibles. Conséquence : architecture de référence pour la V1.
- **D-004 — 2026-07-17 — ACCEPTÉE — Partager les cas d'usage entre interface et MCP.** Raison : mêmes validations, autorisations et quotas sur les deux surfaces. Conséquence : aucun CRUD direct spécifique à un contrôleur.
- **D-005 — 2026-07-17 — ACCEPTÉE — Limiter le profil V1 aux données utiles.** Raison : minimisation des données et absence d'usage des informations sensibles demandées initialement. Conséquence : profil étendu reporté.
- **D-006 — 2026-07-17 — ACCEPTÉE — Offres Pro 10 Go/50 000 appels et Max 50 Go/250 000 appels.** Raison : rendre les offres testables; les limites pourront évoluer avant publication selon coûts et bêta.

