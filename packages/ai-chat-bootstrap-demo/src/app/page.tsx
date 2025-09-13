"use client";

import React, { useMemo, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// AI Components from the library
import { ChatPopout } from "ai-chat-bootstrap";

// Custom hook with all AI logic
import { useDemoAI } from "@/hooks/use-demo-ai";
import {
  CalculatorIcon,
  CheckCircle2,
  Circle,
  Database as DatabaseIcon,
  EyeIcon,
  Focus,
  MinusIcon,
  PlusIcon,
  Sparkles,
  User as UserIcon,
  Zap,
} from "lucide-react";

export default function Home() {
  // Demo state
  const [counter, setCounter] = useState(0);
  const [calculation, setCalculation] = useState<string | null>(null);
  const [selectedSystemPrompt, setSelectedSystemPrompt] =
    useState<string>("default");
  const [chatMode, setChatMode] = useState<"overlay" | "inline">("inline");
  // theme: light | dark | system | alt
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "system";
    try {
      return localStorage.getItem("acb-theme") || "system";
    } catch {
      return "system";
    }
  });

  // Theme side effects
  React.useEffect(() => {
    try {
      localStorage.setItem("acb-theme", theme);
    } catch {}
    const body = document.body;
    const rootHtml = document.documentElement;
    // reset classes first
    body.classList.remove("demo-alt");
    rootHtml.classList.remove("dark");

    const applySystem = () => {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (prefersDark) rootHtml.classList.add("dark");
    };

    switch (theme) {
      case "light":
        // nothing (ensures no dark class)
        break;
      case "dark":
        rootHtml.classList.add("dark");
        break;
      case "alt":
        // alt builds on dark palette for contrast
        rootHtml.classList.add("dark");
        body.classList.add("demo-alt");
        break;
      case "system":
      default:
        applySystem();
        break;
    }

    // listen for system changes if on system
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applySystem();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  // AI integration - all AI logic is handled by the custom hook
  const {
    focusedIds,
    toolsCount,
    handleFocusToggle,
    getFocus,
    userProfile,
    dbSettings,
  } = useDemoAI({
    counter,
    setCounter,
    calculation,
    setCalculation,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    setChatMode,
  });

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
            text: "Hello! Can you help me understand what this demo showcases?",
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
            text: "Welcome to the AI SDK Chat Demo! 🎉\n\nThis demo showcases:\n- **Real-time context sharing** - Click widgets to focus them\n- **Tool integration** - AI can interact with the counter, calculator, and other widgets\n- **Dynamic focus management** - The AI knows about focused elements\n- **Multiple message types** - Text, reasoning, files, sources, and tool calls\n\nTry clicking on some widgets below and then ask me about them!",
          },
        ],
      },
      // User message requesting calculation
      {
        id: "msg-3",
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "Can you calculate 25 * 4 for me?",
          },
        ],
      },
      // Assistant response with tool usage
      {
        id: "msg-4",
        role: "assistant" as const,
        parts: [
          {
            type: "tool-calculate" as const,
            toolCallId: "call_demo_1",
            state: "output-available" as const,
            input: {
              operation: "multiply",
              a: 25,
              b: 4,
            },
            output: {
              operation: "multiply",
              a: 25,
              b: 4,
              result: 100,
              message: "25 multiply 4 = 100",
            },
          },
          {
            type: "text" as const,
            text: "I've calculated that for you! 25 × 4 = **100**. You can see the result displayed in the calculator widget above.",
          },
        ],
      },
      // User asking about reasoning
      {
        id: "msg-5",
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "How do you decide which tool to use?",
          },
        ],
      },
      // Assistant with reasoning and text
      {
        id: "msg-6",
        role: "assistant" as const,
        parts: [
          {
            type: "reasoning" as const,
            text: "Let me think about this. The user is asking about my decision-making process for tool selection. I should explain:\n1. I analyze the user's request to identify what action they want\n2. I check what tools are available and their descriptions\n3. I match the request to the most appropriate tool\n4. For calculations, I use the calculate tool\n5. For counter operations, I use increment/decrement tools\n6. For system changes, I use the change_system_prompt tool",
            state: "done" as const,
          },
          {
            type: "text" as const,
            text: 'Great question! My tool selection process involves several steps:\n\n1. **Request Analysis**: I parse your message to understand what you need\n2. **Available Tools**: I check what tools are registered and their capabilities\n3. **Best Match**: I select the tool whose description best matches your request\n4. **Context Awareness**: I consider focused widgets and current app state\n\nFor example:\n- Math questions → `calculate` tool\n- "Increment counter" → `increment_counter` tool\n- "Change AI personality" → `change_system_prompt` tool\n\nThe reasoning you see above shows my thought process for this response!',
          },
        ],
      },
      // User asking about file support
      {
        id: "msg-7",
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "Can you share some documentation about this library?",
          },
        ],
      },
      // Assistant with source and file references
      {
        id: "msg-8",
        role: "assistant" as const,
        parts: [
          {
            type: "source-url" as const,
            sourceId: "doc-1",
            url: "https://ai-sdk.dev/docs/reference",
            title: "AI SDK Documentation",
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
            text: "I've referenced some key documentation sources:\n\n📚 **External Documentation**: The official AI SDK docs provide comprehensive API reference\n📄 **Project README**: Contains setup instructions and usage examples  \n📦 **Package Info**: Shows the library metadata and dependencies\n\nThis demo showcases how the chat interface can display different content types including external URLs, document references, and file attachments. The AI can reference multiple sources in a single response!",
          },
        ],
      },
      // User message with step-based interaction
      {
        id: "msg-9",
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "Walk me through setting up this library step by step",
          },
        ],
      },
      // Assistant with step indicators
      {
        id: "msg-10",
        role: "assistant" as const,
        parts: [
          {
            type: "step-start" as const,
          },
          {
            type: "text" as const,
            text: "## Setting up AI SDK Chat Library\n\nHere's a complete step-by-step guide:\n\n### Step 1: Installation\n```bash\npnpm add ai-sdk-chat @ai-sdk/react ai\n```\n\n### Step 2: Import Styles\n```tsx\nimport 'ai-sdk-chat/lib/styles.css'\n```\n\n### Step 3: Basic Usage\n```tsx\nimport { ChatPopout } from 'ai-sdk-chat'\n\nfunction App() {\n  return (\n    <ChatPopout \n      title=\"AI Assistant\"\n      placeholder=\"Ask me anything...\"\n      api=\"/api/chat\"\n    />\n  )\n}\n```\n\n### Step 4: Add Context & Tools\n```tsx\nimport { useAIContext, useAIFrontendTool } from 'ai-sdk-chat'\n\nfunction MyComponent() {\n  const [counter, setCounter] = useState(0)\n  \n  // Structured context: description + value + priority\n  useAIContext({ description: 'Counter', value: { value: counter }, priority: 50 })\n  \n  useAIFrontendTool({\n    name: 'increment',\n    description: 'Increment counter',\n    execute: async () => {\n      setCounter(c => c + 1)\n      return { newValue: counter + 1 }\n    }\n  })\n  \n  return <div>Counter: {counter}</div>\n}\n```\n\nThat's it! The AI can now interact with your app state and execute tools. Try the examples above to see it in action! 🚀",
          },
        ],
      },
    ],
    []
  );

  // System prompt options
  const systemPrompts = {
    default: undefined,
    helpful:
      "You are a friendly and enthusiastic AI assistant. Be encouraging and positive in your responses while helping users explore this demo.",
    technical:
      "You are a technical AI assistant focused on demonstrating the integration between AI and React applications. Explain technical concepts clearly and suggest advanced usage patterns.",
    creative:
      "You are a creative AI assistant. When users interact with the demo, suggest interesting and creative ways to use the tools and features. Be imaginative and inspiring.",
  };

  // FocusableCard component
  const FocusableCard = ({
    id,
    title,
    description,
    icon: Icon,
    children,
    color = "blue",
    focusRef,
  }: {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    color?: string;
    focusRef?: React.RefObject<HTMLDivElement>;
  }) => {
    const focused = !!getFocus(id);
    const colorClasses = {
      primary: focused
        ? "ring-2 ring-primary shadow-lg bg-primary/10"
        : "hover:bg-primary/5",
      secondary: focused
        ? "ring-2 ring-secondary shadow-lg bg-secondary/50"
        : "hover:bg-secondary/20",
      accent: focused
        ? "ring-2 ring-accent shadow-lg bg-accent/50"
        : "hover:bg-accent/20",
      muted: focused
        ? "ring-2 ring-muted-foreground shadow-lg bg-muted"
        : "hover:bg-muted/50",
    };

    return (
      <Card
        className={`transition-all duration-300 cursor-pointer border-2 ${
          colorClasses[color as keyof typeof colorClasses]
        } ${
          focused
            ? "border-primary"
            : "border-border hover:border-muted-foreground/50"
        }`}
        onClick={() => handleFocusToggle(id)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </div>
            {focused ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent ref={focusRef}>{children}</CardContent>
      </Card>
    );
  };

  const pageContent = (
    <>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-5xl font-bold text-foreground">
            AI SDK Chat Demo
          </h1>
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Experience seamless AI-app integration with real-time context sharing,
          intelligent tool execution, and dynamic focus management.
          <br />
          <span className="font-medium">
            Click elements below to focus them, then chat with AI!
          </span>
        </p>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12 p-6 bg-card rounded-2xl border">
        <div className="flex items-center gap-3">
          <span className="font-medium">AI Personality:</span>
          <Select
            value={selectedSystemPrompt}
            onValueChange={setSelectedSystemPrompt}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="helpful">Helpful</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-medium">Chat Mode:</span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm",
                chatMode === "overlay"
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              Overlay
            </span>
            <Switch
              checked={chatMode === "inline"}
              onCheckedChange={(checked) =>
                setChatMode(checked ? "inline" : "overlay")
              }
            />
            <span
              className={cn(
                "text-sm",
                chatMode === "inline"
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              Inline
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-medium">Theme:</span>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="alt">Alt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Interactive Elements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Counter Widget */}
        <FocusableCard
          id="counter-widget"
          title="Counter"
          description="Interactive number counter"
          icon={CalculatorIcon}
          color="primary"
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {counter}
              </div>
              <Badge variant="secondary" className="text-xs">
                Current Value
              </Badge>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setCounter((c) => c - 1);
                }}
              >
                <MinusIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setCounter((c) => c + 1);
                }}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </FocusableCard>
        {/* Calculator Widget */}
        <FocusableCard
          id="calculator-widget"
          title="Calculator"
          description="Math operations display"
          icon={CalculatorIcon}
          color="secondary"
        >
          <div className="space-y-4">
            <div className="text-center min-h-[80px] flex items-center justify-center">
              {calculation ? (
                <div>
                  <div className="text-2xl font-bold text-primary mb-2">
                    {calculation}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Latest Result
                  </Badge>
                </div>
              ) : (
                <div className="text-muted-foreground text-center">
                  <CalculatorIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ask AI to calculate</p>
                </div>
              )}
            </div>
            {calculation && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setCalculation(null);
                }}
                className="w-full"
              >
                Clear
              </Button>
            )}
          </div>
        </FocusableCard>

        {/* Settings Widget */}
        <FocusableCard
          id="settings-widget"
          title="Settings"
          description="App configuration"
          icon={EyeIcon}
          color="accent"
        >
          <div className="space-y-3">
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">AI Mode:</span>
                <Badge variant="outline" className="ml-2 capitalize">
                  {selectedSystemPrompt}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Focus:</span>
                <Badge variant="outline" className="ml-2">
                  {focusedIds.length} focused
                </Badge>
              </div>
              <div>
                <span className="font-medium">Tools:</span>
                <Badge variant="outline" className="ml-2">
                  {toolsCount} registered
                </Badge>
              </div>
            </div>
          </div>
        </FocusableCard>

        {/* Database Settings */}
        <FocusableCard
          id="db-settings"
          title="Database Settings"
          description="Primary database configuration"
          icon={DatabaseIcon}
          color="muted"
        >
          <div className="space-y-3">
            <div className="text-xs space-y-1 font-mono bg-muted p-3 rounded-lg">
              <div>
                engine:{" "}
                <span className="text-primary">{dbSettings.engine}</span>
              </div>
              <div>
                host: <span className="text-primary">{dbSettings.host}</span>
              </div>
              <div>
                port: <span className="text-primary">{dbSettings.port}</span>
              </div>
              <div>
                database:{" "}
                <span className="text-primary">{dbSettings.database}</span>
              </div>
              <div>
                ssl:{" "}
                <span className="text-primary">{String(dbSettings.ssl)}</span>
              </div>
            </div>
          </div>
        </FocusableCard>

        {/* User Profile */}
        <FocusableCard
          id="user-profile"
          title="User Profile"
          description="Current signed-in user"
          icon={UserIcon}
          color="accent"
        >
          <div className="space-y-3">
            <div className="text-xs space-y-1 font-mono bg-muted p-3 rounded-lg">
              <div>
                name: <span className="text-primary">{userProfile.name}</span>
              </div>
              <div>
                email: <span className="text-primary">{userProfile.email}</span>
              </div>
              <div>
                role: <span className="text-primary">{userProfile.role}</span>
              </div>
              <div>
                plan: <span className="text-primary">{userProfile.plan}</span>
              </div>
            </div>
          </div>
        </FocusableCard>

        {/* Context Panel */}
        <FocusableCard
          id="context-panel"
          title="Live Context"
          description="Real-time app state"
          icon={Focus}
          color="muted"
        >
          <div className="space-y-3">
            <div className="text-xs space-y-1 font-mono bg-muted p-3 rounded-lg">
              <div>
                counter: <span className="text-primary">{counter}</span>
              </div>
              <div>
                calculation:{" "}
                <span className="text-primary">{calculation || "null"}</span>
              </div>
              <div>
                focused:{" "}
                <span className="text-primary">[{focusedIds.join(", ")}]</span>
              </div>
              <div>
                ai_mode:{" "}
                <span className="text-primary">
                  &quot;{selectedSystemPrompt}&quot;
                </span>
              </div>
            </div>
            <Badge variant="outline" className="w-full justify-center text-xs">
              <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
              Live Sync
            </Badge>
          </div>
        </FocusableCard>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "min-h-screen bg-background",
        chatMode === "inline" ? "flex h-screen" : ""
      )}
    >
      {chatMode === "inline" ? (
        <ScrollArea className="flex-1">
          <div className="px-4 py-12">{pageContent}</div>
        </ScrollArea>
      ) : (
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          {pageContent}
        </div>
      )}

      {/* Chat Interface */}
      <ChatPopout
        chatOptions={{
          systemPrompt:
            systemPrompts[selectedSystemPrompt as keyof typeof systemPrompts],
          initialMessages: sampleMessages,
        }}
        header={{
          title: "AI Assistant",
          subtitle: `${selectedSystemPrompt} mode • ${focusedIds.length} focused • ${chatMode}`,
        }}
        ui={{
          placeholder:
            "Try: 'Show user profile', 'Calculate 25 * 4', or type '/' for UI/AI commands...",
        }}
        popout={{
          position: "right",
          mode: chatMode as "overlay" | "inline",
          width: { default: 450, min: 400, max: 600 },
        }}
        suggestions={{
          enabled: true,
          count: 4,
          prompt:
            "Generate contextual suggestions based on the focused widgets, tools available, and current conversation. Suggest specific actions the user can take with the counter, calculator, database settings, user profile, or other interactive elements.",
        }}
        commands={{
          enabled: true,
          onExecute: (command: string, args?: string) => {
            console.log(
              `Executed command: /${command}${args ? ` ${args}` : ""}`
            );
          },
        }}
      />
    </div>
  );
}
