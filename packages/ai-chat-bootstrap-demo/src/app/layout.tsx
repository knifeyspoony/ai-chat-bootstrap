import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import {
  Fira_Code,
  Geist,
  Geist_Mono,
  Lora,
  Merriweather,
  Oxanium,
  Plus_Jakarta_Sans,
  Roboto_Mono,
} from "next/font/google";
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

// Claymorphism theme fonts
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${oxanium.variable} ${merriweather.variable} ${firaCode.variable} ${plusJakartaSans.variable} ${lora.variable} ${robotoMono.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={[
            "light",
            "dark",
            "system",
            "solar-dusk",
            "solar-dusk-dark",
            "alt",
            "claymorphism",
            "claymorphism-dark",
          ]}
          storageKey="acb-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
