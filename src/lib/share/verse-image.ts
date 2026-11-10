/**
 * Image de partage d'un verset (format portrait 1080 × 1350, adapté à WhatsApp, Facebook et Instagram).
 * Dessinée sur l'appareil : aucun serveur, fonctionne hors connexion.
 */
export const IMG_W = 1080;
export const IMG_H = 1350;

/** Découpe un texte en lignes qui tiennent dans `maxWidth`, selon une fonction de mesure (testable sans navigateur). */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const tryLine = line ? `${line} ${w}` : w;
    if (!line || measure(tryLine) <= maxWidth) { line = tryLine; continue; }
    lines.push(line); line = w;
  }
  if (line) lines.push(line);
  return lines;
}

/** Taille de police la plus grande (pas de 4 px) pour laquelle le texte tient dans la hauteur disponible. */
export function fitFontSize(text: string, maxWidth: number, maxHeight: number, measureAt: (s: string, px: number) => number, max = 64, min = 30, lineFactor = 1.4): { size: number; lines: string[] } {
  for (let size = max; size >= min; size -= 4) {
    const lines = wrapText(text, maxWidth, (s) => measureAt(s, size));
    if (lines.length * size * lineFactor <= maxHeight) return { size, lines };
  }
  return { size: min, lines: wrapText(text, maxWidth, (s) => measureAt(s, min)) };
}

const SERIF = `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;
const SANS = `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

export async function renderVerseImage({ text, reference, version, footer }: { text: string; reference: string; version: string; footer: string }): Promise<Blob> {
  const c = document.createElement("canvas"); c.width = IMG_W; c.height = IMG_H;
  const g = c.getContext("2d"); if (!g) throw new Error("Dessin impossible sur cet appareil.");

  // fond vert profond, lumière dorée en haut à droite
  const bg = g.createLinearGradient(0, 0, IMG_W, IMG_H);
  bg.addColorStop(0, "#173F35"); bg.addColorStop(0.55, "#1B4C3E"); bg.addColorStop(1, "#226B52");
  g.fillStyle = bg; g.fillRect(0, 0, IMG_W, IMG_H);
  const glow = g.createRadialGradient(IMG_W, 0, 0, IMG_W, 0, IMG_W * 0.9);
  glow.addColorStop(0, "rgba(233,214,165,0.32)"); glow.addColorStop(1, "rgba(233,214,165,0)");
  g.fillStyle = glow; g.fillRect(0, 0, IMG_W, IMG_H);

  const pad = 110;
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillStyle = "#E9D6A5"; g.font = `400 120px ${SERIF}`;
  g.fillText("“", IMG_W / 2, 270);

  const measureAt = (s: string, px: number) => { g.font = `400 ${px}px ${SERIF}`; return g.measureText(s).width; };
  const { size, lines } = fitFontSize(`${text}`, IMG_W - pad * 2, 700, measureAt);
  const lh = size * 1.4;
  const top = 330 + (700 - lines.length * lh) / 2 + size;
  g.font = `400 ${size}px ${SERIF}`; g.fillStyle = "#F8F6F0";
  lines.forEach((l, i) => g.fillText(l, IMG_W / 2, top + i * lh));

  g.fillStyle = "#E9D6A5"; g.font = `600 44px ${SERIF}`;
  g.fillText(reference, IMG_W / 2, 1120);
  g.fillStyle = "rgba(248,246,240,0.7)"; g.font = `400 28px ${SANS}`;
  g.fillText(version, IMG_W / 2, 1168);
  g.fillStyle = "rgba(248,246,240,0.55)"; g.font = `600 26px ${SANS}`;
  g.fillText(footer.toUpperCase().split("").join(" "), IMG_W / 2, IMG_H - 70);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Image non créée."))), "image/png"));
}

/** Partage l'image (WhatsApp, etc.) si l'appareil le permet, sinon la télécharge. Renvoie ce qui s'est passé. */
export async function shareVerseImage(opts: { text: string; reference: string; version: string; footer: string }): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await renderVerseImage(opts);
  const name = `${opts.reference.replace(/[^\p{L}\p{N}]+/gu, "-")}.png`;
  const file = new File([blob], name, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: `${opts.reference} — ${opts.footer}` }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
