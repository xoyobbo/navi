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
  description:
    "会話を楽しみながらお買い物が進む、新感覚の総合ECアシスタント。数多くの商品の中から、あなたのこだわりにぴったりの「最高の1品」をAIが厳選。探す手間のない、迷わない買い物を今すぐ。",
  keywords: [
    // AI・サービス系
    "AIショッピング", "ショッピングアシスタント", "AI商品検索", "AI おすすめ商品",
    // 楽天ユーザー向け
    "楽天 おすすめ商品", "楽天市場 比較", "楽天 最安値", "楽天 人気商品",
    "楽天 ランキング", "楽天市場 AI", "楽天 商品選び",
    // Amazon ユーザー向け
    "Amazon おすすめ", "Amazon 商品比較", "Amazon 最安値", "Amazon 代替",
    "Amazon 楽天 比較",
    // 一般ショッピング検索
    "商品比較", "おすすめ商品", "最安値 比較", "ネット通販 比較",
    "オンラインショッピング", "通販 おすすめ", "商品検索", "安い商品",
    // カテゴリ系（購買意欲が高い検索）
    "イヤホン おすすめ", "家電 比較", "スマホ おすすめ", "プレゼント おすすめ",
    "コスパ 商品", "人気商品 ランキング", "お買い物 AI",
  ],
  openGraph: {
    title: "Navi - AIショッピングアシスタント",
    description: "楽天・Amazon・Yahoo!の商品をAIが比較。話しかけるだけで最安値・おすすめ商品を提案します。",
    url: "https://navi-shop.jp",
    siteName: "Navi",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Navi - AIショッピングアシスタント",
    description: "楽天・Amazon・Yahoo!の商品をAIが比較。話しかけるだけで最安値・おすすめ商品を提案します。",
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
      signInFallbackRedirectUrl="/chat"
      signUpFallbackRedirectUrl="/chat"
      afterSignOutUrl="/"
    >
      <html lang="ja" className={`${geistSans.variable} antialiased`}>
        <body className="flex flex-col bg-white">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
