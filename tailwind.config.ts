import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", ink: "var(--ink)", muted: "var(--muted)",
        line: "var(--line)", forest: "var(--forest)", progress: "var(--progress)",
        sand: "var(--sand)", calm: "var(--calm)",
      },
      fontFamily: {
        reading: ["Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
        ui: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
} satisfies Config;
