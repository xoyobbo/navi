"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import type { TopData } from "@/app/api/search/top/route";

const QUICK_CATEGORIES = [
  { label: "イヤホン", emoji: "🎧", q: "ワイヤレスイヤホン" },
  { label: "カメラ", emoji: "📷", q: "デジタルカメラ" },
  { label: "スマホ", emoji: "📱", q: "スマートフォン" },
  { label: "PC", emoji: "💻", q: "ノートパソコン" },
  { label: "時計", emoji: "⌚", q: "スマートウォッチ" },
  { label: "美容", emoji: "✨", q: "美容家電" },
];

export default function HomePage() {
  const { user } = useUser();
  const [topData, setTopData] = useState<TopData | null>(null);
  const [loading, setLoading] = useState(true);

  const name = user?.firstName ?? user?.username ?? null;

  useEffect(() => {
    fetch("/api/search/top")
      .then((r) => r.json())
      .then((data: TopData) => setTopData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayProducts = topData?.isPersonalized && (topData.personalizedSections?.length ?? 0) > 0
    ? topData.personalizedSections!.flatMap((s) => s.products).slice(0, 8)
    : (topData?.popular.length ? topData.popular : topData?.products ?? []).slice(0, 8);

  const sectionTitle = topData?.title ?? "✨ 人気の商品";
  const isFromHistory = topData?.isPersonalized ?? false;
  const subMessage =
    isFromHistory && topData?.topCategories && topData.topCategories.length > 0
      ? `「${topData.topCategories.join("・")}」をよく検索しています`
      : !isFromHistory && !loading
      ? "まずは検索してみましょう！"
      : null;

  return (
    <div className="pb-10">
      {/* ヘッダーバナー */}
      <div className="bg-gradient-to-br from-sky-500 to-sky-400 px-5 pt-8 pb-10 text-white">
        <p className="text-sm font-medium opacity-80 mb-1">
          {name ? `${name}さん、` : ""}おかえりなさい 👋
        </p>
        <h1 className="text-2xl font-bold mb-4">今日は何を探しますか？</h1>
        <Link
          href="/chat"
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-2xl px-4 py-3 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="white" className="w-5 h-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <span className="text-sm font-medium text-white/90">AIに相談する…</span>
        </Link>
      </div>

      <div className="px-4 -mt-4 space-y-6">
        {/* クイックカテゴリ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-3 gap-2">
            {QUICK_CATEGORIES.map((cat) => (
              <Link
                key={cat.q}
                href={`/search?q=${encodeURIComponent(cat.q)}`}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-sky-50 transition"
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-medium text-gray-600">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* おすすめ商品 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-800">{sectionTitle}</h2>
            {isFromHistory && topData?.topCategories?.[0] && (
              <Link
                href={`/search?q=${encodeURIComponent(topData.topCategories[0])}`}
                className="text-xs text-sky-500 font-medium"
              >
                もっと見る →
              </Link>
            )}
          </div>

          {subMessage && (
            <p className={`text-xs mb-3 ${isFromHistory ? "text-sky-600" : "text-gray-400"}`}>
              {subMessage}
            </p>
          )}
          {isFromHistory && (
            <p className="text-xs text-gray-400 mb-3">検索履歴をもとに表示しています</p>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {displayProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-400 mb-1">まだ履歴がありません</p>
              <p className="text-xs text-gray-300">検索・クリック・お気に入りするとパーソナライズされます</p>
            </div>
          )}
        </section>

        {/* 他のカテゴリへのリンク */}
        {isFromHistory && topData?.topCategories && topData.topCategories.length > 1 && (
          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">🔁 他の気になるカテゴリ</h2>
            <div className="flex flex-wrap gap-2">
              {topData.topCategories.slice(1).map((cat) => (
                <Link
                  key={cat}
                  href={`/search?q=${encodeURIComponent(cat)}`}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-600 hover:border-sky-300 hover:text-sky-600 transition shadow-sm"
                >
                  {cat}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
