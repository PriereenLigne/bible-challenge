/** Anneau de progression animé. value : 0 à 100. */
export function ProgressRing({ value, size = 112, stroke = 10, color = "rgb(233 214 165)", track = "rgb(255 255 255 / .18)", children, label }: {
  value: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode; label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progression"}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
