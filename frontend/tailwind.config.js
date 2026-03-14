/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#050505",
        panel: "#0f0f0f",
        accent: "#f5c518",
        muted: "#a7a7a7"
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 35px rgba(245, 197, 24, 0.25)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both"
      }
    }
  },
  plugins: []
};
