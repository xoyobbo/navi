"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/product";
import PriceAlertModal from "@/components/PriceAlertModal";

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  rakuten: { label: "楽天", color: "bg-red-50 text-red-600" },
  yahoo: { label: "Yahoo!", color: "bg-purple-50 text-purple-600" },
  amazon: { label: "Amazon", color: "bg-orange-50 text-orange-600" },
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
  const [alertOpen, setAlertOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const prevImageRef = useRef(product.image);
  if (prevImageRef.current !== product.image) {
    prevImageRef.current = product.image;
    setImgError(false);
  }
  const sourceBadge = SOURCE_BADGE[product.source] ?? { label: product.source, color: "bg-gray-100 text-gray-600" };
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
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer"
      onClick={handleCardAreaClick}
    >
      {/* 画像: 幅100%・高さ200px固定・object-cover */}
      <div className="relative h-[200px] flex-shrink-0 bg-gray-50">
        {product.image && !imgError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 33vw"
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
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur shadow-sm transition"
          aria-label={fav ? "お気に入り解除" : "お気に入り追加"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fav ? "#EF4444" : "none"} stroke={fav ? "#EF4444" : "#9CA3AF"} strokeWidth={1.8} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        {/* ソースバッジ */}
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sourceBadge.color}`}>
          {sourceBadge.label}
        </span>
        {/* ベルボタン（価格アラート） */}
        <button
          onClick={(e) => { e.stopPropagation(); setAlertOpen(true); }}
          className="absolute bottom-2 left-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white transition"
          aria-label="価格アラートを設定"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="#9CA3AF" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </button>

        {/* バッジ（badge prop 優先、なければスコア点数） */}
        {badge ? (
          <span className={`absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow ${
            badge.startsWith("⭐") ? "bg-yellow-400 text-white" :
            badge.startsWith("💰") ? "bg-green-500 text-white" :
            "bg-sky-500 text-white"
          }`}>
            {badge}
          </span>
        ) : product.score !== undefined ? (
          <span className={`absolute bottom-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full shadow ${
            product.score >= 80 ? "bg-yellow-400 text-white" :
            product.score >= 60 ? "bg-blue-500 text-white" :
            "bg-gray-400 text-white"
          }`}>
            {product.score}点
          </span>
        ) : null}
      </div>

      {/* テキスト情報 */}
      <div className="p-3 flex flex-col flex-1">
        {/* 商品名: 2行固定 */}
        <p
          className="text-sm font-medium text-gray-800 leading-snug"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "2.5rem",
          }}
        >
          {product.name}
        </p>

        {reason && (
          <p className="text-[11px] text-sky-600 bg-sky-50 rounded-lg px-2 py-1 leading-snug mt-1.5">
            {reason}
          </p>
        )}
        {!reason && product.reason && (
          <p className="text-[11px] text-gray-500 mt-1.5 leading-snug flex items-start gap-1">
            <span>💬</span><span>{product.reason}</span>
          </p>
        )}
        {!reason && !product.reason && product.scoreReason && (
          <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{product.scoreReason}</p>
        )}

        {/* 価格・評価エリア: カード下部に固定配置 */}
        <div className="mt-auto pt-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <StarRating rating={product.rating} />
            <span className="text-[11px] text-gray-400">({product.reviewCount})</span>
          </div>
          <p className="text-base font-bold text-gray-900">
            ¥{product.price.toLocaleString()}
          </p>
          <button
            onClick={handlePurchaseClick}
            className="w-full text-center text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 transition rounded-xl py-2"
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
            className="w-full text-center text-xs font-medium text-white bg-[#FF9900] hover:bg-[#e68a00] transition rounded-xl py-2"
          >
            Amazonで探す
          </button>

          {onCompare && (
            <button
              onClick={(e) => { e.stopPropagation(); onCompare(product); }}
              disabled={compareDisabled && !isComparing}
              className={`w-full text-center text-xs font-medium rounded-xl py-1.5 border transition ${
                isComparing
                  ? "bg-sky-50 border-sky-400 text-sky-600"
                  : compareDisabled
                  ? "border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50"
                  : "border-gray-200 text-gray-500 hover:border-sky-400 hover:text-sky-600"
              }`}
            >
              {isComparing ? "✓ 比較中" : "＋ 比較する"}
            </button>
          )}
        </div>
      </div>
    </div>
    <PriceAlertModal
      product={product}
      isOpen={alertOpen}
      onClose={() => setAlertOpen(false)}
    />
    </>
  );
}
