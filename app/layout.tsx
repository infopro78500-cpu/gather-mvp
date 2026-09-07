import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ToastProvider } from "@/app/components/ui/ToastProvider";
import { ServiceWorkerRegistration } from "@/app/components/ServiceWorkerRegistration";
import { MobileDeepLinkHandler } from "@/app/components/MobileDeepLinkHandler";
import { SiteFooter } from "@/app/components/SiteFooter";
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
  metadataBase: new URL("https://usegather.app"),
  title: "Usegather — Le partage de photos d’événement",
  description:
    "Usegather permet à un groupe de rassembler les photos et vidéos d’un événement dans un coffre commun éphémère, via un QR code ou un code PIN.",
  icons: {
    icon: "/usegather-logo.png",
    shortcut: "/usegather-logo.png",
    apple: "/usegather-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>{children}</ToastProvider>
        <SiteFooter />
        <ServiceWorkerRegistration />
        <MobileDeepLinkHandler />
        <Analytics />
      </body>
    </html>
  );
}
