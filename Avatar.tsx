const TINTS = ["#3B9467", "#315D88", "#B07D2B", "#8A5A9B", "#B5524A", "#2D7F86"];
/** Pastille d'initiale, teinte stable selon le nom. */
export function Avatar({ name, size = 40, ring = false }: { name: string; size?: number; ring?: boolean }) {
  const h = [...name].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${ring ? "ring-2 ring-sand" : ""}`}
      style={{ width: size, height: size, background: TINTS[h % TINTS.length], fontSize: size * 0.42 }}>
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
