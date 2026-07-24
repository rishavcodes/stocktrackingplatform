/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // screens: {
      //   xs: "480px",
      //   ss: "620px",
      //   sm: "768px",
      //   md: "1060px",
      //   lg: "1200px",
      //   xl: "1700px",
      // },
      fontFamily: {
        montserrat: ["Montserrat", "Arial", "sans-serif"],
        sans: ["Montserrat", "Arial", "sans-serif"],
        league: ["League Spartan", "sans-serif"],
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
      },
      fontWeight: {
        regular: "400",
        semibold: "600",
        bold: "700",
        extrabold: "800",
      },
      colors: {
        // HSL-based colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        tradebox: {
          background: "hsl(var(--tradebox-background))",
          secondary: "hsl(var(--tradebox-secondary))",
          surface: "hsl(var(--tradebox-surface))",
        },
        gradient: {
          purple: "hsl(var(--gradient-purple))",
          cyan: "hsl(var(--gradient-cyan))",
          pink: "hsl(var(--gradient-pink))",
          blue: "hsl(var(--gradient-blue))",
        },
        brand: {
          primary: "hsl(var(--brand-primary))",
          secondary: "hsl(var(--brand-secondary))",
          accent: "hsl(var(--brand-accent))",
        },
        
        // Solid colors
        whiteShade: "#F0F6FF",
        lightBlue: "#d8f4ff",
        mediumDarkBlue: "#00BFFB",
        darkGreen: "#05543D",
        lightGrey: "#f5f5f5",
        darkGrey: "#565656",
        blueShade: "#28B3D8",
        // orange: "#FF5C00",
        darkBlue: "#252A31",
        greenishBlue: "#356A7A",
        //indigo: "#001C51",
        blackShade: "#121212",
        SPcardUpperBlackShade: "#2C2C2C",
        greenDarkText: "#78ECD6",
        lightGreen: "#ccf3f3",
        lightgray: "#3D3D3D",
        darkgray: "#171717",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, hsl(var(--gradient-purple)), hsl(var(--gradient-cyan)))",
        "gradient-accent": "linear-gradient(135deg, hsl(var(--gradient-pink)), hsl(var(--gradient-purple)))",
        "gradient-blue": "linear-gradient(135deg, hsl(var(--gradient-blue)), hsl(var(--gradient-cyan)))",
        "gradient-mesh": "radial-gradient(circle at 20% 20%, hsl(var(--gradient-purple)) 0%, transparent 50%), radial-gradient(circle at 80% 80%, hsl(var(--gradient-cyan)) 0%, transparent 50%), radial-gradient(circle at 40% 40%, hsl(var(--gradient-pink)) 0%, transparent 50%)",
        heroBg: "url('/images/hero/Financial-Services-featured 1.png')",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(30px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        float: {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-10px)",
          },
        },
        glow: {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(var(--gradient-purple) / 0.3)",
          },
          "50%": {
            boxShadow: "0 0 40px hsl(var(--gradient-purple) / 0.6)",
          },
        },
        "slide-in-right": {
          "0%": {
            transform: "translateX(100%)",
            opacity: "0",
          },
          "100%": {
            transform: "translateX(0)",
            opacity: "1",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
        float: "float 3s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("tailwind-scrollbar"),
  ],
};