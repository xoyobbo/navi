"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/product";

const SOURCE_BADGE: Record<string, { label: string; color: string; solid: string }> = {
  rakuten: { label: "楽天", color: "bg-red-50 text-red-600", solid: "var(--navi-rakuten)" },
  yahoo:   { label: "Yahoo!", color: "bg-purple-50 text-purple-600", solid: "var(--navi-yahoo)" },
  amazon:  { label: "Amazon", color: "bg-orange-50 text-orange-600", solid: "var(--navi-amazon)" },
};

type Props = {
  product: Product;
  reason?: string;
  badge?: string;
  onFavorite?: (product: Product, isFav: boolean) => void;
  isFavorited?: boolean;
  onCompare?: (product: Product) => void;
  isComparing?: boolean;
  compareDisabled?: boolean;
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill={rating >= star ? "#FBBF24" : rating >= star - 0.5 ? "#FCD34D" : "#E5E7EB"}
          className="w-3 h-3"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductCard({ product, reason, badge, onFavorite, isFavorited = false, onCompare, isComparing = false, compareDisabled = false }: Props) {
  const [fav, setFav] = useState(isFavorited);
  const [imgError, setImgError] = useState(false);
  const prevImageRef = useRef(product.image);
  if (prevImageRef.current !== product.image) {
    prevImageRef.current = product.image;
    setImgError(false);
  }
  const sourceBadge = SOURCE_BADGE[product.source] ?? { label: product.source, color: "bg-gray-100 text-gray-600", solid: "#888" };
  const router = useRouter();

  function handleFav(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const next = !fav;
    setFav(next);
    onFavorite?.(product, next);
    if (next) {
      trackAction("favorite");
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
      // お気に入り登録のたびにプロファイル更新をトリガー（サーバー側で10回に1回処理）
      fetch("/api/profile/update", { method: "POST" }).catch(() => {});
    }
  }

  function trackAction(actionType: "click" | "favorite" | "purchase_click") {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionType,
        productId: product.id,
        productName: product.name,
        productCategory: product.category,
        productPrice: product.price,
        source: product.source,
      }),
    }).catch(() => {});
  }

  function handleCardAreaClick() {
    trackAction("click");
    try {
      localStorage.setItem(`product_cache_${product.id}`, JSON.stringify(product));
    } catch {
      // noop
    }
    router.push(`/product/${product.id}`);
  }

  function handlePurchaseClick(e: React.MouseEvent) {
    e.stopPropagation();
    trackAction("purchase_click");
    try {
      localStorage.setItem(`product_cache_${product.id}`, JSON.stringify(product));
    } catch {
      // noop
    }
    router.push(`/product/${product.id}`);
  }

  return (
    <>
    <div
      style={{
        background: "var(--navi-bg-card)",
        borderRadius: "var(--navi-radius-md)",
        border: "0.5px solid var(--navi-border)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        opacity: product.trustLevel === "low" ? 0.85 : 1,
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onClick={handleCardAreaClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* 画像 */}
      <div className="relative h-[200px] flex-shrink-0" style={{ background: "#fafaf8" }}>
        {product.image && !imgError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            loading="lazy"
            quality={85}
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
        {/* お気に入りボタン */}
        <button
          onClick={handleFav}
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(4px)",
            border: "none",
            cursor: "pointer",
          }}
          aria-label={fav ? "お気に入り解除" : "お気に入り追加"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fav ? "#EF4444" : "none"} stroke={fav ? "#EF4444" : "#9CA3AF"} strokeWidth={1.8} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        {/* ソースバッジ */}
        <span style={{
          position: "absolute",
          bottom: "8px",
          left: "8px",
          background: sourceBadge.solid,
          color: "white",
          fontSize: "9px",
          fontWeight: "700",
          padding: "2px 6px",
          borderRadius: "4px",
          letterSpacing: "0.03em",
        }}>
          {sourceBadge.label}
        </span>
        {/* バッジ（badge prop 優先、なければスコア点数） */}
        {badge ? (
          <span style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            background: badge.startsWith("⭐") ? "var(--navi-gold)" : badge.startsWith("💰") ? "#16a34a" : "var(--navi-black)",
            color: badge.startsWith("⭐") ? "#1a0e00" : "white",
            fontSize: "9px",
            fontWeight: "700",
            padding: "2px 6px",
            borderRadius: "4px",
            letterSpacing: "0.05em",
          }}>
            {badge}
          </span>
        ) : product.score !== undefined ? (
          <span style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            background: product.score >= 80 ? "var(--navi-gold)" : product.score >= 60 ? "var(--navi-black)" : "rgba(0,0,0,0.3)",
            color: product.score >= 80 ? "#1a0e00" : "white",
            fontSize: "9px",
            fontWeight: "700",
            padding: "2px 6px",
            borderRadius: "4px",
          }}>
            {product.score}点
          </span>
        ) : null}
      </div>

      {/* テキスト情報 */}
      <div style={{ padding: "10px 10px 12px", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* 商品名 */}
        <p style={{
          fontSize: "12px",
          lineHeight: "1.5",
          color: "var(--navi-text)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          marginBottom: "6px",
          fontWeight: "400",
          letterSpacing: "0.01em",
          minHeight: "2.25rem",
        }}>
          {product.name}
        </p>

        {reason && (
          <p style={{ fontSize: "11px", color: "var(--navi-gold)", background: "var(--navi-gold-light)", borderRadius: "6px", padding: "4px 8px", lineHeight: "1.4", marginBottom: "4px" }}>
            {reason}
          </p>
        )}
        {!reason && product.reason && (
          <p style={{ fontSize: "11px", color: "var(--navi-text-sub)", marginBottom: "4px", lineHeight: "1.4" }}>
            {product.reason}
          </p>
        )}
        {!reason && !product.reason && product.scoreReason && (
          <p style={{ fontSize: "11px", color: "var(--navi-text-hint)", marginBottom: "4px", lineHeight: "1.4" }}>{product.scoreReason}</p>
        )}

        {/* 価格・評価エリア */}
        <div style={{ marginTop: "auto", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
            <StarRating rating={product.rating} />
            <span style={{ fontSize: "11px", color: "var(--navi-text-sub)", fontWeight: "500" }}>
              {product.rating > 0 ? product.rating.toFixed(1) : "—"}
            </span>
            <span style={{ fontSize: "10px", color: "var(--navi-text-hint)" }}>
              ({product.reviewCount.toLocaleString()})
            </span>
          </div>
          {product.totalScore !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ height: "3px", width: "60px", background: "var(--navi-border)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${product.totalScore}%`,
                  background: product.totalScore >= 80 ? "#16a34a" : product.totalScore >= 60 ? "var(--navi-gold)" : "var(--navi-border-strong)",
                  borderRadius: "2px",
                  transition: "width 0.3s",
                }} />
              </div>
              <span style={{ fontSize: "10px", color: "var(--navi-text-hint)" }}>{product.totalScore}</span>
            </div>
          )}
          <p style={{ fontSize: "16px", fontWeight: "700", color: "var(--navi-price)", letterSpacing: "-0.01em" }}>
            ¥{product.price.toLocaleString()}
          </p>
          <button
            onClick={handlePurchaseClick}
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: "13px",
              fontWeight: "600",
              color: "white",
              background: "var(--navi-black)",
              border: "none",
              borderRadius: "var(--navi-radius-sm)",
              padding: "10px 8px",
              minHeight: "40px",
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            詳細を見る
          </button>

          <button
            onClick={async (e) => {
              e.stopPropagation();
              fetch("/api/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  actionType: "amazon_click",
                  productId: product.id,
                  productName: product.name,
                  productPrice: product.price,
                  source: "amazon",
                }),
              }).catch(() => {});
              // 先にタブを開いてポップアップブロックを回避
              const win = window.open("", "_blank");
              const id = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_ID ?? "navi-shop-22";
              try {
                const res = await fetch("/api/extract-keyword", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productName: product.name }),
                });
                const data = await res.json();
                const kw = data.keyword || product.name.slice(0, 20);
                if (win) win.location.href = `https://www.amazon.co.jp/s?k=${encodeURIComponent(kw)}&tag=${id}`;
              } catch {
                if (win) win.location.href = `https://www.amazon.co.jp/s?k=${encodeURIComponent(product.name.slice(0, 20))}&tag=${id}`;
              }
            }}
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: "12px",
              fontWeight: "600",
              color: "#1a0e00",
              background: "var(--navi-amazon)",
              border: "none",
              borderRadius: "var(--navi-radius-sm)",
              padding: "10px 8px",
              minHeight: "40px",
              cursor: "pointer",
            }}
          >
            Amazonで探す
          </button>

          {onCompare && (
            <button
              onClick={(e) => { e.stopPropagation(); onCompare(product); }}
              disabled={compareDisabled && !isComparing}
              style={{
                width: "100%",
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "500",
                color: isComparing ? "var(--navi-black)" : compareDisabled ? "var(--navi-text-hint)" : "var(--navi-text-sub)",
                background: "transparent",
                border: `0.5px solid ${isComparing ? "var(--navi-border-strong)" : "var(--navi-border)"}`,
                borderRadius: "var(--navi-radius-sm)",
                padding: "8px",
                minHeight: "36px",
                cursor: compareDisabled && !isComparing ? "not-allowed" : "pointer",
                opacity: compareDisabled && !isComparing ? 0.4 : 1,
              }}
            >
              {isComparing ? "✓ 比較中" : "＋ 比較する"}
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
