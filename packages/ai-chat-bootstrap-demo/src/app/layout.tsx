import type { Metadata } from "next";
import { Geist, Geist_Mono, Oxanium, Merriweather, Fira_Code } from "next/font/google";
import React from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Solar Dusk theme fonts
const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${oxanium.variable} ${merriweather.variable} ${firaCode.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark', 'system', 'solar-dusk', 'solar-dusk-dark', 'alt']}
          storageKey="acb-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
