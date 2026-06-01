"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ImageSlider from "@/components/ImageSlider";
import { extractColors, COLOR_MAP } from "@/lib/color-extractor";
import type { Product } from "@/types/product";
import type { SummaryData } from "@/app/api/product/summary/route";

// ── 定数 ────────────────────────────────────────────────

type TabId = "summary" | "specs" | "reviews";

const SOURCE_BADGE: Record<string, { label: string; color: string; btnColor: string }> = {
  rakuten: { label: "楽天", color: "bg-red-50 text-red-600", btnColor: "bg-red-500 hover:bg-red-600" },
  yahoo: { label: "Yahoo!", color: "bg-purple-50 text-purple-600", btnColor: "bg-purple-500 hover:bg-purple-600" },
  amazon: { label: "Amazon", color: "bg-orange-50 text-orange-600", btnColor: "bg-orange-500 hover:bg-orange-600" },
};

const TABS: { id: TabId; label: string }[] = [
  { id: "summary", label: "AIまとめ" },
  { id: "specs", label: "スペック" },
  { id: "reviews", label: "クチコミ" },
];

// ── サブコンポーネント ────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill={rating >= star ? "#FBBF24" : rating >= star - 0.5 ? "#FCD34D" : "#E5E7EB"}
          className="w-4 h-4"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-3 bg-gray-100 rounded w-1/3" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${85 - i * 8}%` }} />
        ))}
      </div>
      <div className="h-3 bg-gray-100 rounded w-1/4 mt-4" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
    </div>
  );
}

function AiSummaryTab({ summary, loading }: { summary: SummaryData | null; loading: boolean }) {
  if (loading) return <SummarySkeleton />;
  if (!summary) {
    return <p className="text-sm text-gray-400 text-center py-8">AIまとめを読み込めませんでした</p>;
  }
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">✨ この商品の特徴</h3>
        <ul className="space-y-2">
          {summary.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-sky-400 font-bold shrink-0 mt-0.5">・</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">👤 こんな人におすすめ</h3>
        <ul className="space-y-2">
          {summary.recommended_for.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-500 font-bold shrink-0 mt-0.5">✓</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="bg-amber-50 rounded-xl p-3.5">
        <h3 className="text-xs font-bold text-amber-600 mb-1">⚠️ 注意点</h3>
        <p className="text-sm text-gray-700">{summary.caution}</p>
      </section>
    </div>
  );
}

function SpecsTab({ product }: { product: Product }) {
  const badge = SOURCE_BADGE[product.source] ?? { label: product.source, color: "bg-gray-100 text-gray-600", btnColor: "" };
  const rows = [
    { label: "カテゴリ", value: product.category || "—" },
    { label: "価格", value: `¥${product.price.toLocaleString()}` },
    { label: "評価", value: `★ ${product.rating.toFixed(1)}（${product.reviewCount.toLocaleString()}件）` },
    { label: "購入元", value: badge.label },
    { label: "在庫", value: product.availability ? "在庫あり" : "在庫なし" },
    ...(product.score !== undefined ? [{ label: "NAVIスコア", value: `${product.score}点` }] : []),
  ];
  return (
    <div className="divide-y divide-gray-100">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between items-center py-3 text-sm">
          <span className="text-gray-500">{label}</span>
          <span className="text-gray-800 font-medium text-right max-w-[60%]">{value}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewsTab({
  product,
  summary,
  loading,
}: {
  product: Product;
  summary: SummaryData | null;
  loading: boolean;
}) {
  if (loading) return <SummarySkeleton />;
  if (!summary) {
    return <p className="text-sm text-gray-400 text-center py-8">クチコミ要約を読み込めませんでした</p>;
  }
  const { good, bad, overall } = summary.review_summary;
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-bold text-green-600 tracking-widest mb-3">👍 良い点</h3>
        <ul className="space-y-2">
          {good.map((g, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-400 shrink-0 mt-0.5">・</span>
              <span>{g}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-xs font-bold text-red-500 tracking-widest mb-3">👎 気になる点</h3>
        <ul className="space-y-2">
          {bad.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-red-300 shrink-0 mt-0.5">・</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="bg-gray-50 rounded-xl p-3.5">
        <h3 className="text-xs font-bold text-gray-500 mb-1">💬 総評</h3>
        <p className="text-sm text-gray-700">{overall}</p>
      </section>
      <a
        href={product.affiliateUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 text-sm text-sky-500 font-medium py-2 hover:underline"
      >
        実際のクチコミを見る →
      </a>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  // URL デコードして正規化（%3A → : など）
  const id = decodeURIComponent(params.id as string ?? "");

  const [product, setProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [fav, setFav] = useState(false);

  const colors = useMemo(() => (product ? extractColors(product.name) : []), [product]);

  useEffect(() => {
    if (!id) {
      startTransition(() => {
        setProductLoading(false);
        setLoadError("商品IDが見つかりません");
      });
      return;
    }

    startTransition(() => {
      setProductLoading(true);
      setLoadError("");
    });
    let loaded = false;

    // ① localStorage から試みる
    try {
      const cached = localStorage.getItem(`product_cache_${id}`);
      if (cached) {
        const p = JSON.parse(cached) as Product;
        startTransition(() => {
          setProduct(p);
          setProductLoading(false);
        });
        loadSummary(p);
        loadSimilar(p);
        loaded = true;
      }
    } catch (e) {
      console.warn("[product] localStorage 読み込み失敗:", e);
    }

    // ② localStorage になければ API から取得
    if (!loaded) {
      fetch(`/api/product/by-id?id=${encodeURIComponent(id)}`)
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok || !data.product) {
            throw new Error(data.error ?? `API ${r.status}`);
          }
          return data.product as Product;
        })
        .then((p) => {
          setProduct(p);
          try {
            localStorage.setItem(`product_cache_${id}`, JSON.stringify(p));
          } catch { /* noop */ }
          loadSummary(p);
          loadSimilar(p);
        })
        .catch((err) => {
          console.error("[product] 取得失敗:", err.message);
          setLoadError(err.message);
        })
        .finally(() => setProductLoading(false));
    }
  }, [id]);

  async function loadSummary(p: Product) {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/product/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          category: p.category,
          price: p.price,
          rating: p.rating,
          reviewCount: p.reviewCount,
        }),
      });
      const data = await res.json();
      if (!data.error) setSummary(data as SummaryData);
    } catch {
      // noop
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadSimilar(p: Product) {
    try {
      const res = await fetch(
        `/api/product/similar?name=${encodeURIComponent(p.name)}&price=${p.price}&source=${p.source ?? ""}`
      );
      const data = await res.json();
      setSimilar((data.products ?? []).filter((s: Product) => s.id !== p.id).slice(0, 5));
    } catch {
      // noop
    }
  }

  function handleFav() {
    if (!product) return;
    const next = !fav;
    setFav(next);
    if (next) {
      fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          product_name: product.name,
          product_price: product.price,
          product_image: product.image,
          product_url: product.affiliateUrl,
          source: product.source,
        }),
      }).catch(() => {});
    }
  }

  if (productLoading) {
    return (
      <div className="min-h-screen animate-pulse p-4 space-y-4" style={{ background: "var(--navi-bg)" }}>
        <div className="h-8 rounded-xl w-1/3" style={{ background: "var(--navi-border)" }} />
        <div className="aspect-square rounded-2xl" style={{ background: "var(--navi-border)" }} />
        <div className="h-6 rounded w-2/3" style={{ background: "var(--navi-border)" }} />
        <div className="h-4 rounded w-1/4" style={{ background: "var(--navi-border)" }} />
        <div className="h-10 rounded-2xl" style={{ background: "var(--navi-border)" }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-3">
        <p className="text-4xl">😔</p>
        <p className="text-gray-700 text-sm font-medium">商品情報を読み込めませんでした</p>
        {loadError && (
          <p className="text-xs text-red-400 bg-red-50 rounded-lg px-3 py-2 max-w-xs break-all">
            {loadError}
          </p>
        )}
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => router.back()}
            className="text-sky-500 text-sm font-medium border border-sky-200 rounded-full px-4 py-2"
          >
            戻る
          </button>
          <button
            onClick={() => {
              setProductLoading(true);
              setLoadError("");
              fetch(`/api/product/by-id?id=${encodeURIComponent(id)}`)
                .then(async (r) => {
                  const data = await r.json();
                  if (!r.ok || !data.product) throw new Error(data.error ?? `API ${r.status}`);
                  return data.product as Product;
                })
                .then((p) => {
                  setProduct(p);
                  try { localStorage.setItem(`product_cache_${id}`, JSON.stringify(p)); } catch { /* noop */ }
                  loadSummary(p);
                  loadSimilar(p);
                })
                .catch((err) => setLoadError(err.message))
                .finally(() => setProductLoading(false));
            }}
            className="text-white bg-sky-500 text-sm font-medium rounded-full px-4 py-2"
          >
            再試行
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">ID: {id}</p>
      </div>
    );
  }

  const badge = SOURCE_BADGE[product.source] ?? {
    label: product.source,
    color: "bg-gray-100 text-gray-600",
    btnColor: "bg-sky-500 hover:bg-sky-600",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--navi-bg)" }}>
      {/* 戻るボタンバー */}
      <div style={{
        position: "sticky",
        top: "var(--nav-top-h)",
        zIndex: 20,
        background: "rgba(247,246,243,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "0.5px solid var(--navi-border)",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--navi-text-sub)", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span style={{ fontSize: "13px", fontWeight: "500" }}>戻る</span>
        </button>
        <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--navi-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</p>
      </div>

      {/* 2カラムレイアウト（md以上） */}
      <div className="md:grid md:grid-cols-2 md:gap-8 md:px-8 md:py-6 md:max-w-5xl md:mx-auto">
        {/* 左：画像エリア */}
        <div>
          <div className="md:rounded-2xl md:overflow-hidden">
            <ImageSlider
              images={product.images && product.images.length > 0 ? product.images : [product.image]}
              alt={product.name}
            />
          </div>
          {colors.length > 0 && (
            <div className="flex flex-wrap gap-3 px-4 pt-3">
              {colors.map((color) => (
                <span key={color} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span
                    className="w-5 h-5 rounded-full border border-white shadow ring-1 ring-gray-200 inline-block"
                    style={{ backgroundColor: COLOR_MAP[color] }}
                  />
                  {color}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 右：商品情報 */}
        <div className="px-4 pt-5 md:px-0 md:pt-0 space-y-4">
          {/* ソースバッジ */}
          <span style={{
            display: "inline-block",
            fontSize: "10px",
            fontWeight: "700",
            padding: "2px 8px",
            borderRadius: "4px",
            background: badge.label === "楽天" ? "var(--navi-rakuten)" : badge.label === "Yahoo!" ? "var(--navi-yahoo)" : "var(--navi-amazon)",
            color: "white",
            letterSpacing: "0.03em",
          }}>
            {badge.label}
          </span>

          {/* 商品名 */}
          <h1 style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "var(--navi-text)",
            lineHeight: "1.5",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            letterSpacing: "0.01em",
          }}>
            {product.name}
          </h1>

          {/* 評価 */}
          <div className="flex items-center gap-2">
            <StarRating rating={product.rating} />
            <span style={{ fontSize: "12px", color: "var(--navi-text-sub)" }}>
              {product.rating.toFixed(1)}（{product.reviewCount.toLocaleString()}件）
            </span>
          </div>

          {/* 価格 */}
          <p style={{ fontSize: "28px", fontWeight: "700", color: "var(--navi-price)", letterSpacing: "-0.02em" }}>
            ¥{product.price.toLocaleString()}
            <span style={{ fontSize: "13px", fontWeight: "400", color: "var(--navi-text-hint)", marginLeft: "4px" }}>（税込）</span>
          </p>

          {/* NAVIスコア */}
          {product.score !== undefined && (
            <span style={{
              display: "inline-block",
              fontSize: "11px",
              fontWeight: "700",
              padding: "4px 10px",
              borderRadius: "4px",
              background: product.score >= 80 ? "var(--navi-gold)" : "var(--navi-border)",
              color: product.score >= 80 ? "#1a0e00" : "var(--navi-text-sub)",
              letterSpacing: "0.03em",
            }}>
              NAVIスコア {product.score}点
            </span>
          )}

          {/* 推薦理由 */}
          {product.reason && (
            <p style={{ fontSize: "13px", color: "var(--navi-text-sub)", background: "var(--navi-gold-light)", borderRadius: "var(--navi-radius-sm)", padding: "8px 12px" }}>
              {product.reason}
            </p>
          )}

          {/* 在庫状況 */}
          <p style={{ fontSize: "13px", fontWeight: "600", color: product.availability ? "#16a34a" : "var(--navi-price)" }}>
            {product.availability ? "✓ 在庫あり" : "✗ 在庫なし"}
          </p>

          {/* 購入ボタン */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--navi-text-hint)", letterSpacing: "0.06em", textTransform: "uppercase" }}>購入サイトを選ぶ</p>
            {product.purchaseLinks?.rakuten && (
              <a
                href={product.purchaseLinks.rakuten}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "15px",
                  background: "var(--navi-black)",
                  color: "white",
                  borderRadius: "var(--navi-radius-sm)",
                  fontSize: "15px",
                  fontWeight: "600",
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                }}
                onClick={() => {
                  fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ actionType: "purchase_click", productId: product.id, productName: product.name, productCategory: product.category, productPrice: product.price, source: "rakuten" }),
                  }).catch(() => {});
                  fetch("/api/profile/update", { method: "POST" }).catch(() => {});
                }}
              >
                <span style={{ fontSize: "11px", background: "var(--navi-rakuten)", padding: "2px 5px", borderRadius: "3px", fontWeight: "700" }}>楽天</span>
                楽天市場で購入する
              </a>
            )}
            {product.purchaseLinks?.yahoo && (
              <a
                href={product.purchaseLinks.yahoo}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "15px",
                  background: "transparent",
                  color: "var(--navi-text)",
                  border: "0.5px solid var(--navi-border-strong)",
                  borderRadius: "var(--navi-radius-sm)",
                  fontSize: "15px",
                  fontWeight: "400",
                  textDecoration: "none",
                }}
                onClick={() => {
                  fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ actionType: "purchase_click", productId: product.id, productName: product.name, productCategory: product.category, productPrice: product.price, source: "yahoo" }),
                  }).catch(() => {});
                  fetch("/api/profile/update", { method: "POST" }).catch(() => {});
                }}
              >
                <span style={{ fontSize: "11px", background: "var(--navi-yahoo)", color: "white", padding: "2px 5px", borderRadius: "3px", fontWeight: "700" }}>Y!</span>
                Yahoo!ショッピングで購入する
              </a>
            )}
            {/* Amazonボタン */}
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "15px",
                background: "transparent",
                color: "var(--navi-text)",
                border: "0.5px solid var(--navi-border-strong)",
                borderRadius: "var(--navi-radius-sm)",
                fontSize: "15px",
                fontWeight: "400",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => {
                fetch("/api/track", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ actionType: "amazon_click", productId: product.id, productName: product.name, productCategory: product.category, productPrice: product.price, source: "amazon" }),
                }).catch(() => {});
                const kw = product.name
                  .replace(/[【】「」『』★☆◆◇■□●○▲△▼▽♪♦]/g, " ")
                  .replace(/\d+%OFF/gi, " ")
                  .replace(/送料無料|ポイント\d+倍|最新|新品|正規品/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 40);
                const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_ID ?? "navi-shop-22";
                window.open(`https://www.amazon.co.jp/s?k=${encodeURIComponent(kw)}&tag=${tag}`, "_blank", "noopener,noreferrer");
              }}
            >
              <span style={{ fontSize: "11px", background: "var(--navi-amazon)", color: "white", padding: "2px 5px", borderRadius: "3px", fontWeight: "700" }}>A</span>
              Amazonで探す
            </button>
            <p style={{ fontSize: "11px", color: "var(--navi-text-hint)", textAlign: "center" }}>
              ※Amazonの検索ページに移動します
            </p>

            {!product.purchaseLinks?.rakuten && !product.purchaseLinks?.yahoo && (
              <a
                href={product.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "15px",
                  background: "var(--navi-black)",
                  color: "white",
                  borderRadius: "var(--navi-radius-sm)",
                  fontSize: "15px",
                  fontWeight: "600",
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                }}
                onClick={() => {
                  fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ actionType: "purchase_click", productId: product.id, productName: product.name, productCategory: product.category, productPrice: product.price, source: product.source }),
                  }).catch(() => {});
                  fetch("/api/profile/update", { method: "POST" }).catch(() => {});
                }}
              >
                {badge.label}で購入する
              </a>
            )}
          </div>

          {/* お気に入りボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleFav}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                borderRadius: "var(--navi-radius-sm)",
                border: `0.5px solid ${fav ? "rgba(239,68,68,0.3)" : "var(--navi-border-strong)"}`,
                background: fav ? "rgba(239,68,68,0.05)" : "transparent",
                fontSize: "13px",
                fontWeight: "500",
                color: fav ? "#ef4444" : "var(--navi-text-sub)",
                cursor: "pointer",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={fav ? "#EF4444" : "none"}
                stroke={fav ? "#EF4444" : "currentColor"}
                strokeWidth={1.8}
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              {fav ? "お気に入り済み" : "お気に入り"}
            </button>
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="mt-6 md:max-w-5xl md:mx-auto md:px-8">
        {/* タブバー */}
        <div style={{ display: "flex", borderBottom: "0.5px solid var(--navi-border)" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "12px",
                fontSize: "13px",
                fontWeight: activeTab === tab.id ? "600" : "400",
                color: activeTab === tab.id ? "var(--navi-black)" : "var(--navi-text-hint)",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${activeTab === tab.id ? "var(--navi-black)" : "transparent"}`,
                cursor: "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.02em",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        <div className="px-4 md:px-0 py-6">
          {activeTab === "summary" && (
            <AiSummaryTab summary={summary} loading={summaryLoading} />
          )}
          {activeTab === "specs" && <SpecsTab product={product} />}
          {activeTab === "reviews" && (
            <ReviewsTab product={product} summary={summary} loading={summaryLoading} />
          )}
        </div>
      </div>

      {/* 似たような商品 */}
      {similar.length > 0 && (
        <section className="mt-2 pb-6 md:max-w-5xl md:mx-auto">
          <h2 className="text-sm font-bold text-gray-800 px-4 mb-3">🔗 似たような商品</h2>
          <div
            className="overflow-x-auto px-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex gap-3 pb-2" style={{ width: "max-content" }}>
              {similar.map((p) => (
                <div key={p.id} className="w-40 shrink-0">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
