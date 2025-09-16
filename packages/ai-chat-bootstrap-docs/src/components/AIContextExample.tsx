"use client";
import {
  ChatContainer,
  useAIContext,
  useAIContextStore,
  type UIMessage,
} from "ai-chat-bootstrap";
import React, { useMemo, useState } from "react";
import { useMockAIChat } from "./shared/useMockAIChat";

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
              <span className="font-medium">{item.description}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  P{item.priority || 0}
                </span>
              </div>
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

// Mock useAIChat hook for demo purposes
// Demo component with AI context sharing
export function AIContextExample() {
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
  useAIContext({
    description: "User Profile",
    value: userProfile,
    priority: 100,
  });
  useAIContext({ description: "App Settings", value: settings, priority: 80 });
  useAIContext({
    description: "Session Info",
    value: sessionInfo,
    priority: 60,
  });

  // Create custom response generator that uses context
  const contextAwareResponseGenerator = React.useCallback((text: string) => {
    let responseText = `You asked: "${text}". `;

    // Respond based on user's context
    if (
      text.toLowerCase().includes("name") ||
      text.toLowerCase().includes("who")
    ) {
      responseText += `I can see from your profile that you're ${userProfile.name}, ${userProfile.role} with a ${userProfile.plan} plan.`;
    } else if (
      text.toLowerCase().includes("settings") ||
      text.toLowerCase().includes("theme") ||
      text.toLowerCase().includes("preferences")
    ) {
      responseText += `Your current settings show you prefer ${settings.theme} theme, ${settings.language} language, with a max of ${settings.maxMessages} messages and auto-save ${settings.autoSave ? "enabled" : "disabled"}.`;
    } else if (
      text.toLowerCase().includes("context") ||
      text.toLowerCase().includes("what do you know")
    ) {
      const contextItems = useAIContextStore.getState().contextItems;
      responseText += `I currently have access to ${contextItems.size} context items: ${Array.from(
        contextItems.values()
      )
        .map((item) => item.text || item.id)
        .join(
          ", "
        )}. This helps me understand your current state and preferences.`;
    } else {
      responseText += `I have access to your profile (${userProfile.name}), app settings (${settings.theme} theme), and session info to provide personalized responses.`;
    }

    return responseText;
  }, [userProfile, settings]);

  // Create mock chat with context-aware responses
  const mockChat = useMockAIChat({
    responseGenerator: contextAwareResponseGenerator,
    responseDelay: 1000,
  });

  // Dynamic conversation context
  useAIContext({
    description: "Widget State",
    // Memoize shared data so the effect in useAIContext does not run every render
    value: React.useMemo(
      () => ({
        totalInteractions: mockChat.messages.length,
        // Update timestamp only when messages length changes (avoid per-render churn)
        lastUpdated: new Date().toISOString(),
        contextItemsCount: useAIContextStore.getState().contextItems.size,
      }),
      [mockChat.messages.length]
    ),
    priority: 40,
  });


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
          chat={mockChat}
          header={{
            title: "AI with Shared Context",
            subtitle: "AI knows your profile, settings, and session state",
          }}
          ui={{
            placeholder: "Try: 'What's my name?' or 'What are my settings?'",
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
  useAIContext({ description: "User Profile", value: userProfile, priority: 100 });
  useAIContext({ description: "App Settings", value: settings, priority: 80 });
  useAIContext({ description: "Session Info", value: sessionInfo, priority: 60 });

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
export const AI_CONTEXT_API_SOURCE = `import { openai } from \"@ai-sdk/openai\";
import { streamText, convertToCoreMessages } from \"ai\";
import { NextRequest } from \"next/server\";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, enrichedSystemPrompt, tools, context, focus } = await req.json();

  // Context is automatically passed from frontend as text lines for transparency
  // Example:
  // context = [
  //   { id: \"user-profile\", text: \"User Profile: {\\\"name\\\":\\\"Alice\\\",...}\", priority: 100 },
  //   { id: \"app-settings\", text: \"App Settings: {\\\"theme\\\":\\\"dark\\\",...}\", priority: 80 }
  // ]

  const result = streamText({
    model: openai(\"gpt-4\"),
    // Prefer the enriched system prompt prepared by the frontend
    system: enrichedSystemPrompt || systemPrompt,
    messages: convertToCoreMessages(messages),
    tools,
    toolChoice: \"auto\",
  });

  return result.toUIMessageStreamResponse();
}`;
