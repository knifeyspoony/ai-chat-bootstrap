"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AssistantAction } from "ai-chat-bootstrap";
import { ChatPopout } from "ai-chat-bootstrap";
import { ThemeToggle } from "@/components/theme-toggle";
import { useDemoAI } from "@/hooks/use-demo-ai";
import { useEphemeralChatThreads } from "@/hooks/use-ephemeral-chat-threads";
import {
  ArrowLeft,
  Braces,
  CheckCircle2,
  Circle,
  Focus,
  Lightbulb,
  MinusIcon,
  PlusIcon,
  Sparkles,
} from "lucide-react";

const DEMO_MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-5", label: "GPT-5" },
];

const CORE_FEATURES: Array<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    title: "Focus items",
    description:
      "Click a tile to stream structured context into the chat. Focus priority is visible to the assistant immediately.",
    icon: Focus,
  },
  {
    title: "Shared AI context",
    description:
      "Register state with `useAIContext` and validate the payload in the inspector before handing it to your backend.",
    icon: Braces,
  },
  {
    title: "Adaptive suggestions",
    description:
      "Suggestions refresh whenever focus or context changes, helping users discover relevant actions.",
    icon: Lightbulb,
  },
];

const PERSONALITIES: Array<{
  id: "default" | "helpful" | "technical" | "creative";
  label: string;
}> = [
  { id: "default", label: "Default" },
  { id: "helpful", label: "Helpful" },
  { id: "technical", label: "Technical" },
  { id: "creative", label: "Creative" },
];

const SuggestionTips = [
  "Try toggling focus on the tiles to see suggestions re-order.",
  "Slash commands mirror the same tool registry available to the assistant.",
  "The inspector below shows precisely what is shared with the AI.",
];

type FocusTileProps = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onToggle: (id: string) => void;
  getFocus: (id: string) => unknown;
  children: React.ReactNode;
};

function FocusTile({
  id,
  title,
  description,
  icon: Icon,
  onToggle,
  getFocus,
  children,
}: FocusTileProps) {
  const isFocused = !!getFocus(id);

  return (
    <Card
      onClick={() => onToggle(id)}
      className={cn(
        "group h-full cursor-pointer border transition-all duration-300",
        isFocused
          ? "border-primary shadow-lg ring-2 ring-primary/40"
          : "hover:border-primary/40"
      )}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Icon className="h-5 w-5 text-primary" />
            <span>{title}</span>
          </div>
          {isFocused ? (
            <Badge variant="outline" className="gap-1 text-xs text-primary">
              <CheckCircle2 className="h-3 w-3" />
              Focused
            </Badge>
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground/70" />
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function CoreDemo() {
  useEphemeralChatThreads();

  const [counter, setCounter] = useState(2);
  const [calculation, setCalculation] = useState<string | null>(null);
  const [selectedSystemPrompt, setSelectedSystemPrompt] =
    useState<"default" | "helpful" | "technical" | "creative">("helpful");
  const [chatMode, setChatMode] = useState<"overlay" | "inline">("inline");

  const {
    focusedIds,
    toolsCount,
    handleFocusToggle,
    getFocus,
    clearAllFocus,
    mcpStatus,
  } = useDemoAI({
    counter,
    setCounter,
    calculation,
    setCalculation,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    setChatMode,
  });

  const sampleMessages = useMemo(
    () => [
      {
        id: "core-msg-1",
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "What information do you know about this workspace right now?",
          },
        ],
      },
      {
        id: "core-msg-2",
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: "I'm reading focus signals from the widgets on the left. Toggle a tile to promote its state and I'll summarise what changed.",
          },
        ],
      },
      {
        id: "core-msg-3",
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: "Try focusing the user profile and database tiles together - I'll show how multiple entities appear in one response.",
          },
        ],
      },
    ],
    []
  );

  const handleReset = () => {
    setCounter(2);
    setCalculation(null);
    setSelectedSystemPrompt("default");
    clearAllFocus();
  };

  const assistantActions: AssistantAction[] = [
    {
      id: "reset",
      label: "Reset demo state",
      icon: Sparkles,
      tooltip: "Clear focus and reset widgets",
      onClick: () => handleReset(),
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <ScrollArea className="flex-1">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to overview
              </Link>
              <Separator orientation="vertical" className="h-5" />
              <Badge variant="secondary" className="font-mono text-xs">
                Core playground
              </Badge>
            </div>
            <ThemeToggle />
          </header>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="space-y-4">
                <Badge className="w-fit border border-primary/30 bg-primary/10 text-primary">
                  Guided demo
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  See the core AI plumbing in one view
                </h1>
                <p className="text-lg text-muted-foreground">
                  This sandbox mirrors the opinionated integration path: focus
                  tiles stream state, context hooks share snapshots, and the
                  assistant&apos;s suggestions adapt in real time.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {CORE_FEATURES.map((feature) => (
                    <Badge
                      key={feature.title}
                      variant="outline"
                      className="gap-2 rounded-full border-dashed px-4 py-2"
                    >
                      <feature.icon className="h-4 w-4 text-primary" />
                      {feature.title}
                    </Badge>
                  ))}
                </div>
              </div>

              <Card className="border-dashed bg-card/70">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Focus-driven context stream
                  </CardTitle>
                  <CardDescription>
                    Click a tile to promote its state. Focused tiles are sent to
                    the assistant with structured metadata.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FocusTile
                    id="counter-widget"
                    title="Support counter"
                    description="Simulate a live number by incrementing or decrementing."
                    icon={Sparkles}
                    onToggle={handleFocusToggle}
                    getFocus={getFocus}
                  >
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Value
                        </span>
                        <p className="text-3xl font-semibold">{counter}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCounter((value) => value - 1);
                          }}
                        >
                          <MinusIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCounter((value) => value + 1);
                          }}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </FocusTile>
                  <FocusTile
                    id="settings-widget"
                    title="Assistant personality"
                    description="Pick a tone and share it with the assistant as structured context."
                    icon={Sparkles}
                    onToggle={handleFocusToggle}
                    getFocus={getFocus}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {PERSONALITIES.map((option) => (
                          <Button
                            key={option.id}
                            size="sm"
                            variant={
                              selectedSystemPrompt === option.id
                                ? "default"
                                : "outline"
                            }
                            className="capitalize"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedSystemPrompt(option.id);
                            }}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Current mode:{" "}
                        <span className="font-medium capitalize text-foreground">
                          {selectedSystemPrompt}
                        </span>
                      </p>
                    </div>
                  </FocusTile>
                </CardContent>
              </Card>

              <Card className="border-dashed bg-card/70">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Context & focus inspector
                  </CardTitle>
                  <CardDescription>
                    Use this as a sanity check before you ship data to your API
                    route.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-background/60 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Focused IDs</span>
                      <Badge variant="secondary">{focusedIds.length}</Badge>
                    </div>
                    <Separator className="my-3" />
                    <pre className="text-xs text-muted-foreground">
                      {focusedIds.length
                        ? JSON.stringify(focusedIds, null, 2)
                        : "[]"}
                    </pre>
                  </div>
                  <div className="rounded-xl border bg-background/60 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Live context</span>
                      <Badge variant="secondary">useAIContext</Badge>
                    </div>
                    <Separator className="my-3" />
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
{`counter: ${counter}
calculation: ${calculation ?? "null"}
systemPrompt: ${selectedSystemPrompt}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed bg-card/70">
                <CardHeader>
                  <CardTitle className="text-lg">Suggestion system</CardTitle>
                  <CardDescription>
                    Suggestions adapt every time focus changes. Use them to
                    nudge users toward the next action.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {SuggestionTips.map((tip) => (
                    <div key={tip} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card className="border bg-card/70">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold">
                  Demo cheat sheet
                </CardTitle>
                <CardDescription>
                  Quick facts about the current session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Focused contexts</span>
                  <Badge variant="outline">{focusedIds.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Frontend tools</span>
                  <Badge variant="outline">{toolsCount}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>MCP toolchains</span>
                  <Badge variant="outline">
                    {mcpStatus.isLoading ? "loading" : mcpStatus.tools.length}
                  </Badge>
                </div>
                {mcpStatus.error && (
                  <p className="text-xs text-destructive">
                    MCP tools unavailable: {mcpStatus.error}
                  </p>
                )}
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Demo actions
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleReset}
                  >
                    <Sparkles className="h-4 w-4" />
                    Reset state
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2" asChild>
                    <Link href="/">
                      <ArrowLeft className="h-4 w-4" />
                      Back to overview
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </ScrollArea>

      <ChatPopout
        transport={{ api: "/api/chat" }}
        messages={{
          systemPrompt:
            {
              default: undefined,
              helpful:
                "You are a friendly AI assistant helping highlight core features of the AI Chat Bootstrap demo.",
              technical:
                "You are a technical assistant explaining how focus items and shared context interact.",
              creative:
                "You are an imaginative assistant spotlighting creative ways to wire the core features.",
            }[selectedSystemPrompt],
          initial: sampleMessages,
        }}
        features={{ chainOfThought: true }}
        mcp={{ enabled: true, api: "/api/mcp" }}
        models={{ available: DEMO_MODELS, initial: DEMO_MODELS[0].id }}
        header={{
          title: "Core Assistant",
          subtitle: `${selectedSystemPrompt} mode | ${focusedIds.length} focused`,
        }}
        popout={{
          position: "right",
          mode: chatMode,
          width: { default: 420, min: 360, max: 520 },
        }}
        suggestions={{
          enabled: true,
          count: 3,
          prompt:
            "Propose actions that help teams explore focus, shared context, and suggestions in the core demo.",
        }}
        assistantActions={{
          copy: true,
          regenerate: true,
          custom: assistantActions,
        }}
        commands={{ enabled: true }}
      />
    </div>
  );
}
