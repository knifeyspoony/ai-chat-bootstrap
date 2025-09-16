"use client";

import { ChatContainer, type UIMessage, useAIFocus } from "ai-chat-bootstrap";
import { useMockAIChat } from "./shared/useMockAIChat";

// Sample items that can be focused
const sampleItems = [
  {
    id: "note-1",
    title: "Project Requirements",
    content:
      "Define the core features and technical requirements for the new dashboard.",
    type: "note",
  },
  {
    id: "note-2",
    title: "Meeting Notes",
    content:
      "Key decisions from the weekly team sync: prioritize mobile optimization.",
    type: "note",
  },
  {
    id: "doc-1",
    title: "API Documentation",
    content: "REST API endpoints and authentication flow documentation.",
    type: "document",
  },
  {
    id: "file-1",
    title: "config.json",
    content: '{"apiUrl": "https://api.example.com", "timeout": 5000}',
    type: "file",
  },
];

function FocusItemsList() {
  const { setFocus, clearFocus, focusedIds, allFocusItems } = useAIFocus();

  const handleItemToggle = (item: (typeof sampleItems)[0]) => {
    const isCurrentlyFocused = focusedIds.includes(item.id);

    if (isCurrentlyFocused) {
      clearFocus(item.id);
    } else {
      setFocus(item.id, {
        id: item.id,
        label: item.title,
        description: `${item.type}: ${item.title}`,
        data: {
          type: item.type,
          title: item.title,
          content: item.content,
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-3">Available Items</h3>
        <div className="grid gap-2">
          {sampleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemToggle(item)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                focusedIds.includes(item.id)
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {item.type}
                    </span>
                    <span className="font-medium text-sm">{item.title}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {item.content}
                  </p>
                </div>
                <div className="ml-2">
                  {focusedIds.includes(item.id) ? (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {allFocusItems.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">
            Currently Focused ({allFocusItems.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {allFocusItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
              >
                <span>{item.label}</span>
                <button
                  onClick={() => clearFocus(item.id)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FocusItemsExample() {
  const { focusedIds, allFocusItems } = useAIFocus();
  const mockChat = useMockAIChat();

  function buildAssistantReply(userText: string): string {
    if (allFocusItems.length > 0) {
      const focusedTitles = allFocusItems
        .map((i) => i.label || i.id)
        .join(", ");
      return `You asked: "${userText}". I can see ${
        allFocusItems.length
      } focused item${
        allFocusItems.length !== 1 ? "s" : ""
      }: ${focusedTitles}. I'll factor these into my response. Try unfocusing or adding items to change my context.`;
    }
    return `You asked: "${userText}". You currently have no focused items. Select some from the panel so I can give more contextual answers.`;
  }

  // Override the sendMessageWithContext to add our custom logic
  const sendMessageWithContext = (text: string) => {
    if (!text.trim()) return;
    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text }],
    };
    mockChat.setMessages((m) => [...m, userMessage]);
    mockChat.setIsLoading(true);

    setTimeout(() => {
      const assistantMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text: buildAssistantReply(text) }],
      };
      mockChat.setMessages((m) => [...m, assistantMessage]);
      mockChat.setIsLoading(false);
    }, 800);
  };

  const chat = {
    ...mockChat,
    sendMessageWithContext,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px]">
      <div className="border rounded-lg p-4 overflow-y-auto">
        <FocusItemsList />
      </div>
      <div className="border rounded-lg">
        <ChatContainer
          chat={chat}
          header={{
            title: "AI Assistant",
            subtitle:
              focusedIds.length > 0
                ? `${focusedIds.length} item${
                    focusedIds.length !== 1 ? "s" : ""
                  } in focus`
                : "No items focused",
          }}
          ui={{ placeholder: "Ask about your focused items..." }}
        />
      </div>
    </div>
  );
}

// Source code exports for documentation
export const FOCUS_ITEMS_FRONTEND_SOURCE = `import React from "react";
import { ChatContainer, useAIChat, useAIFocus } from "ai-chat-bootstrap";

function DocumentSelector({ documents }: { documents: Document[] }) {
  const { setFocus, clearFocus, focusedIds } = useAIFocus();
  
  const handleDocumentToggle = (doc: Document) => {
    if (focusedIds.includes(doc.id)) {
      clearFocus(doc.id);
    } else {
      setFocus(doc.id, {
        id: doc.id,
        label: doc.title,
        description: \`Document: \${doc.title}\`,
        data: {
          type: 'document',
          title: doc.title,
          content: doc.content,
          lastModified: doc.lastModified
        }
      });
    }
  };

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <button
          key={doc.id}
          onClick={() => handleDocumentToggle(doc)}
          className={\`p-3 rounded-lg border \${
            focusedIds.includes(doc.id)
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }\`}
        >
          {doc.title}
        </button>
      ))}
    </div>
  );
}

export function ChatWithFocus() {
  const { allFocusItems } = useAIFocus();
  
  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt: "You are a helpful assistant with access to the user's focused documents."
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <DocumentSelector documents={myDocuments} />
      <ChatContainer
        title="AI Assistant"
        subtitle={\`\${allFocusItems.length} items in focus\`}
        messages={chat.messages}
        input={chat.input}
        onInputChange={chat.handleInputChange}
        onSubmit={chat.handleSubmit}
        isLoading={chat.isLoading}
      />
    </div>
  );
}`;

export const FOCUS_ITEMS_API_SOURCE = `import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(request: Request) {
  const { messages, focusItems } = await request.json();

  // Focus items are automatically included by useAIChat
  const contextualSystemPrompt = \`You are a helpful AI assistant.
  
\${focusItems?.length > 0 ? 
  \`The user has focused on these items:
\${focusItems.map((item: any) => 
  \`- \${item.label}: \${item.description || ''}
    Data: \${JSON.stringify(item.data, null, 2)}\`
).join('\\n')}

Consider this context when providing responses.\` : 
  'The user has no specific items in focus.'
}\`;

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    system: contextualSystemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}`;

export const FOCUS_ITEMS_HOOK_SOURCE = `import { useAIFocus } from "ai-chat-bootstrap";

function MyComponent() {
  const {
    // Actions for managing focus
    setFocus,      // Add item to focus
    clearFocus,    // Remove specific item from focus  
    clearAllFocus, // Remove all items from focus
    getFocus,      // Get specific focused item by ID
    
    // Reactive state (re-renders when focus changes)
    focusedIds,        // Array of focused item IDs
    allFocusItems,     // Array of all focused items
    hasFocusedItems,   // Boolean indicating if any items are focused
    focusItemsRecord,  // Object mapping IDs to items
  } = useAIFocus();

  // Add an item to focus
  const handleFocusDocument = (doc) => {
    setFocus(doc.id, {
      id: doc.id,
      label: doc.title,                    // Display label for chips/UI
      description: \`Document: \${doc.title}\`, // Semantic description for AI
      data: {                              // Structured data sent to AI
        type: 'document',
        title: doc.title,
        content: doc.content,
        metadata: doc.metadata
      }
    });
  };

  // Remove from focus
  const handleUnfocus = (docId) => {
    clearFocus(docId);
  };

  return (
    <div>
      <p>Focused items: {focusedIds.length}</p>
      {allFocusItems.map(item => (
        <div key={item.id}>{item.label}</div>
      ))}
    </div>
  );
}`;
