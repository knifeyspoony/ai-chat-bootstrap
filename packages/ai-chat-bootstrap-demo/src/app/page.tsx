"use client";

import Link from "next/link";
import React, { useMemo } from "react";
// UI Components from local shadcn/ui setup
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// AI Components from the library
import type { AssistantAction } from "ai-chat-bootstrap";
import { ChatPopout } from "ai-chat-bootstrap";

// Custom hook with all AI logic
import { ThemeToggle } from "@/components/theme-toggle";
import { useEphemeralChatThreads } from "@/hooks/use-ephemeral-chat-threads";
import {
  ArrowRight,
  BookOpen,
  Compass,
  EyeIcon,
  Focus,
  GitBranch,
  Layers,
  MessageSquare,
  Network,
  Server,
  Sparkles,
  Zap,
} from "lucide-react";

const DEMO_MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-5", label: "GPT-5" },
];

const DEMO_PAGES: Array<{
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    href: "/core",
    title: "Core Features",
    description:
      "See focus items, AI context, and suggestions working together.",
    icon: Focus,
  },
  {
    href: "/basic",
    title: "Starter Chat",
    description: "See the drop-in component with a minimal API route.",
    icon: MessageSquare,
  },
  {
    href: "/vanilla",
    title: "Vanilla Session",
    description: "Single in-memory chat without threads or compression.",
    icon: Compass,
  },
  {
    href: "/transport",
    title: "Custom Transport Hook",
    description: "Inject custom headers or data into the chat transport layer.",
    icon: Network,
  },
  {
    href: "/threads",
    title: "Threaded Sessions",
    description: "Persist multi-conversation workspaces.",
    icon: GitBranch,
  },
  {
    href: "/threads/server",
    title: "Server Persistence",
    description: "Demo adapter backed by a server-side data store.",
    icon: Server,
  },
  {
    href: "/compression",
    title: "Compression",
    description: "Explore auto-compression techniques for chat messages.",
    icon: Layers,
  },
  {
    href: "/mcp",
    title: "MCP Integrations",
    description: "Call remote toolchains using the Model Context Protocol.",
    icon: Server,
  },
];

const FEATURE_CALLOUTS: Array<{
  title: string;
  description: string;
  meta: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    title: "Focus-aware context",
    description:
      "Share structured app state automatically as users interact with your UI.",
    meta: "Toggle any widget to stream fresh context into the assistant.",
    icon: Focus,
  },
  {
    title: "Frontend tools & commands",
    description:
      "Expose safe, typed actions that the assistant can execute instantly.",
    meta: "Register tools with one hook and return rich results.",
    icon: Zap,
  },
  {
    title: "Drop-in chat surfaces",
    description:
      "Use the headless primitives or the styled popout to ship chat fast.",
    meta: "Blend with your design system via CSS or the Tailwind plugin.",
    icon: Sparkles,
  },
];

export default function Home() {
  // Demo state
  useEphemeralChatThreads();
  const chatMode = "overlay" as const;
  const systemPrompt =
    "You are the AI Chat Bootstrap guide. Keep answers friendly, concise, and point people toward the right demo or documentation link when helpful.";

  // Create sample messages to demonstrate all message types
  const sampleMessages = useMemo(
    () => [
      // User message with text
      {
        id: "msg-1",
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "What is AI Chat Bootstrap and why would I use it?",
          },
        ],
      },
      // Assistant response with text
      {
        id: "msg-2",
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: "Great to have you here!\n\nAI Chat Bootstrap helps teams ship production-ready assistants fast.\n\n**What ships with the library**\n- Drop-in chat surfaces powered by the Vercel AI SDK\n- Hooks for focus-aware context and typed frontend tools\n- Styling via CSS tokens or a Tailwind preset + plugin\n\nUse the navigation above to explore focused demos, or keep chatting if you have specific questions.",
          },
        ],
      },
      // User asking about theming
      {
        id: "msg-3",
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "Can I match the components to my own design system?",
          },
        ],
      },
      {
        id: "msg-4",
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: "Absolutely. Choose whichever styling path fits your stack:\n\n1. **CSS bundles** – import `tokens.css` and `ai-chat.css` for the quickest drop-in.\n2. **Tailwind preset + plugin** – compose the primitives into your design system while keeping utility classes consistent.\n\nBoth approaches expose CSS variables so you can override colors, typography, and spacing without forking the build.",
          },
        ],
      },
      // User asking about deeper resources
      {
        id: "msg-5",
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "Where should I look if I want a deeper walkthrough or more advanced demos?",
          },
        ],
      },
      {
        id: "msg-6",
        role: "assistant" as const,
        parts: [
          {
            type: "source-url" as const,
            sourceId: "doc-1",
            url: "https://github.com/knifeyspoony/ai-chat-bootstrap",
            title: "AI Chat Bootstrap Repository",
          },
          {
            type: "source-document" as const,
            sourceId: "doc-2",
            mediaType: "text/markdown",
            title: "README.md",
            filename: "README.md",
          },
          {
            type: "file" as const,
            mediaType: "application/json",
            filename: "package.json",
            url: "data:application/json;base64,ewogICJuYW1lIjogImFpLXNkay1jaGF0IiwKICAidmVyc2lvbiI6ICIwLjEuMCIsCiAgImRlc2NyaXB0aW9uIjogIlJlYWN0IGNvbXBvbmVudCBsaWJyYXJ5IGZvciBBSSBjaGF0IGludGVyZmFjZXMiCn0=",
          },
          {
            type: "text" as const,
            text: "Start with the docs and repo linked above for installation and API details. For a guided walkthrough of focus items, shared context, and suggestions, open the **Core Features** demo from the navigation. Each of the other demos showcases a specific integration pattern—transport customization, threaded history, compression, and MCP toolchains—so you can model the pieces you need.",
          },
        ],
      },
    ],
    []
  );

  // System prompt options
  const handleOpenDocs = React.useCallback(() => {
    window.open(
      "https://ai-sdk.dev/elements/components/actions",
      "_blank",
      "noopener,noreferrer"
    );
  }, []);

  // Chat configuration for the new simplified API

  const DemoNavigator = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Compass className="h-4 w-4" />
          Explore demos
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Jump to a scenario</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DEMO_PAGES.map((page) => (
          <DropdownMenuItem key={page.href} asChild>
            <Link href={page.href} className="flex items-start gap-3 py-1.5">
              <page.icon className="mt-1 h-4 w-4 text-primary" />
              <span className="flex flex-col">
                <span className="font-medium text-foreground">
                  {page.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {page.description}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const pageContent = (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/90 supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold">AI Chat Bootstrap Demo</h1>
              <p className="text-xs text-muted-foreground">
                A state-aware assistant playground
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DemoNavigator />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl space-y-16 px-4 py-12">
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background px-8 py-12 shadow-sm">
          <div
            className="absolute inset-y-0 right-0 hidden w-1/3 translate-x-10 rounded-full bg-primary/20 blur-3xl sm:block"
            aria-hidden="true"
          />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-6">
              <Badge className="w-fit border border-primary/30 bg-primary/10 text-primary">
                Demo hub
              </Badge>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Build state-aware AI chat surfaces faster
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Wire the assistant, register frontend tools, and stream context
                without bespoke plumbing. Everything on this page ships in the{" "}
                <span className="font-mono text-sm text-primary">
                  ai-chat-bootstrap
                </span>{" "}
                package.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2" onClick={handleOpenDocs}>
                  <BookOpen className="h-5 w-5" />
                  Read the docs
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" asChild className="gap-2">
                  <Link href="/core">
                    <MessageSquare className="h-5 w-5" />
                    View core demo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">What&apos;s in the box</h3>
            <p className="text-muted-foreground">
              Ship a production-ready assistant with three foundational building
              blocks.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {FEATURE_CALLOUTS.map((feature) => (
              <Card key={feature.title} className="border bg-card/70 shadow-sm">
                <CardHeader className="flex items-start gap-3">
                  <span className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.meta}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-2xl font-semibold">
                Explore focused scenarios
              </h3>
              <p className="text-muted-foreground">
                Jump to dedicated demos that stress-test specific integrations.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={handleOpenDocs}
            >
              <BookOpen className="h-4 w-4" />
              Library reference
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DEMO_PAGES.map((demo) => (
              <Link
                key={demo.href}
                href={demo.href}
                className="group block h-full"
              >
                <Card className="h-full border-dashed transition group-hover:border-primary group-hover:shadow-md">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <demo.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{demo.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground transition group-hover:text-foreground">
                      {demo.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );

  const customAssistantActions: AssistantAction[] = React.useMemo(
    () => [
      {
        id: "docs",
        icon: BookOpen,
        tooltip: "Open documentation",
        label: "Docs",
        onlyOnMostRecent: true,
        onClick: () => handleOpenDocs(),
      },
      {
        id: "view-debug",
        icon: EyeIcon,
        tooltip: "View message debug info",
        label: "Debug",
        onClick: (message) => {
          console.log("Message debug info:", message);
          if (
            typeof window !== "undefined" &&
            typeof window.alert === "function"
          ) {
            window.alert(
              `Message ID: ${message.id}\nParts: ${message.parts?.length || 0}`
            );
          }
        },
        visible: (message) => {
          // Only show debug for messages with multiple parts or reasoning
          return (
            message.parts?.some((part) => part.type === "reasoning") ||
            (message.parts?.length || 0) > 1
          );
        },
      },
    ],
    [handleOpenDocs]
  );

  const assistantActions = React.useMemo(
    () => ({
      copy: true,
      regenerate: true,
      debug: true,
      custom: customAssistantActions,
    }),
    [customAssistantActions]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        {pageContent}
      </div>
      {/* Chat Interface */}
      <ChatPopout
        transport={{ api: "/api/chat" }}
        messages={{ systemPrompt, initial: sampleMessages }}
        features={{
          chainOfThought: true,
          branching: true,
        }}
        mcp={{
          enabled: true,
          api: "/api/mcp-discovery",
        }}
        models={{ available: DEMO_MODELS, initial: DEMO_MODELS[0].id }}
        header={{
          title: "AI Assistant",
          subtitle: "Overview demo | inline layout",
        }}
        ui={{
          placeholder:
            "Ask about install steps, styling, or which demo covers a feature.",
        }}
        popout={{
          position: "right",
          mode: chatMode,
          width: { default: 450, min: 400, max: 600 },
        }}
        suggestions={{
          enabled: true,
          count: 4,
          prompt:
            "Recommend next steps such as reading documentation, opening another demo, or trying an integration idea with the library.",
        }}
        commands={{
          enabled: true,
        }}
        assistantActions={assistantActions}
      />
    </div>
  );
}
