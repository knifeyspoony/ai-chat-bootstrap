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
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
