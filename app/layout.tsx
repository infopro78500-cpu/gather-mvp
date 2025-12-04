import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Gather - Coffres photos partagés",
  description:
    "Crée un évènement, partage un PIN et rassemble toutes les photos de ton groupe en quelques secondes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans bg-background text-foreground`}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
