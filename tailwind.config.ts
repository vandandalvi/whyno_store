import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d1d1f",
        mute: "#6e6e73",
        paper: "#fbfbf9",
        sand: "#f3f2ee",
        line: "#e5e4de",
        lime: { DEFAULT: "#E3EF76", deep: "#c9d84a", ink: "#3b4200" },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-space)", "var(--font-dm-sans)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)",
        lift: "0 2px 4px rgba(0,0,0,.05), 0 18px 40px rgba(0,0,0,.10)",
      },
      borderRadius: { xl2: "1.25rem", xl3: "1.75rem" },
    },
  },
  plugins: [],
} satisfies Config;
