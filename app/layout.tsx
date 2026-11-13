// src/app/layout.tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TERRACROP EO — Crop Cycle & Land Intelligence",
  description: "Predictive Paddy Field & Multi-Cropping Intelligence System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${jakarta.variable} ${jetbrains.variable} dark`}>
      <body className="bg-[#050505] text-white font-sans antialiased selection:bg-pink-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}