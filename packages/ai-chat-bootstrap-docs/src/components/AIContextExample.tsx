"use client";
import {
  ChatContainer,
  useAIContext,
  useAIContextStore,
  type UIMessage,
} from "ai-chat-bootstrap";
import React, { useMemo, useState } from "react";

// Domain types for this example (kept local to docs example)
interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: "user" | "admin" | "moderator";
  plan: "free" | "pro" | "enterprise";
  notifications: boolean;
}

interface AppSettings {
  theme: "light" | "dark" | "auto";
  language: "en" | "es" | "fr" | "de";
  maxMessages: number;
  autoSave: boolean;
}

// User Profile Widget Component
function UserProfileWidget({
  userProfile,
  setUserProfile,
}: {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}) {
  const handleInputChange = (field: string, value: string | boolean) => {
    setUserProfile((prev) => ({
      ...prev,
      [field]: field === "notifications" ? value : value,
    }));
  };

  return (
    <div className="p-4 bg-card rounded-lg border space-y-3">
      <h3 className="text-lg font-semibold">User Profile</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Name</label>
          <input
            type="text"
            value={userProfile.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            placeholder="Enter name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Role</label>
          <select
            value={userProfile.role}
            onChange={(e) => handleInputChange("role", e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={userProfile.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            placeholder="user@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Plan</label>
          <select
            value={userProfile.plan}
            onChange={(e) => handleInputChange("plan", e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="notifications"
          checked={userProfile.notifications}
          onChange={(e) => handleInputChange("notifications", e.target.checked)}
          className="rounded"
        />
        <label htmlFor="notifications" className="text-sm font-medium">
          Enable notifications
        </label>
      </div>
    </div>
  );
}

// Settings Widget Component
function SettingsWidget({
  settings,
  setSettings,
}: {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}) {
  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="p-4 bg-card rounded-lg border space-y-3">
      <h3 className="text-lg font-semibold">App Settings</h3>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => handleInputChange("theme", e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Language</label>
          <select
            value={settings.language}
            onChange={(e) => handleInputChange("language", e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Max Messages</label>
          <input
            type="number"
            value={settings.maxMessages}
            onChange={(e) =>
              handleInputChange("maxMessages", parseInt(e.target.value))
            }
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            min="10"
            max="1000"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoSave"
            checked={settings.autoSave}
            onChange={(e) => handleInputChange("autoSave", e.target.checked)}
            className="rounded"
          />
          <label htmlFor="autoSave" className="text-sm font-medium">
            Auto-save conversations
          </label>
        </div>
      </div>
    </div>
  );
}

// Context Status Display Component
function ContextStatusDisplay() {
  // Select the raw Map (stable reference changes only when mutated)
  const contextItemsMap = useAIContextStore((state) => state.contextItems);
  // Derive sorted array only when the Map reference changes
  const contextItems = React.useMemo(
    () =>
      Array.from(contextItemsMap.values()).sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
      ),
    [contextItemsMap]
  );

  return (
    <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
      <h4 className="text-sm font-semibold">
        Current AI Context ({contextItems.length} items)
      </h4>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {contextItems.map((item) => (
          <div
            key={item.id}
            className="text-xs bg-background/50 rounded p-2 space-y-1"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{item.label || item.id}</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">
                  {item.scope || "session"}
                </span>
                <span className="text-muted-foreground">
                  P{item.priority || 0}
                </span>
              </div>
            </div>
            {item.description && (
              <div className="text-muted-foreground">{item.description}</div>
            )}
            <div className="font-mono text-xs text-muted-foreground">
              {JSON.stringify(item.data, null, 0).substring(0, 100)}
              {JSON.stringify(item.data).length > 100 && "..."}
            </div>
          </div>
        ))}
        {contextItems.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">
            No context items currently shared
          </div>
        )}
      </div>
    </div>
  );
}

// Demo component with AI context sharing
export function AIContextExample() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Demo state
  const [userProfile, setUserProfile] = useState<UserProfile>({
    userId: "user-123",
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "admin",
    plan: "pro",
    notifications: true,
  });

  const [settings, setSettings] = useState<AppSettings>({
    theme: "dark",
    language: "en",
    maxMessages: 100,
    autoSave: true,
  });

  // Static session info
  const sessionInfo = useMemo(
    () => ({
      sessionId: "session-" + Date.now(),
      startedAt: new Date().toISOString(),
      pageUrl: "/docs/ai-context",
      userAgent: "Demo Browser",
    }),
    []
  );

  // Share context with AI using useAIContext
  // Cast to Record<string, unknown> for hook requirement (values are plain serializable fields)
  useAIContext(
    "user-profile",
    userProfile as unknown as Record<string, unknown>,
    {
      label: "User Profile",
      description:
        "Current authenticated user's profile information and preferences",
      scope: "session",
      priority: 100,
    }
  );

  useAIContext("app-settings", settings as unknown as Record<string, unknown>, {
    label: "App Settings",
    description: "User's application configuration and preferences",
    scope: "session",
    priority: 80,
  });

  useAIContext("session-info", sessionInfo, {
    label: "Session Info",
    description: "Current browser session metadata",
    scope: "session",
    priority: 60,
  });

  // Dynamic conversation context
  useAIContext(
    "widget-state",
    // Memoize shared data so the effect in useAIContext does not run every render
    React.useMemo(
      () => ({
        totalInteractions: messages.length,
        // Update timestamp only when messages length changes (avoid per-render churn)
        lastUpdated: new Date().toISOString(),
        contextItemsCount: useAIContextStore.getState().contextItems.size,
      }),
      [messages.length]
    ),
    {
      label: "Widget State",
      description: "Current state of the demo widgets and interactions",
      scope: "conversation",
      priority: 40,
    }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: input }],
    };
    setMessages((m) => [...m, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);

    // Simulate AI response that understands context
    setTimeout(() => {
      let responseText = `You asked: "${userInput}". `;

      // Respond based on user's context
      if (
        userInput.toLowerCase().includes("name") ||
        userInput.toLowerCase().includes("who")
      ) {
        responseText += `I can see from your profile that you're ${userProfile.name}, ${userProfile.role} with a ${userProfile.plan} plan.`;
      } else if (
        userInput.toLowerCase().includes("settings") ||
        userInput.toLowerCase().includes("theme")
      ) {
        responseText += `Your current settings show you prefer ${
          settings.theme
        } theme and ${settings.language} language, with auto-save ${
          settings.autoSave ? "enabled" : "disabled"
        }.`;
      } else if (userInput.toLowerCase().includes("context")) {
        const contextItems = useAIContextStore.getState().listContext();
        responseText += `I have access to ${
          contextItems.length
        } context items: ${contextItems
          .map((item) => item.label || item.id)
          .join(
            ", "
          )}. This helps me understand your current state and preferences.`;
      } else {
        responseText += `I have access to your profile (${userProfile.name}), app settings (${settings.theme} theme), and session info to provide personalized responses.`;
      }

      const assistantMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text: responseText }],
      };
      setMessages((m) => [...m, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  }

  return (
    <div className="space-y-4">
      {/* Demo Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UserProfileWidget
          userProfile={userProfile}
          setUserProfile={setUserProfile}
        />
        <SettingsWidget settings={settings} setSettings={setSettings} />
      </div>

      {/* Context Status */}
      <ContextStatusDisplay />

      {/* Chat Interface */}
      <div className="h-[400px] w-full">
        <ChatContainer
          header={{
            title: "AI with Shared Context",
            subtitle: "AI knows your profile, settings, and session state",
          }}
          ui={{
            placeholder: "Try: 'What's my name?' or 'What are my settings?'",
          }}
          state={{ messages, isLoading }}
          inputProps={{
            value: input,
            onChange: setInput,
            onSubmit: handleSubmit,
          }}
        />
      </div>
    </div>
  );
}

// Source code for the frontend implementation
export const AI_CONTEXT_SOURCE = `"use client";
import React, { useState, useMemo } from "react";
import { ChatContainer, useAIChat, useAIContext } from "ai-chat-bootstrap";

export function AIContextDemo() {
  const [userProfile, setUserProfile] = useState({
    userId: "user-123",
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "admin",
    plan: "pro",
    notifications: true,
  });

  const [settings, setSettings] = useState({
    theme: "dark",
    language: "en",
    maxMessages: 100,
    autoSave: true,
  });

  // Static session info
  const sessionInfo = useMemo(() => ({
    sessionId: "session-" + Date.now(),
    startedAt: new Date().toISOString(),
    pageUrl: "/chat",
    userAgent: navigator.userAgent,
  }), []);

  // Share context with AI - updates automatically when state changes
  useAIContext(
    "user-profile",
    userProfile,
    {
      label: "User Profile",
      description: "Current authenticated user's profile information",
      scope: "session",
      priority: 100,
    }
  );

  useAIContext(
    "app-settings", 
    settings,
    {
      label: "App Settings",
      description: "User's application configuration and preferences", 
      scope: "session",
      priority: 80,
    }
  );

  useAIContext(
    "session-info",
    sessionInfo, 
    {
      label: "Session Info",
      description: "Current browser session metadata",
      scope: "session", 
      priority: 60,
    }
  );

  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt: "You are a helpful assistant with access to the user's profile, settings, and session information. Use this context to provide personalized responses."
  });

  return (
    <div className="space-y-4">
      {/* User Profile Widget */}
      <div className="p-4 bg-card rounded-lg border">
        <h3 className="text-lg font-semibold mb-3">User Profile</h3>
        <div className="space-y-2">
          <input
            type="text"
            value={userProfile.name}
            onChange={(e) => setUserProfile(prev => ({...prev, name: e.target.value}))}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Name"
          />
          <select
            value={userProfile.role}
            onChange={(e) => setUserProfile(prev => ({...prev, role: e.target.value}))}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>
        </div>
      </div>

      {/* Settings Widget */}
      <div className="p-4 bg-card rounded-lg border">
        <h3 className="text-lg font-semibold mb-3">Settings</h3>
        <div className="space-y-2">
          <select
            value={settings.theme}
            onChange={(e) => setSettings(prev => ({...prev, theme: e.target.value}))}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
          <select
            value={settings.language}
            onChange={(e) => setSettings(prev => ({...prev, language: e.target.value}))}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
      </div>

      {/* Chat Interface */}
      <ChatContainer
        title="AI with Shared Context"
        subtitle="AI knows your profile and settings"
        messages={chat.messages}
        input={chat.input}
        onInputChange={chat.handleInputChange}
        onSubmit={chat.handleSubmit}
        isLoading={chat.isLoading}
        placeholder="Ask about your profile or settings!"
      />
    </div>
  );
}`;

// Source code for the backend API route
export const AI_CONTEXT_API_SOURCE = `import { openai } from "@ai-sdk/openai";
import { streamText, convertToCoreMessages } from "ai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, tools, context, focus } = await req.json();

  // Context is automatically passed from frontend
  // context = [
  //   {
  //     id: "user-profile",
  //     label: "User Profile", 
  //     description: "Current authenticated user's profile information",
  //     scope: "session",
  //     priority: 100,
  //     data: { userId: "user-123", name: "Alice Johnson", role: "admin", ... }
  //   },
  //   {
  //     id: "app-settings",
  //     label: "App Settings",
  //     description: "User's application configuration", 
  //     scope: "session",
  //     priority: 80,
  //     data: { theme: "dark", language: "en", ... }
  //   }
  // ]

  // Build context-aware system prompt
  let contextualPrompt = systemPrompt || "You are a helpful AI assistant.";
  
  if (context && context.length > 0) {
    contextualPrompt += "\\n\\nYou have access to the following context about the user:";
    context.forEach((item) => {
      contextualPrompt += \`\\n- \${item.label || item.id}: \${item.description}\`;
      contextualPrompt += \`\\n  Data: \${JSON.stringify(item.data)}\`;
    });
  }

  const result = streamText({
    model: openai("gpt-4"),
    system: contextualPrompt,
    messages: convertToCoreMessages(messages),
    tools,
    toolChoice: "auto",
  });

  return result.toUIMessageStreamResponse();
}`;
