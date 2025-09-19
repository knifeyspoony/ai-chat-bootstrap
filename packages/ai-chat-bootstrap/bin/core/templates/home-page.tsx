"use client";
import { ChatPopout } from "ai-chat-bootstrap";
import Image from "next/image";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        textAlign: "center",
        gap: "1.5rem",
      }}
    >
      <h1
        style={{
          fontSize: "2.5rem",
          lineHeight: 1.1,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          // Using a small gap so the logo sits nicely beside the text
          gap: ".75rem",
          color: "#ffffff",
        }}
      >
        <Image
          src="/acb.png"
          alt="AI Chat Bootstrap logo"
          width={56}
          height={56}
          priority
          style={{
            display: "block",
            borderRadius: 12,
            // No background
            backgroundColor: "transparent",
            objectFit: "cover",
            width: "auto",
            height: "auto",
          }}
        />
        <span style={{ display: "inline-block" }}>AI Chat Bootstrap</span>
      </h1>
      <p
        style={{
          maxWidth: 640,
          color: "var(--acb-color-muted-fg,#555)",
          lineHeight: 1.5,
          margin: "0 auto",
        }}
      >
        This starter was scaffolded with <code>ai-chat-bootstrap</code>. Use the
        floating chat popout or customize this page further. The UI library
        provides hooks for context sharing, tools, slash commands, suggestions
        and more.
      </p>
      {/* Drop-in chat assistant with built-in toggle button & overlay panel */}
      <ChatPopout
        transport={{ api: "/api/chat" }}
        messages={{ systemPrompt: "You are a helpful AI assistant." }}
        header={{ title: "AI Assistant" }}
        suggestions={{ enabled: true, count: 3 }}
        commands={{ enabled: true }}
        button={{ label: "Open Chat" }}
        popout={{ position: "right", mode: "overlay", container: "viewport" }}
        assistantActions={{
          copy: true,
          regenerate: true,
          debug: true,
        }}
      />
    </main>
  );
}
