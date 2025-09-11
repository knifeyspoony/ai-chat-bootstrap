import { cva, type VariantProps } from "class-variance-authority";

// Variants for the ChatHeader root container. These only style the wrapper;
// inner element visibility (subtitle, badge, actions) is driven by props.
export const chatHeaderVariants = cva(
  [
    "flex items-center justify-between",
    "bg-[var(--acb-chat-header-bg)] text-[var(--acb-chat-header-fg)] border-[var(--acb-chat-header-border)]",
    "data-[acb-part=header]:&", // future-proof scoping if composed
  ].join(" "),
  {
    variants: {
      chrome: {
        default: "px-4 py-3 border-b shadow-sm backdrop-blur-sm rounded-t-md",
        minimal: "px-3 py-2 border-b rounded-t-md",
        clean: "px-3 py-2 border-none shadow-none backdrop-blur-0",
      },
      shadow: {
        none: "shadow-none",
        sm: "shadow-sm",
        md: "shadow",
      },
      blur: {
        none: "backdrop-blur-0",
        sm: "backdrop-blur-sm",
        md: "backdrop-blur",
      },
      padding: {
        sm: "px-2 py-1.5",
        md: "px-4 py-3",
      },
      radius: {
        none: "rounded-none",
        md: "rounded-t-md",
        lg: "rounded-t-lg",
      },
      align: {
        between: "justify-between",
        center: "justify-center gap-4",
      },
      border: {
        none: "border-none",
        solid: "border-b",
      },
    },
    compoundVariants: [
      {
        chrome: "minimal",
        shadow: "none",
        blur: "none",
        class: "shadow-none backdrop-blur-0",
      },
      {
        chrome: "clean",
        border: "none",
        class: "border-none",
      },
    ],
    defaultVariants: {
      chrome: "default",
      shadow: "sm",
      blur: "sm",
      padding: "md",
      radius: "md",
      align: "between",
      border: "solid",
    },
  }
);

export type ChatHeaderVariantProps = VariantProps<typeof chatHeaderVariants>;
