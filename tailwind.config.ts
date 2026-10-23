import type { Config } from "tailwindcss";
// Couleurs en canaux RGB : permet la transparence (bg-sand/40) et le thème clair/sombre.
const c = (v: string) => `rgb(var(--c-${v}) / <alpha-value>)`;
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: { bg: c("bg"), surface: c("surface"), ink: c("ink"), muted: c("muted"), line: c("line"), forest: c("forest"), forest2: c("forest2"), progress: c("progress"), sand: c("sand"), calm: c("calm"), gold: c("gold") },
      fontFamily: {
        reading: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "serif"],
        ui: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: { card: "var(--shadow-card)", lift: "var(--shadow-lift)" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(.9)", opacity: "0" }, "60%": { transform: "scale(1.04)" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: { "fade-up": "fade-up .55s cubic-bezier(.2,.7,.2,1) both", pop: "pop .35s ease-out both" },
    },
  },
} satisfies Config;
