# Architecture

## Décisions
- **Chapitre = unité de lecture.** Les versets dépendent de la traduction, donc des licences. Les programmes ne dépendent d'aucun texte.
- **Répartition** : le jour *i* reçoit les chapitres d'indice `[floor(i·N/D), floor((i+1)·N/D))`. Résultat : déterministe, couverture exacte une fois, écarts de charge ≤ 1 chapitre. Si D > N, les jours vides sont des jours de repos.
- **Durées** : mois = 365,25/12 ≈ 30,4375 jours, arrondi ; 1 an = 365 jours.
- **Progression** : `contentReadPercent` = chapitres uniques lus / chapitres du programme ; `elapsedTimePercent` = temps ; `chaptersBehind` = dû à date − lu. Jamais mélangés.
- **Rattrapage** : `redistributeRemaining` ne planifie que les chapitres non lus. L'historique (`reading_events`) n'est jamais modifié.

## Hors ligne
1. `enqueue` écrit l'opération dans IndexedDB avant tout réseau.
2. `syncOnce` vérifie que le backend répond (`health`), puis envoie ; une opération n'est supprimée qu'après réponse explicite.
3. Idempotence serveur : `reading_events.op_id` unique + unicité `(user, défi, livre, chapitre)`.
4. Échec : attente exponentielle (5 s à 15 min), rien n'est perdu.
5. Notes : conflit → version concurrente conservée dans `note_conflicts` (à implémenter côté serveur).
6. Le Service Worker ne met en cache que la coquille ; les données vivent dans IndexedDB, hors de portée du nettoyage de cache.

## Limites connues
- Le Service Worker met en cache à la volée : une page jamais visitée en ligne n'est pas disponible hors ligne (hors liste `SHELL`).
- Les rappels hors application ne sont pas fiables en PWA (surtout iOS) ; Capacitor est à évaluer pour les notifications natives.
- Icône PWA en SVG uniquement ; des PNG 192/512 sont nécessaires pour certaines installations Android.
