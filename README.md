# Bible Challenge

Application de lecture biblique par défis, PWA, utilisable hors connexion. En ligne : https://bible-challenge-eta.vercel.app

**Statut : fonctionnelle, en cours de finition.**

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
- Authentification e-mail (`src/app/connexion`), profil, enregistrement d'un défi dans Supabase (`src/lib/challenges/`)
- Accueil : lecture du jour, validation hors connexion, file d'attente et synchronisation (`src/components/TodayReading.tsx`)
- Texte Louis Segond 1910 (domaine public) installé dans `public/bibles/lsg`, vérifié : 66 livres, 1189 chapitres, 31 170 versets (voir `docs/CONTENU-LICENCES.md`)
- Liens « lecture du jour » vers le lecteur avec validation du chapitre (`src/lib/offline/mark-read.ts`, `src/lib/bible/params.ts`)
- Équipes : création, invitations par code (expiration, révocation), défi commun, progression partagée avec confidentialité (`supabase/migrations/0003_teams.sql`, `src/lib/teams/`, `src/components/Team*.tsx`)
- Navigation entre tous les jours (avance, rattrapage), quiz du jour aléatoire généré à partir du texte lu (obligatoire pour terminer un jour), blocs-notes privés par chapitre et par jour, synchronisés sans perte (`supabase/migrations/0004_quiz_notes_fix.sql`)
- Journal (`/profil/journal`) : recherche sans accents, ouverture, export .txt ; mot de passe oublié (`/connexion/nouveau`) ; icônes PNG (normale, maskable, Apple)
- Refonte visuelle : thème clair/sombre/auto, héros avec anneau de progression, accueil qui ouvre directement le défi choisi, sélecteur de défis, classement d'équipe désactivable, tableau de bord (série, bilan hebdomadaire, badges), favoris et surlignage de versets, rappels par calendrier (.ics) (`supabase/migrations/0005_ranking_marks.sql`)
- Écoute audio : enregistrement Trésor Sonore (CC BY-NC-ND 4.0, **application gratuite et non commerciale obligatoire**) ou voix du téléphone, lecture enchaînée, commandes de l'écran verrouillé (`src/components/AudioPlayer.tsx`, `src/lib/audio/`, `docs/CONTENU-LICENCES.md`)
- Lecteur biblique (`src/components/BibleReader.tsx`), téléchargement hors connexion (`DownloadPanel`), importeur USFM vérifié contre le canon (`scripts/import-bible.mjs`)
- Coquille PWA (manifest, Service Worker, logo), navigation 5 entrées, aperçu de calendrier fonctionnel sur `/defis`

## Vérifié (10 novembre 2026)
- `npm install`, `npm run typecheck`, `npm test` (143 tests, 16 fichiers) et `npm run build` passent sans erreur.

## Reste à vérifier
- Service Worker, IndexedDB et lecture audio hors connexion : à tester sur un vrai téléphone.
- Politiques RLS et fonctions `security definer` (module équipes) : relecture de sécurité recommandée.

## Pas encore implémenté
Notifications push (les rappels passent par un fichier .ics), administration, tests de bout en bout (navigateur), intégration continue, suivi des erreurs, pages légales (confidentialité, conditions d'utilisation).

## Organisation du dépôt
```
src/app/          pages (Next.js App Router)
src/components/   composants d'interface
src/lib/          logique métier (bible, plans, progression, hors ligne, équipes, audio…)
tests/            tests vitest
public/bibles/    texte Louis Segond 1910 (JSON par livre)
supabase/         migrations SQL (migrations/) et versions pour l'éditeur SQL (sql-editor/)
scripts/          importeurs de textes bibliques
docs/             architecture et licences des contenus
```
Pour envoyer des modifications, utilisez Git plutôt que l'envoi de fichiers sur le site GitHub : glisser des fichiers isolés les dépose à la racine du dépôt au lieu de leur dossier.
