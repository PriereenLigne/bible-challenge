/**
 * Quiz du jour généré à partir du texte réellement lu : aucune banque de questions à maintenir, fonctionne hors connexion.
 * Il vérifie l'ATTENTION portée au texte ; il ne mesure ni la méditation ni la foi.
 */
export type Rng = () => number;
export interface QuizPassage { label: string; book: string; chapter: number; verses: [number, string][] }
export type QuestionKind = "missing_word" | "which_chapter" | "next_verse";
export interface Question { id: string; kind: QuestionKind; prompt: string; context: string; options: string[]; answer: number; ref: string }

export const QUIZ_COUNT = 3;
/** Réussite : au moins les deux tiers des réponses (2 sur 3). */
export const passed = (score: number, total: number) => total > 0 && score >= Math.ceil((total * 2) / 3);

const STOP = new Set(["toutes", "toujours", "avait", "avoir", "étaient", "était", "elles", "leurs", "leur", "cette", "ceux", "celui", "celle", "dans", "avec", "pour", "mais", "comme", "alors", "aussi", "ainsi", "après", "avant", "entre", "parce", "quand", "sont", "seront", "serez", "serai", "sera", "ceci", "cela", "vous", "nous", "dont", "vers", "sous", "sans", "chez", "plus", "tous", "tout", "toute", "même", "quel", "quelle", "quels", "lequel", "autre", "autres"]);
const WORD = /\p{L}+/gu;

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i] as T; a[i] = a[j] as T; a[j] = t; }
  return a;
}
const pick = <T>(arr: readonly T[], rng: Rng): T | undefined => arr[Math.floor(rng() * arr.length)];
const trunc = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

interface V { key: string; label: string; n: number; text: string }
interface Built { q: Omit<Question, "id">; used: string[] }

/** Mots « significatifs » : minuscules, 5 lettres ou plus, hors mots outils (donc ni noms propres ni mots vides). */
function eligible(text: string): { word: string; start: number; end: number }[] {
  const out: { word: string; start: number; end: number }[] = [];
  for (const m of text.matchAll(WORD)) {
    const w = m[0]; const start = m.index ?? 0;
    if (w.length >= 5 && /^\p{Ll}/u.test(w) && !STOP.has(w)) out.push({ word: w, start, end: start + w.length });
  }
  return out;
}

function missingWord(vs: V[], used: Set<string>, rng: Rng): Built | null {
  const cands = vs.filter((v) => !used.has(v.key) && v.text.length >= 40 && v.text.length <= 300 && eligible(v.text).length > 0);
  const v = pick(cands, rng); if (!v) return null;
  const w = pick(eligible(v.text), rng); if (!w) return null;
  const pool = new Set<string>();
  for (const x of vs) for (const e of eligible(x.text)) if (e.word !== w.word) pool.add(e.word);
  const near = shuffle([...pool], rng).sort((a, b) => Math.abs(a.length - w.word.length) - Math.abs(b.length - w.word.length)).slice(0, 3);
  if (near.length < 3) return null;
  const options = shuffle([w.word, ...near], rng);
  return { used: [v.key], q: { kind: "missing_word", prompt: "Quel mot manque dans ce verset ?", context: `${v.text.slice(0, w.start)}_____${v.text.slice(w.end)}`, options, answer: options.indexOf(w.word), ref: `${v.label}:${v.n}` } };
}

function whichChapter(vs: V[], labels: string[], used: Set<string>, rng: Rng): Built | null {
  if (labels.length < 2) return null;
  const v = pick(vs.filter((x) => !used.has(x.key) && x.text.length >= 30 && x.text.length <= 300), rng); if (!v) return null;
  const others = shuffle(labels.filter((l) => l !== v.label), rng).slice(0, 3);
  const options = shuffle([v.label, ...others], rng);
  return { used: [v.key], q: { kind: "which_chapter", prompt: "De quel passage vient ce verset ?", context: v.text, options, answer: options.indexOf(v.label), ref: `${v.label}:${v.n}` } };
}

function nextVerse(passages: QuizPassage[], vs: V[], used: Set<string>, rng: Rng): Built | null {
  const pairs: { cur: V; next: V }[] = [];
  for (const p of passages) {
    for (let i = 0; i + 1 < p.verses.length; i++) {
      const [n, t] = p.verses[i] as [number, string]; const [n2, t2] = p.verses[i + 1] as [number, string];
      if (t.length >= 25 && t2.length >= 25 && n2 === n + 1) pairs.push({ cur: { key: `${p.book}:${p.chapter}:${n}`, label: p.label, n, text: t }, next: { key: `${p.book}:${p.chapter}:${n2}`, label: p.label, n: n2, text: t2 } });
    }
  }
  const pr = pick(pairs.filter((x) => !used.has(x.cur.key) && !used.has(x.next.key)), rng); if (!pr) return null;
  const correct = trunc(pr.next.text, 110);
  const seen = new Set([correct, trunc(pr.cur.text, 110)]);
  const distract: string[] = [];
  for (const v of shuffle(vs, rng)) { const t = trunc(v.text, 110); if (v.text.length >= 25 && !seen.has(t)) { seen.add(t); distract.push(t); if (distract.length === 3) break; } }
  if (distract.length < 3) return null;
  const options = shuffle([correct, ...distract], rng);
  return { used: [pr.cur.key, pr.next.key], q: { kind: "next_verse", prompt: "Quel verset vient juste après celui-ci ?", context: trunc(pr.cur.text, 220), options, answer: options.indexOf(correct), ref: `${pr.cur.label}:${pr.cur.n}` } };
}

export function generateQuiz(passages: QuizPassage[], rng: Rng, count: number = QUIZ_COUNT): Question[] {
  const vs: V[] = passages.flatMap((p) => p.verses.map(([n, text]) => ({ key: `${p.book}:${p.chapter}:${n}`, label: p.label, n, text })));
  const labels = [...new Set(passages.map((p) => p.label))];
  const order: QuestionKind[] = shuffle<QuestionKind>(["missing_word", "which_chapter", "next_verse"], rng);
  const used = new Set<string>(); const out: Question[] = [];
  for (let i = 0; out.length < count && i < count * 4; i++) {
    const kind = order[i % order.length] as QuestionKind;
    const b = kind === "missing_word" ? missingWord(vs, used, rng) : kind === "which_chapter" ? whichChapter(vs, labels, used, rng) : nextVerse(passages, vs, used, rng);
    if (!b) continue;
    b.used.forEach((k) => used.add(k));
    out.push({ id: `q${out.length + 1}`, ...b.q });
  }
  return out;
}
