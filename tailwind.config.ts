import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Custom RussianMentor colors
        "student-blue": "var(--student-blue)",
        "tutor-teal": "var(--tutor-teal)",
        "admin-red": "var(--admin-red)",
        "telegram-bg": "var(--telegram-bg)",
        "telegram-text": "var(--telegram-text)",
        "telegram-secondary": "var(--telegram-secondary)",
        "game-purple": "var(--game-purple)",
        "game-pink": "var(--game-pink)",
        "achievement-gold": "var(--achievement-gold)",
        // Seasonal theme colors
        "winter-snow": "var(--winter-snow)",
        "winter-ice": "var(--winter-ice)",
        "winter-frost": "var(--winter-frost)",
        "spring-bloom": "var(--spring-bloom)",
        "spring-grass": "var(--spring-grass)",
        "spring-fresh": "var(--spring-fresh)",
        "summer-sun": "var(--summer-sun)",
        "summer-warmth": "var(--summer-warmth)",
        "summer-glow": "var(--summer-glow)",
        "autumn-leaves": "var(--autumn-leaves)",
        "autumn-harvest": "var(--autumn-harvest)",
        "autumn-warmth": "var(--autumn-warmth)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        float: {
          "0%, 100%": { 
            transform: "translateY(0px) rotate(0deg)" 
          },
          "50%": { 
            transform: "translateY(-10px) rotate(3deg)" 
          },
        },
        glow: {
          from: { 
            boxShadow: "0 0 5px var(--student-blue), 0 0 10px var(--student-blue), 0 0 15px var(--student-blue)" 
          },
          to: { 
            boxShadow: "0 0 10px var(--student-blue), 0 0 20px var(--student-blue), 0 0 30px var(--student-blue)" 
          },
        },
        "pulse-slow": {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: ".8",
          },
        },
        "bounce-gentle": {
          "0%, 100%": {
            transform: "translateY(-25%)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
          },
          "50%": {
            transform: "translateY(0)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 3s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "pulse-slow": "pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-gentle": "bounce-gentle 1s ease-in-out infinite",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      fontSize: {
        "2xs": "0.625rem",
      },
      backdropBlur: {
        xs: "2px",
      },
      screens: {
        "3xl": "1600px",
      },
      aspectRatio: {
        "4/3": "4 / 3",
        "3/2": "3 / 2",
        "2/3": "2 / 3",
        "9/16": "9 / 16",
      },
      gradientColorStops: {
        "student-blue": "var(--student-blue)",
        "tutor-teal": "var(--tutor-teal)",
        "game-purple": "var(--game-purple)",
        "game-pink": "var(--game-pink)",
      },
      boxShadow: {
        "glow-sm": "0 0 5px var(--student-blue)",
        "glow-md": "0 0 10px var(--student-blue)",
        "glow-lg": "0 0 15px var(--student-blue)",
        "card-hover": "0 20px 40px rgba(0, 0, 0, 0.1)",
      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      zIndex: {
        "60": "60",
        "70": "70",
        "80": "80",
        "90": "90",
        "100": "100",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
    // Custom plugin for RussianMentor utilities
    function({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        '.gradient-text': {
          background: 'linear-gradient(135deg, var(--student-blue) 0%, var(--tutor-teal) 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.glass-morphism': {
          background: 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.card-hover': {
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.card-hover:hover': {
          transform: 'translateY(-4px)',
          'box-shadow': '0 20px 40px rgba(0, 0, 0, 0.1)',
        },
        '.line-clamp-2': {
          display: '-webkit-box',
          '-webkit-line-clamp': '2',
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
        },
        '.line-clamp-3': {
          display: '-webkit-box',
          '-webkit-line-clamp': '3',
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
        },
        '.mobile-touch': {
          'touch-action': 'manipulation',
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.mobile-scroll': {
          'overflow-x': 'auto',
          'scrollbar-width': 'none',
          '-ms-overflow-style': 'none',
        },
        '.mobile-scroll::-webkit-scrollbar': {
          display: 'none',
        },
        '.safe-area-inset': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;
