const PATHS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  book: "M4 5c3-1.5 6-1.5 8 0 2-1.5 5-1.5 8 0v14c-3-1.5-6-1.5-8 0-2-1.5-5-1.5-8 0zM12 5v14",
  flag: "M5 21V4m0 0h12l-2 4 2 4H5",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 1a2.5 2.5 0 1 0 0-5M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5m2-4.5c2.5 0 4 1.2 4 4.5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6",
  flame: "M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 1.5 1 2 1.5 2C10 8 11 5 12 3z",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M10 18h4",
  bell: "M6 9a6 6 0 0 1 12 0c0 6 2 8 2 8H4s2-2 2-8zM10 20a2 2 0 0 0 4 0",
  pencil: "M16 3.5a2.1 2.1 0 0 1 3 3L7 18.5 3 20l1.5-4z",
  heart: "M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z",
  check: "M5 12.5 10 17.5 19 7",
  calendar: "M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  chart: "M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-3",
  share: "M12 3v12M8 7l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6",
  copy: "M9 9h10v11H9zM5 15V4h10",
  lock: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
  "chevron-left": "m15 5-7 7 7 7",
  "chevron-right": "m9 5 7 7-7 7",
  plus: "M12 5v14M5 12h14",
  award: "M12 14a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM8.5 13l-1.5 8 5-3 5 3-1.5-8",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  download: "M12 4v12M8 12l4 4 4-4M5 20h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  x: "M6 6l12 12M18 6 6 18",
  highlighter: "M14 4l6 6-8 8H7v-5zM4 21h6",
  crown: "M4 8l4 4 4-6 4 6 4-4-2 11H6z",
  headphones: "M4 16v-4a8 8 0 0 1 16 0v4M4 16a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2zM20 16a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z",
  play: "M8 5v14l11-7z",
  pause: "M8 5v14M16 5v14",
  "skip-forward": "M5 5v14l10-7zM19 5v14",
  "skip-back": "M19 5v14L9 12zM5 5v14",
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className, filled = false, strokeWidth = 1.8 }: { name: IconName; size?: number; className?: string; filled?: boolean; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
