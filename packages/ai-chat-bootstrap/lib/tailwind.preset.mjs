// Tailwind preset for ai-chat-bootstrap.
// Consumers: import preset from 'ai-chat-bootstrap/tailwind.preset'
// and include in `presets: [preset]`.

const withOpacity = (variable) => {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `var(${variable})`;
    }

    const parsed = Number.parseFloat(opacityValue);
    if (Number.isNaN(parsed)) {
      return `var(${variable})`;
    }

    const percentage = Math.max(0, Math.min(100, Math.round(parsed * 100)));
    return `color-mix(in oklab, var(${variable}) ${percentage}%, transparent)`;
  };
};

/** @type {import('tailwindcss').Config} */
const preset = {
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--acb-font-sans)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "\"Segoe UI\"",
          "sans-serif",
        ],
        serif: [
          "var(--acb-font-serif)",
          "ui-serif",
          "Georgia",
          "Cambria",
          "\"Times New Roman\"",
          "serif",
        ],
        mono: [
          "var(--acb-font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "\"Liberation Mono\"",
          "\"Courier New\"",
          "monospace",
        ],
      },
      colors: {
        background: withOpacity("--background"),
        foreground: withOpacity("--foreground"),
        card: {
          DEFAULT: withOpacity("--card"),
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: withOpacity("--popover"),
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: withOpacity("--primary"),
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: withOpacity("--secondary"),
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: withOpacity("--muted"),
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: withOpacity("--accent"),
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: withOpacity("--destructive"),
          foreground: "var(--destructive-foreground)",
        },
        border: withOpacity("--border"),
        input: withOpacity("--input"),
        ring: withOpacity("--ring"),
        chart: {
          1: withOpacity("--chart-1"),
          2: withOpacity("--chart-2"),
          3: withOpacity("--chart-3"),
          4: withOpacity("--chart-4"),
          5: withOpacity("--chart-5"),
        },
        sidebar: {
          DEFAULT: withOpacity("--sidebar"),
          foreground: "var(--sidebar-foreground)",
          primary: withOpacity("--sidebar-primary"),
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: withOpacity("--sidebar-accent"),
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: withOpacity("--sidebar-border"),
          ring: withOpacity("--sidebar-ring"),
        },
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default preset;
