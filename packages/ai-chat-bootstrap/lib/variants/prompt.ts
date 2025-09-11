import { cva, type VariantProps } from "class-variance-authority";

export const promptVariants = cva(
  "group relative flex w-full flex-col gap-2 rounded-[var(--acb-prompt-radius)] bg-[var(--acb-prompt-bg)] border border-[var(--acb-prompt-border)] p-[var(--acb-prompt-padding-y)_var(--acb-prompt-padding-x)]",
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
      state: {
        default: "",
        disabled: "opacity-50 pointer-events-none",
        error: "ring-1 ring-destructive",
      },
      toolbar: {
        inside:
          "[&_[data-acb-part=prompt-toolbar]]:absolute [&_[data-acb-part=prompt-toolbar]]:-top-8",
        below: "",
        none: "[&_[data-acb-part=prompt-toolbar]]:hidden",
      },
      density: {
        compact:
          "[--acb-prompt-padding-y:0.25rem] [--acb-prompt-padding-x:0.5rem]",
        normal: "",
        relaxed:
          "[--acb-prompt-padding-y:0.9rem] [--acb-prompt-padding-x:1rem]",
      },
    },
    defaultVariants: {
      size: "md",
      state: "default",
      toolbar: "below",
      density: "normal",
    },
  }
);

export type PromptVariantProps = VariantProps<typeof promptVariants>;
