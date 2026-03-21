import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                green: {
                    primary: "#4CAF50",
                    dark: "#2e7d32",
                    darker: "#1b5e20",
                    light: "#e8f5e9",
                    lighter: "#c8e6c9",
                },
                gold: {
                    primary: "#c8a84e",
                    light: "#FFF3C1",
                    dark: "#6A4B00",
                },
                selection: "#5AC568",
                background: "#fafcf8",
            },
            animation: {
                glowPulse: "glowPulse 2s ease-in-out infinite",
            },
            keyframes: {
                glowPulse: {
                    "0%, 100%": { opacity: "1", transform: "scale(1)" },
                    "50%": { opacity: "0.8", transform: "scale(1.02)" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
