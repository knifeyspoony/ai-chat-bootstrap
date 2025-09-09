import type { UIMessage } from "ai";
import { Avatar, AvatarFallback, AvatarImage } from "lib/components/ui/avatar";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full items-end justify-end gap-2 py-4",
      from === "user" ? "is-user" : "is-assistant flex-row-reverse justify-end",
      "[&>div]:max-w-[80%]",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "flex flex-col gap-2 overflow-hidden rounded-lg px-4 py-3 text-foreground text-sm",
      "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground",
      "group-[.is-assistant]:bg-secondary group-[.is-assistant]:text-foreground",
      "is-user:dark",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string | ReactNode;
  name?: string;
};

export const MessageAvatar = ({
  src,
  name,
  className,
  ...props
}: MessageAvatarProps) => (
  <Avatar className={cn("size-8 ring-1 ring-border", className)} {...props}>
    {typeof src === "string" && <AvatarImage alt="" className="mt-0 mb-0" src={src} />}
    <AvatarFallback>
      {typeof src === "string" ? (
        name?.slice(0, 2) || "ME"
      ) : (
        src
      )}
    </AvatarFallback>
  </Avatar>
);
