import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#330066",
          50: "#F5F0FA",
          100: "#E9DDF2",
          500: "#330066",
          600: "#4B0082",
          700: "#330066",
          800: "#25004D",
          900: "#1A0033",
        },
        accent: {
          DEFAULT: "#D97706",
          500: "#D97706",
          600: "#B45309",
        },
      },
    },
  },
  plugins: [],
};

export default config;
