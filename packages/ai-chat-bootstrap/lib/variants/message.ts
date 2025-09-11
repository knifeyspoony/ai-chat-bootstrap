import { cva, type VariantProps } from "class-variance-authority";

// Base message wrapper (outer)
export const messageVariants = cva(
  "group flex w-full items-end gap-2 [&>div]:max-w-[80%] py-4",
  {
    variants: {
      role: {
        user: "justify-end flex-row-reverse data-[role=user]:[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-user-bg)] data-[role=user]:[&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-user-fg)]",
        assistant:
          "justify-start data-[role=assistant]:[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-assistant-bg)] data-[role=assistant]:[&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-assistant-fg)]",
        system:
          "justify-center data-[role=system]:[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-system-bg)] data-[role=system]:[&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-system-fg)]",
      },
      density: {
        compact: "py-2",
        normal: "py-4",
        comfy: "py-6",
      },
      avatar: {
        show: "",
        hidden: "[&_[data-acb-part=message-avatar]]:hidden",
      },
      radius: {
        default: "",
        pill: "[&_[data-acb-part=message-content]]:rounded-full",
        md: "[&_[data-acb-part=message-content]]:rounded-md",
      },
    },
    defaultVariants: {
      density: "normal",
      avatar: "show",
      radius: "default",
    },
  }
);

export type MessageVariantProps = VariantProps<typeof messageVariants>;
