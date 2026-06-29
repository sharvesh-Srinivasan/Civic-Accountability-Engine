/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
        "paper": "#F7F5F0",
        "surface": "#FFFFFF",
        "ink": "#1C1C1A",
        "muted": "#6B6862",
        "navy": {
          "DEFAULT": "#16284A",
          "light": "#27406E",
          "surface": "#EEF1F6"
        },
        "sage": "#3D8B6F",
        "terracotta": "#C2703D",
        "border": "#E8E4DC",
        // Keeping primary/secondary aliases just in case to prevent hard crashes initially
        "primary": "#16284A",
        "secondary": "#3D8B6F",
        "error": "#C2703D"
      },
      "keyframes": {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "shimmer": {
          "100%": { transform: "translateX(100%)" }
        }
      },
      "animation": {
        "fade-in-up": "fade-in-up 0.2s ease-out forwards",
        "shimmer": "shimmer 1.5s infinite linear"
      },
      "borderRadius": {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
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
