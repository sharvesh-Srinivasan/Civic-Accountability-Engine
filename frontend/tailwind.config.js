/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
        "paper": "#F9FAFB",
        "surface": "#FFFFFF",
        "ink": "#0F172A",
        "muted": "#64748B",
        "navy": {
          "DEFAULT": "#0F172A",
          "light": "#1E293B",
          "surface": "#F1F5F9"
        },
        "sage": {
          "DEFAULT": "#10B981",
          "light": "#34D399"
        },
        "terracotta": {
          "DEFAULT": "#F43F5E",
          "light": "#FB7185"
        },
        "border": "#E2E8F0",
        "primary": "#0F172A",
        "secondary": "#10B981",
        "error": "#F43F5E"
      },
      "boxShadow": {
        "glass": "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        "glass-sm": "0 4px 16px 0 rgba(31, 38, 135, 0.05)",
        "glow-navy": "0 0 20px rgba(15, 23, 42, 0.15)",
        "glow-sage": "0 0 20px rgba(16, 185, 129, 0.3)",
        "glow-terracotta": "0 0 20px rgba(244, 63, 94, 0.3)"
      },
      "keyframes": {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(15px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "shimmer": {
          "100%": { transform: "translateX(100%)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" }
        },
        "blob": {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" }
        }
      },
      "animation": {
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "shimmer": "shimmer 1.5s infinite linear",
        "float": "float 3s ease-in-out infinite",
        "blob": "blob 7s infinite"
      },
      "borderRadius": {
        "DEFAULT": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        "4xl": "3rem",
        "full": "9999px"
      },
      "spacing": {
        "margin-desktop": "32px",
        "margin-mobile": "16px",
        "stack-md": "16px",
        "container-max": "1200px",
        "unit": "4px",
        "gutter": "24px",
        "stack-lg": "32px",
        "stack-sm": "8px"
      },
      "fontFamily": {
        "headline-lg": ["Public Sans"],
        "label-md": ["Public Sans"],
        "body-lg": ["Public Sans"],
        "body-md": ["Public Sans"],
        "display-lg": ["Public Sans"],
        "headline-md": ["Public Sans"],
        "caption": ["Public Sans"],
        "headline-lg-mobile": ["Public Sans"],
        "serif": ["Lora", "serif"]
      },
      "fontSize": {
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
        "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.02em", "fontWeight": "600" }],
        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "caption": ["12px", { "lineHeight": "16px", "fontWeight": "400" }],
        "headline-lg-mobile": ["28px", { "lineHeight": "36px", "fontWeight": "700" }]
      }
    },
  },
  plugins: [],
}
