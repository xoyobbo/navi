import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import { checkEnvVars } from "@/lib/env-check";
import "./globals.css";

checkEnvVars();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Navi - AIショッピングアシスタント",
  description: "友達のように最適な商品を選んでくれるAIアシスタント",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Navi",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={jaJP}
      signInFallbackRedirectUrl="/search"
      signUpFallbackRedirectUrl="/search"
      afterSignOutUrl="/"
    >
      <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-white">{children}</body>
      </html>
    </ClerkProvider>
  );
}
