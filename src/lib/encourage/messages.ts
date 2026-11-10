/**
 * Messages qui accompagnent l'utilisateur : salutation, encouragement, célébration.
 * Ton toujours bienveillant : le retard n'est jamais présenté comme une faute.
 */

/** « Bonjour » jusqu'à 17 h 59, « Bonsoir » ensuite et pendant la nuit. */
export function greeting(hour: number): string {
  return hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
}

export interface EncourageInput { streak: number; chaptersBehind: number; todayDone: boolean; daysDone: number }

/** Une phrase courte sous la salutation, adaptée à la situation du jour. */
export function encouragement({ streak, chaptersBehind, todayDone, daysDone }: EncourageInput): string {
  if (todayDone) return streak >= 2 ? `Lecture du jour terminée. ${streak} jours de suite : quelle belle fidélité !` : "Lecture du jour terminée. Que cette Parole vous accompagne aujourd’hui.";
  if (chaptersBehind >= 10) return "Vous avez pris un peu de retard : ce n’est pas grave. Reprenez simplement aujourd’hui, à votre rythme.";
  if (chaptersBehind > 0) return `Encore ${chaptersBehind} chapitre${chaptersBehind > 1 ? "s" : ""} pour être à jour. Un petit pas aujourd’hui suffit.`;
  if (streak >= 7) return `${streak} jours de suite. Continuez, vous tenez le cap !`;
  if (streak >= 2) return `${streak} jours de suite. Bonne lecture !`;
  if (daysDone === 0) return "Votre première lecture vous attend. Prenez quelques minutes, au calme.";
  return "Quelques minutes avec la Parole pour bien commencer.";
}

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100, 200, 365];

export interface Celebration { title: string; message: string; big: boolean }

/** Message affiché quand une journée de lecture est terminée. */
export function celebrate(dayNumber: number, totalDays: number, streak: number): Celebration {
  if (dayNumber >= totalDays) return { title: "Défi terminé !", message: `Vous avez lu jusqu’au bout : ${totalDays} jour${totalDays > 1 ? "s" : ""} de lecture. Gloire à Dieu pour votre persévérance !`, big: true };
  if (STREAK_MILESTONES.includes(streak)) return { title: `${streak} jours de suite !`, message: "Votre régularité porte du fruit. Continuez ainsi.", big: true };
  const half = Math.ceil(totalDays / 2);
  if (totalDays >= 4 && dayNumber === half) return { title: "Mi-parcours !", message: "Vous avez fait la moitié du chemin. Courage pour la suite !", big: true };
  return { title: `Jour ${dayNumber} terminé`, message: "Bravo ! À demain pour la suite.", big: false };
}
