import { cva, type VariantProps } from "class-variance-authority";

// Variants specifically for the PromptInput root <form> container.
// (promptVariants already covers padding / size hooks; this focuses on chrome/layout toggles.)
export const promptInputVariants = cva(
  [
    "w-full overflow-hidden rounded-[var(--acb-prompt-radius)]",
    "bg-[var(--acb-prompt-bg)] text-[var(--acb-prompt-fg)] border border-[var(--acb-prompt-border)]",
    "divide-y",
  ].join(" "),
  {
    variants: {
      chrome: {
        full: "",
        minimal:
          "shadow-none border-[color-mix(in_oklab,var(--acb-prompt-border)_60%,transparent)] divide-[color-mix(in_oklab,var(--acb-prompt-border)_60%,transparent)]",
        outline: "shadow-none bg-transparent dark:bg-transparent",
        unstyled:
          "border-0 shadow-none bg-transparent dark:bg-transparent divide-y-0 p-0",
      },
      shadow: {
        none: "shadow-none",
        sm: "shadow-sm",
        md: "shadow",
      },
      focusRing: {
        none: "",
        subtle: "focus-within:ring-1 focus-within:ring-primary/30",
        solid: "focus-within:ring-2 focus-within:ring-primary/50",
      },
      density: {
        compact:
          "[--acb-prompt-padding-y:0.25rem] [--acb-prompt-padding-x:0.5rem]",
        normal: "",
        relaxed:
          "[--acb-prompt-padding-y:1rem] [--acb-prompt-padding-x:1.25rem]",
      },
      toolbar: {
        default: "",
        floating:
          "[&_[data-acb-part=prompt-toolbar]]:absolute [&_[data-acb-part=prompt-toolbar]]:-top-9 [&_[data-acb-part=prompt-toolbar]]:right-2",
        hidden: "[&_[data-acb-part=prompt-toolbar]]:hidden",
      },
      textarea: {
        soft: "[&_[data-acb-part=prompt-textarea]]:rounded-md [&_[data-acb-part=prompt-textarea]]:bg-background/40",
        flush: "",
      },
    },
    compoundVariants: [
      {
        chrome: "unstyled",
        focusRing: "solid",
        class: "focus-within:ring-0",
      },
    ],
    defaultVariants: {
      chrome: "full",
      shadow: "sm",
      focusRing: "subtle",
      density: "normal",
      toolbar: "default",
      textarea: "flush",
    },
  }
);

export type PromptInputVariantProps = VariantProps<typeof promptInputVariants>;
