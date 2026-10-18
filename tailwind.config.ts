import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,css}",
    "./components/**/*.{ts,tsx,css}",
    "./app/**/*.css",
    "./components/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        // Кастомный бренд-цвет (яркий акцент)
        "brand-yellow": "#FFC700",
        // Системные цвета, привязанные к CSS-переменам (светлая/тёмная тема)
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card-bg)",
          border: "var(--card-border)",
        },
        muted: {
          DEFAULT: "var(--text-muted)",
        },
        // Сохраняем обратную совместимость с существующими компонентами
        ink: {
          DEFAULT: "#0a0a0a",
          soft: "#141414",
          muted: "#2a2a2a",
        },
        paper: {
          DEFAULT: "#fafaf7",
          soft: "#f3f1ea",
        },
        accent: {
          DEFAULT: "#ffd200",
          hover: "#ffc100",
          soft: "#fff7cc",
        },
        line: {
          DEFAULT: "#e5e3da",
          soft: "#f0ede4",
        },
      },
      boxShadow: {
        "neon-yellow": "0 0 15px rgba(255, 199, 0, 0.3)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        content: "1120px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "scan": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",
        "scan": "scan 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;