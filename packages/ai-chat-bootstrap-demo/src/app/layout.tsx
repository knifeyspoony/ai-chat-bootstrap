import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import React from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Chat Bootstrap Demo",
  description: "Demo components",
  icons: {
    icon: [
      {
        url: `${
          process.env.NODE_ENV === "production" ? "/ai-chat-bootstrap" : ""
        }/acb.png`,
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: `${
          process.env.NODE_ENV === "production" ? "/ai-chat-bootstrap" : ""
        }/acb.png`,
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: `${
      process.env.NODE_ENV === "production" ? "/ai-chat-bootstrap" : ""
    }/acb.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased pre-theme`}
      >
        <script
          // Inline script to prevent theme flash. Runs immediately.
          dangerouslySetInnerHTML={{
            __html: `(() => {try { const stored = localStorage.getItem('acb-theme') || 'system'; const html = document.documentElement; const body = document.body; const apply = (th) => { html.classList.remove('dark'); body.classList.remove('demo-alt'); if (th === 'dark') { html.classList.add('dark'); } else if (th === 'alt') { html.classList.add('dark'); body.classList.add('demo-alt'); } else if (th === 'system') { if (window.matchMedia('(prefers-color-scheme: dark)').matches) html.classList.add('dark'); } }; apply(stored); body.classList.remove('pre-theme'); if (stored === 'system') { const mq = window.matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', () => apply('system')); } } catch(e) { document.body && document.body.classList.remove('pre-theme'); } })();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
