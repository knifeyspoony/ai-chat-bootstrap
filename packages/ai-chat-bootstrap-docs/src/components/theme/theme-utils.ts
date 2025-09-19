export type ThemeChoice =
  | "light"
  | "dark"
  | "system"
  | "solar-dusk"
  | "solar-dusk-dark";

export type AppliedTheme = "light" | "dark" | "solar-dusk" | "solar-dusk-dark";

export const STORAGE_KEY = "acb-docs-theme";
export const THEME_EVENT = "acb-docs-theme-change";

export const THEME_META: Record<ThemeChoice, { label: string; description: string }> = {
  light: {
    label: "Light",
    description: "Uses shadcn/Tailwind light tokens (default when CSS vars exist).",
  },
  dark: {
    label: "Dark",
    description: "Applies the dark palette using the same shadcn/Tailwind variable names.",
  },
  system: {
    label: "System",
    description: "Follows the OS preference and updates automatically when it changes.",
  },
  "solar-dusk": {
    label: "Solar Light",
    description: "Warm gradients and rounded accents bundled with the demo (light variant).",
  },
  "solar-dusk-dark": {
    label: "Solar Dark",
    description: "Companion dark palette with glowing highlights and custom typography.",
  },
};

export const THEME_ORDER: ThemeChoice[] = [
  "light",
  "dark",
  "system",
  "solar-dusk",
  "solar-dusk-dark",
];

export interface ThemeChangeDetail {
  selected: ThemeChoice;
  applied: AppliedTheme;
}

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return (
    value === "light" ||
    value === "dark" ||
    value === "system" ||
    value === "solar-dusk" ||
    value === "solar-dusk-dark"
  );
}
