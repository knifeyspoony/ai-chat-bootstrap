import { cva, type VariantProps } from "class-variance-authority";

export const toolVariants = cva(
  "not-prose w-full rounded-md border bg-[var(--acb-tool-bg)] border-[var(--acb-tool-border)] rounded-[var(--acb-tool-radius)]",
  {
    variants: {
      elevation: {
        none: "",
        sm: "shadow-sm",
        md: "shadow",
        lg: "shadow-lg",
      },
      state: {
        idle: "",
        running: "animate-pulse",
        error:
          "[&_[data-acb-part=tool-output]]:ring-1 [&_[data-acb-part=tool-output]]:ring-destructive",
      },
      chrome: {
        full: "",
        minimal:
          "[&_[data-acb-part=tool-header]]:hidden [&_[data-acb-part=tool-input]]:pt-2",
      },
    },
    defaultVariants: {
      elevation: "sm",
      chrome: "full",
    },
  }
);

export type ToolVariantProps = VariantProps<typeof toolVariants>;
