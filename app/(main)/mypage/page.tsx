"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PushNotificationSetup from "@/components/PushNotificationSetup";

type FavoriteItem = {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_image: string;
  product_url: string;
  source: string;
  created_at: string;
};

type HistoryItem = {
  id: string;
  query: string;
  created_at: string;
};

type AlertItem = {
  id: string;
  product_name: string;
  product_url: string;
  source: string;
  target_price: number;
  current_price: number;
  is_triggered: boolean;
  created_at: string;
};

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  rakuten: { label: "楽天", color: "bg-red-50 text-red-600" },
  yahoo: { label: "Yahoo!", color: "bg-purple-50 text-purple-600" },
  amazon: { label: "Amazon", color: "bg-orange-50 text-orange-600" },
};

export default function MyPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingFav, setLoadingFav] = useState(true);
  const [loadingHist, setLoadingHist] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null);

  type LearningProfile = {
    total_searches: number;
    total_clicks: number;
    total_favorites: number;
    preferred_categories: string[];
    preferred_brands: string[];
    preferred_price_min: number;
    preferred_price_max: number;
  };
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);

  useEffect(() => {
    fetch("/api/learning/profile")
      .then((r) => r.json())
      .then((d) => { if (d.profile) setLearningProfile(d.profile); })
      .catch(() => {});
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => setFavorites(d.favorites ?? []))
      .catch(() => {})
      .finally(() => setLoadingFav(false));

    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []))
      .catch(() => {})
      .finally(() => setLoadingHist(false));

    fetch("/api/price-alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []))
      .catch(() => {})
      .finally(() => setLoadingAlerts(false));
  }, []);

  async function handleDeleteAlert(id: string) {
    setDeletingAlertId(id);
    try {
      await fetch(`/api/price-alerts/${id}`, { method: "DELETE" });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeletingAlertId(null);
    }
  }

  return (
    <div className="">
      <PushNotificationSetup />
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-sky-500 to-sky-400 px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-4">
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt="アバター"
              width={60}
              height={60}
              className="rounded-full border-2 border-white/40 shrink-0"
            />
          ) : (
            <div className="w-15 h-15 rounded-full bg-white/30 flex items-center justify-center text-3xl shrink-0">
              👤
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-lg truncate">
              {user?.firstName ?? user?.username ?? "ゲスト"}
            </p>
            <p className="text-sm opacity-75 truncate">
              {user?.emailAddresses?.[0]?.emailAddress ?? ""}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* 🧠 Naviの学習状況 */}
        <section>
          {(() => {
            const totalSearches = learningProfile?.total_searches ?? 0;
            const level = Math.min(Math.floor(totalSearches / 5), 10);
            const pct = level * 10;
            return (
              <div className="p-4 bg-[#fafaf8] rounded-2xl border border-[#e8e8e4]">
                <h3 className="text-sm font-bold text-gray-800 mb-3">🧠 Naviの学習状況</h3>
                {/* レベルバー */}
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>学習レベル {level} / 10</span>
                  <span>検索 {totalSearches} 回</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: "#c8a96e" }}
                  />
                </div>

                {level >= 2 && learningProfile ? (
                  <div className="mt-3 text-xs text-gray-500 space-y-1">
                    <p className="font-medium text-gray-600">📊 Naviが学んだこと：</p>
                    {(learningProfile.preferred_categories ?? []).length > 0 && (
                      <p>よく見るジャンル：{learningProfile.preferred_categories.slice(0, 3).join("・")}</p>
                    )}
                    {(learningProfile.preferred_brands ?? []).length > 0 && (
                      <p>好きなブランド：{learningProfile.preferred_brands.join("・")}</p>
                    )}
                    {(learningProfile.preferred_price_min > 0 || learningProfile.preferred_price_max > 0) && (
                      <p>よく買う価格帯：{learningProfile.preferred_price_min.toLocaleString()}円〜{learningProfile.preferred_price_max.toLocaleString()}円</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-400">
                    もっと使うほど、あなた好みの提案ができるようになります ✨
                  </p>
                )}
              </div>
            );
          })()}
        </section>

        {/* お気に入り */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">❤️ お気に入り</h2>
            <span className="text-xs text-gray-400">{favorites.length}件</span>
          </div>

          {loadingFav ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : favorites.length > 0 ? (
            <div className="space-y-2">
              {favorites.map((fav) => {
                const badge = SOURCE_BADGE[fav.source] ?? { label: fav.source, color: "bg-gray-100 text-gray-600" };
                return (
                  <a
                    key={fav.id}
                    href={fav.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:border-sky-200 transition"
                  >
                    {fav.product_image ? (
                      <Image
                        src={fav.product_image}
                        alt={fav.product_name}
                        width={56}
                        height={56}
                        className="rounded-xl object-contain bg-gray-50 shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
                        {fav.product_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          ¥{fav.product_price?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#9CA3AF" className="w-4 h-4 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
              <p className="text-3xl mb-2">🤍</p>
              <p className="text-sm text-gray-400">まだお気に入りがありません</p>
              <Link
                href="/search"
                className="mt-3 inline-block text-sky-500 text-xs font-medium"
              >
                商品を探す →
              </Link>
            </div>
          )}
        </section>

        {/* 検索履歴 */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">🔍 検索履歴</h2>

          {loadingHist ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-7 w-20 bg-gray-200 rounded-full animate-pulse" />
              ))}
            </div>
          ) : history.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {history.map((h) => (
                <Link
                  key={h.id}
                  href={`/search?q=${encodeURIComponent(h.query ?? "")}`}
                  className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full hover:bg-sky-50 hover:text-sky-600 transition"
                >
                  {h.query}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">まだ検索履歴がありません</p>
          )}
        </section>

        {/* 価格アラート */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">🔔 価格アラート</h2>
            <span className="text-xs text-gray-400">{alerts.filter((a) => !a.is_triggered).length}件設定中</span>
          </div>

          {loadingAlerts ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-16 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const badge = SOURCE_BADGE[alert.source] ?? { label: alert.source, color: "bg-gray-100 text-gray-600" };
                const reached = alert.current_price <= alert.target_price;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-3 bg-white rounded-2xl p-3 border shadow-sm ${
                      alert.is_triggered ? "border-green-100 bg-green-50/30" : "border-gray-100"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1 leading-snug">
                        {alert.product_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          現在 <span className={`font-bold ${reached ? "text-green-600" : "text-gray-800"}`}>
                            ¥{alert.current_price.toLocaleString()}
                          </span>
                        </span>
                        <span className="text-xs text-gray-400">
                          目標 <span className="font-bold text-sky-600">¥{alert.target_price.toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                    {alert.is_triggered ? (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full shrink-0">
                        通知済み
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-sky-50 text-sky-600 px-2 py-1 rounded-full shrink-0">
                        監視中
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      disabled={deletingAlertId === alert.id}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition shrink-0"
                      aria-label="削除"
                    >
                      {deletingAlertId === alert.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="#9CA3AF" className="w-4 h-4 hover:stroke-red-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-sm text-gray-400">アラートが設定されていません</p>
              <p className="text-xs text-gray-300 mt-1">商品カードのベルマークで設定できます</p>
            </div>
          )}
        </section>

        {/* サインアウト */}
        <div className="pt-2">
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full py-3 text-sm font-medium text-red-500 bg-white border border-red-200 rounded-2xl hover:bg-red-50 transition"
          >
            サインアウト
          </button>
        </div>
      </div>
    </div>
  );
}
