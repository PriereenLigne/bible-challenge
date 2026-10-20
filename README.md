# Bible Challenge

Application de lecture biblique par défis, PWA, utilisable hors connexion. **Statut : fondations (phases 1 à 3 partielles).**

## Démarrage
```bash
npm install
npm test          # vitest : canon, calendriers, progression, synchronisation
npm run typecheck
npm run dev
```
Copiez `.env.example` vers `.env.local` et renseignez votre projet Supabase (aucune clé n'est fournie).

## Ce qui est réalisé
- Référentiel du canon protestant (66 livres, 1189 chapitres) : `src/lib/bible/canon.ts`
- Moteur de calendrier déterministe (13 durées, 6 types de programmes, rattrapage sans réécriture de l'historique) : `src/lib/plans/`
- Calcul de progression : contenu lu, temps écoulé et retard sont trois mesures séparées : `src/lib/progress/`
- File d'opérations hors ligne persistante (IndexedDB), synchronisation idempotente avec reprise : `src/lib/offline/`
- Migration SQL avec RLS et fonction `apply_reading_events` : `supabase/migrations/0001_core.sql`
- Validation des opérations (`src/lib/validation/`), transport Supabase par API REST testé avec un faux serveur (`src/lib/offline/supabase-transport.ts`), module de badges (`src/lib/badges/`)
- `vercel.json` force le framework Next.js (corrige les 404 si Vercel ne détecte pas le projet)
- Coquille PWA (manifest, Service Worker, logo), navigation 5 entrées, aperçu de calendrier fonctionnel sur `/defis`

## Vérifié
49 tests de logique pure exécutés avec succès, sur un lanceur Node de remplacement (vitest n'a pas pu être installé sans réseau). Relancez `npm test` pour la confirmation officielle.

## NON vérifié
- `npm install`, `tsc`, `next build` : jamais exécutés
- Migration SQL et politiques RLS : jamais appliquées à une base réelle
- Service Worker et IndexedDB : jamais exécutés dans un navigateur ; test hors ligne sur appareil réel requis
- Aucun déploiement effectué

## Pas encore implémenté
Authentification, branchement de la file hors ligne à l'interface, lecteur biblique (aucun texte sous licence), enregistrement des défis, notes, favoris, équipes, invitations, badges, rappels, administration, paiements, tests e2e et de sécurité.

## Prochaines étapes
1. Déposer ce code dans un dépôt GitHub, lancer `npm install && npm test && npm run build`.
2. Créer un projet Supabase, appliquer `0001_core.sql`, fournir URL et clé publique.
3. Phase 2 : écrans d'authentification, branchement de `createSupabaseTransport` à `syncOnce` dans l'interface, enregistrement des défis.
