import { useMDXComponents as getThemeComponents } from "nextra-theme-docs"; // nextra-theme-blog or your custom theme
import { LiveCodeExample } from "./src/components/LiveCodeExample";
import { BasicChatExample } from "./src/components/BasicChatExample";
import Api from "./src/components/ApiLink";

// Get the default MDX components
const themeComponents = getThemeComponents();

// Merge components
export function useMDXComponents(components) {
  // Prefer any user-provided code component, falling back to theme's
  const PrevCode =
    (components && components.code) ||
    themeComponents.code ||
    ((p) => <code {...p} />);

  function Code(props) {
    const { className, children } = props || {};
    const isInline = !className; // MDX sets className for fenced blocks
    const text =
      typeof children === "string"
        ? children
        : Array.isArray(children)
        ? children.join("")
        : "";

    if (isInline && typeof text === "string") {
      const trimmed = text.trim();
      // Auto-link hooks that start with useAI*
      if (/^useAI[A-Za-z]+$/.test(trimmed)) {
        return <Api name={trimmed}>{trimmed}</Api>;
      }
    }
    return <PrevCode {...props} />;
  }

  return {
    ...themeComponents,
    // Custom components
    LiveCodeExample,
    BasicChatExample,
    Api,
    // Override code renderer to auto-link inline `useAI*`
    code: Code,
    ...components,
  };
}
