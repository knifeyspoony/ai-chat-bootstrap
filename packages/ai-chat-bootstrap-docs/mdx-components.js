import { useMDXComponents as getThemeComponents } from "nextra-theme-docs"; // nextra-theme-blog or your custom theme
import { LiveCodeExample } from "./src/components/LiveCodeExample";
import { BasicChatExample } from "./src/components/BasicChatExample";

// Get the default MDX components
const themeComponents = getThemeComponents();

// Merge components
export function useMDXComponents(components) {
  return {
    ...themeComponents,
    LiveCodeExample,
    BasicChatExample,
    ...components,
  };
}
