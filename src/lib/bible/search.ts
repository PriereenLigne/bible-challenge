/**
 * Recherche plein texte tolérante dans la Bible.
 * On peut taper quelques mots, une phrase approximative, avec ou sans accents, avec des fautes :
 * « dieu a tant aime le monde », « l'eternel est mon berger », « tous ont peche et sont prives »…
 * Chaque mot tapé est rapproché des mots du texte (identique, début de mot, 1 à 2 fautes de frappe),
 * puis les versets sont classés : mots rares trouvés, proportion de mots trouvés, mots dans le bon ordre.
 */
export interface SearchVerse { book: string; chapter: number; verse: number; text: string }
export interface SearchHit extends SearchVerse { score: number; /** mots du texte (normalisés) qui correspondent à la recherche */ terms: string[] }

/** minuscules, sans accents, ligatures ouvertes, ponctuation et apostrophes → espaces */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
export const tokenize = (s: string): string[] => { const n = normalize(s); return n ? n.split(" ") : []; };

/** mots trop fréquents pour aider à trouver un verset (gardés seulement s'ils sont seuls dans la recherche) */
const STOP = new Set(("a au aux avec ce ces cet cette d de des du elle elles en est et il ils j je l la le les leur leurs lui m ma mais me mes moi mon " +
  "n ne nous on ou par pas pour qu que qui s sa se ses si son sont sur t ta te tes toi ton tu un une vous y c car dans").split(" "));

/** Distance d'édition (avec inversion de deux lettres), arrêtée dès qu'elle dépasse `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = b.length;
  let prev2 = new Array<number>(n + 1).fill(0), prev = Array.from({ length: n + 1 }, (_, j) => j), cur = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i; let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur[j] = v; if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[n]!;
}

/** Qualité du rapprochement entre un mot tapé et un mot du texte (0 = aucun). */
export function matchQuality(q: string, w: string): number {
  if (q === w) return 1;
  if (q.length >= 3 && w.startsWith(q)) return 0.85 - Math.min(0.25, (w.length - q.length) * 0.04); // début de mot : « berg » → berger
  if (w.length >= 4 && q.startsWith(w) && q.length - w.length <= 3) return 0.8; // terminaison en trop : « aimes » → aime
  if (q.length < 4) return 0;
  const max = q.length >= 8 ? 2 : 1;
  const d = editDistance(q, w, max);
  if (d <= max) return d === 1 ? 0.75 : 0.55;
  // racine commune longue : « pecheurs » ~ « pecheur », « justifies » ~ « justification »
  if (q.length >= 6 && w.length >= 6) { let k = 0; while (k < q.length && k < w.length && q[k] === w[k]) k++; if (k >= 5 && k >= Math.min(q.length, w.length) - 3) return 0.5; }
  return 0;
}

export class BibleIndex {
  readonly verses: SearchVerse[] = [];
  private readonly postings = new Map<string, number[]>();
  private vocab: string[] | null = null;

  add(v: SearchVerse) {
    const id = this.verses.push(v) - 1;
    for (const t of new Set(tokenize(v.text))) {
      const p = this.postings.get(t);
      if (p) p.push(id); else this.postings.set(t, [id]);
    }
    this.vocab = null;
  }
  get size() { return this.verses.length; }

  private termsFor(q: string): [string, number][] {
    const vocab = (this.vocab ??= [...this.postings.keys()]);
    const out: [string, number][] = [];
    for (const w of vocab) { const m = matchQuality(q, w); if (m > 0) out.push([w, m]); }
    return out;
  }

  search(query: string, limit = 30): SearchHit[] {
    const all = tokenize(query);
    if (!all.length || !this.verses.length) return [];
    let qs = all.filter((t) => !STOP.has(t));
    if (!qs.length) qs = all;
    qs = [...new Set(qs)].slice(0, 12);
    const N = this.verses.length;
    // pour chaque verset : somme des meilleurs rapprochements de chaque mot tapé, pondérés par la rareté
    const score = new Map<number, number>(), found = new Map<number, number>();
    const termOf = new Map<number, Set<string>>();
    let totalWeight = 0;
    for (const q of qs) {
      const terms = this.termsFor(q);
      let df = 0; for (const [w] of terms) df += this.postings.get(w)!.length;
      const weight = Math.log(1 + N / (1 + Math.min(df, N))) + 0.3;
      totalWeight += weight;
      const best = new Map<number, number>();
      for (const [w, m] of terms) for (const id of this.postings.get(w)!) {
        if ((best.get(id) ?? 0) < m) best.set(id, m);
        let s = termOf.get(id); if (!s) termOf.set(id, (s = new Set())); s.add(w);
      }
      for (const [id, m] of best) { score.set(id, (score.get(id) ?? 0) + m * weight); found.set(id, (found.get(id) ?? 0) + 1); }
    }
    // présélection : on ne garde que les versets couvrant assez de mots, puis on affine sur l'ordre des mots
    const need = qs.length <= 2 ? qs.length : Math.ceil(qs.length * 0.5);
    let cand = [...score.keys()].filter((id) => found.get(id)! >= need);
    if (!cand.length) cand = [...score.keys()];
    cand.sort((a, b) => score.get(b)! - score.get(a)!);
    cand = cand.slice(0, 400);
    const hits: SearchHit[] = cand.map((id) => {
      const v = this.verses[id]!;
      const cover = found.get(id)! / qs.length;
      let s = (score.get(id)! / totalWeight) * (0.4 + 0.6 * cover * cover);
      if (qs.length > 1) s += 0.25 * orderBonus(qs, tokenize(v.text));
      s -= Math.min(0.08, tokenize(v.text).length / 1500); // à égalité, le verset court est plus probable
      return { ...v, score: s, terms: [...(termOf.get(id) ?? [])] };
    });
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }
}

/** Proportion des mots tapés retrouvés dans le même ordre (et proches) dans le verset : 0 à 1. */
export function orderBonus(qs: string[], words: string[]): number {
  let pos = -1, inOrder = 0, near = 0;
  for (const q of qs) {
    let at = -1;
    for (let i = pos + 1; i < words.length; i++) if (matchQuality(q, words[i]!) > 0) { at = i; break; }
    if (at < 0) continue;
    if (pos >= 0 && at - pos <= 3) near++;
    inOrder++; pos = at;
  }
  return (inOrder / qs.length) * 0.6 + (qs.length > 1 ? near / (qs.length - 1) : 0) * 0.4;
}

/** Découpe un texte en morceaux à surligner selon les mots trouvés. */
export function highlight(text: string, terms: string[]): { t: string; hit: boolean }[] {
  if (!terms.length) return [{ t: text, hit: false }];
  const set = new Set(terms);
  const out: { t: string; hit: boolean }[] = [];
  const re = /[\p{L}\p{N}]+/gu;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (!set.has(normalize(m[0]))) continue;
    if (m.index > last) out.push({ t: text.slice(last, m.index), hit: false });
    out.push({ t: m[0], hit: true }); last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), hit: false });
  return out;
}
