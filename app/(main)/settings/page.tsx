"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type FavoriteItem = {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_image: string;
  product_url: string;
  source: string;
};

type HistoryItem = {
  id: string;
  query: string;
  created_at: string;
};

const SOURCES = [
  { id: "rakuten", name: "楽天市場",          icon: "🛒", color: "#BF0000", available: true },
  { id: "yahoo",   name: "Yahoo!ショッピング", icon: "🛍️", color: "#FF0033", available: true },
  { id: "amazon",  name: "Amazon",            icon: "📦", color: "#FF9900", available: false },
];

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  rakuten: { label: "楽天", color: "bg-red-50 text-red-600" },
  yahoo: { label: "Yahoo!", color: "bg-purple-50 text-purple-600" },
  amazon: { label: "Amazon", color: "bg-orange-50 text-orange-600" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">{title}</h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  onClick,
  danger,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0 transition ${
        onClick ? "hover:bg-gray-50 active:bg-gray-100" : "cursor-default"
      } ${danger ? "text-red-500" : "text-gray-800"}`}
    >
      <span className="text-sm font-medium">{label}</span>
      {value && <span className="text-sm text-gray-400 truncate max-w-[180px]">{value}</span>}
      {onClick && !danger && (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#9CA3AF" className="w-4 h-4 shrink-0 ml-2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingFav, setLoadingFav] = useState(true);
  const [loadingHist, setLoadingHist] = useState(true);
  const [showFav, setShowFav] = useState(false);
  const [showHist, setShowHist] = useState(false);

  const [ranking, setRanking] = useState<string[]>(["rakuten", "yahoo"]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState(false);

  const handleSourceSelect = (id: string) => {
    if (ranking.includes(id)) {
      setRanking((prev) => prev.filter((r) => r !== id));
    } else {
      setRanking((prev) => [...prev, id]);
    }
  };

  const getSourceRank = (id: string) => {
    const index = ranking.indexOf(id);
    return index === -1 ? null : index + 1;
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredSources: ranking }),
      });
      setSavedPrefs(true);
      setTimeout(() => setSavedPrefs(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPrefs(false);
    }
  };

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.preferredSources) && d.preferredSources.length > 0) {
          setRanking(d.preferredSources);
        }
      })
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
  }, []);

  return (
    <div className="px-4 pt-6 pb-8 space-y-5">
      {/* プロフィール */}
      <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {user?.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt="アバター"
            width={56}
            height={56}
            className="rounded-full shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-2xl shrink-0">
            👤
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">
            {user?.firstName ?? user?.username ?? "ゲスト"}
          </p>
          <p className="text-sm text-gray-400 truncate">
            {user?.emailAddresses?.[0]?.emailAddress ?? ""}
          </p>
        </div>
      </div>

      {/* ショッピングサイト設定 */}
      <Section title="ショッピングサイト設定">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-gray-400 mb-3">タップした順番が優先順位になります</p>
          <div className="flex flex-col gap-2 mb-3">
            {SOURCES.map((source) => {
              const rank = getSourceRank(source.id);
              const isSelected = rank !== null;
              return (
                <button
                  key={source.id}
                  onClick={() => source.available && handleSourceSelect(source.id)}
                  disabled={!source.available}
                  className="flex items-center gap-3 rounded-xl p-3 text-left transition"
                  style={{
                    background: isSelected ? "white" : "#f5f5f5",
                    border: isSelected ? `2px solid ${source.color}` : "2px solid transparent",
                    cursor: source.available ? "pointer" : "not-allowed",
                    opacity: source.available ? 1 : 0.5,
                    boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  <div
                    className="flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: isSelected ? source.color : "#e8e8e4",
                    }}
                  >
                    {isSelected ? rank : ""}
                  </div>
                  <span className="text-xl">{source.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{source.name}</p>
                    {!source.available && (
                      <p className="text-[11px] font-medium" style={{ color: "#FF9900" }}>準備中</p>
                    )}
                  </div>
                  {isSelected && (
                    <span className="text-lg" style={{ color: source.color }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleSavePrefs}
            disabled={savingPrefs || ranking.length === 0}
            className="w-full py-3 text-sm font-semibold rounded-xl transition mb-3"
            style={{
              background: savedPrefs ? "#22c55e" : ranking.length > 0 ? "#1a1a1a" : "#e8e8e4",
              color: "white",
              cursor: ranking.length > 0 && !savingPrefs ? "pointer" : "not-allowed",
            }}
          >
            {savedPrefs ? "保存しました ✓" : savingPrefs ? "保存中..." : "保存する"}
          </button>
        </div>
      </Section>

      {/* お気に入り */}
      <Section title="お気に入り">
        <Row
          label={loadingFav ? "読み込み中..." : `お気に入り商品（${favorites.length}件）`}
          onClick={favorites.length > 0 ? () => setShowFav((v) => !v) : undefined}
        />
        {showFav && favorites.length > 0 && (
          <div className="divide-y divide-gray-50">
            {favorites.map((fav) => {
              const badge = SOURCE_BADGE[fav.source] ?? { label: fav.source, color: "bg-gray-100 text-gray-600" };
              return (
                <a
                  key={fav.id}
                  href={fav.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
                >
                  {fav.product_image ? (
                    <Image
                      src={fav.product_image}
                      alt={fav.product_name}
                      width={44}
                      height={44}
                      className="rounded-xl object-contain bg-gray-50 shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-1">{fav.product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                      <span className="text-xs font-bold text-gray-700">¥{fav.product_price?.toLocaleString()}</span>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#9CA3AF" className="w-4 h-4 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </a>
              );
            })}
          </div>
        )}
      </Section>

      {/* 検索履歴 */}
      <Section title="検索履歴">
        <Row
          label={loadingHist ? "読み込み中..." : `検索履歴（${history.length}件）`}
          onClick={history.length > 0 ? () => setShowHist((v) => !v) : undefined}
        />
        {showHist && history.length > 0 && (
          <div className="px-4 py-3 flex flex-wrap gap-2">
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
        )}
      </Section>

      {/* アカウント */}
      <Section title="アカウント">
        <Row label="サインアウト" onClick={() => signOut({ redirectUrl: "/sign-in" })} danger />
      </Section>
    </div>
  );
}
