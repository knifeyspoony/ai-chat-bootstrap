import { cva, type VariantProps } from "class-variance-authority";

export const chatContainerVariants = cva(
  "relative flex flex-col w-full h-full isolate rounded-[var(--acb-chat-radius)] bg-[var(--acb-chat-bg)] border border-[var(--acb-chat-border)] shadow-sm",
  {
    variants: {
      layout: {
        bordered: "",
        soft: "border-transparent shadow-none bg-transparent dark:bg-transparent",
        unstyled:
          "border-0 bg-transparent shadow-none data-[acb-unstyled=true]:[&_>_*]:!p-0",
      },
      density: {
        compact: "[--acb-chat-padding:0.5rem] [--acb-message-gap:0.25rem]",
        normal: "",
        relaxed: "[--acb-chat-padding:1.25rem] [--acb-message-gap:1rem]",
      },
      radius: {
        none: "[--acb-chat-radius:0px] rounded-none",
        sm: "[--acb-chat-radius:0.25rem]",
        md: "[--acb-chat-radius:0.5rem]",
        lg: "[--acb-chat-radius:0.75rem]",
        xl: "[--acb-chat-radius:1rem]",
      },
      scrollbar: {
        subtle: "",
        contrast:
          "[--acb-scrollbar-track:theme(colors.background)] [--acb-scrollbar-thumb:theme(colors.foreground)/40%]",
        hidden:
          "[&_*::-webkit-scrollbar]:hidden [scrollbar-width:none] [--acb-scrollbar-size:0px]",
      },
    },
    defaultVariants: {
      layout: "bordered",
      density: "normal",
      radius: "md",
      scrollbar: "subtle",
    },
  }
);

export type ChatContainerVariantProps = VariantProps<
  typeof chatContainerVariants
>;
