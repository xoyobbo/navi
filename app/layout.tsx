import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import { checkEnvVars } from "@/lib/env-check";
import Footer from "@/components/Footer";
import "./globals.css";

checkEnvVars();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Navi - AIショッピングアシスタント",
  description:
    "AIに話しかけるだけで最適な商品を提案。イヤホン・家電・ファッションなどあらゆる商品をAIがあなたの条件に合わせて選びます。",
  keywords: ["AIショッピング", "商品比較", "おすすめ商品", "楽天", "ショッピングアシスタント"],
  openGraph: {
    title: "Navi - AIショッピングアシスタント",
    description: "AIに話しかけるだけで最適な商品を提案します",
    url: "https://navi-shop.jp",
    siteName: "Navi",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Navi - AIショッピングアシスタント",
    description: "AIに話しかけるだけで最適な商品を提案します",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://navi-shop.jp",
  },
  verification: {
    google: "N0BGdH1qCRc5Rl8ClYvJvWH9cVqIChGXmlmOTzA109M",
  },
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
        <body className="min-h-full flex flex-col bg-white">
          {children}
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
