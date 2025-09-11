import { cva, type VariantProps } from "class-variance-authority";

export const codeBlockVariants = cva(
  "relative not-prose w-full overflow-hidden rounded-[var(--acb-code-radius)] bg-[var(--acb-code-bg)] border border-[var(--acb-code-border)]",
  {
    variants: {
      lines: {
        show: "",
        hide: "[&_[data-acb-part=code-line-numbers]]:hidden",
      },
      theme: {
        auto: "",
        light: "[data-acb-part=code][data-theme=dark]:hidden",
        dark: "[data-acb-part=code]:not([data-theme=dark]):hidden",
      },
      radius: {
        none: "[--acb-code-radius:0px] rounded-none",
        sm: "[--acb-code-radius:0.25rem]",
        md: "[--acb-code-radius:0.5rem]",
        lg: "[--acb-code-radius:0.75rem]",
        xl: "[--acb-code-radius:1rem]",
      },
    },
    defaultVariants: {
      lines: "show",
      theme: "auto",
      radius: "md",
    },
  }
);

export type CodeBlockVariantProps = VariantProps<typeof codeBlockVariants>;
