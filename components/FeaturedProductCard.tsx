"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/product";

const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
  rakuten: { label: "楽天市場", color: "#BF0000" },
  yahoo:   { label: "Yahoo!", color: "#FF0033" },
  amazon:  { label: "Amazon", color: "#FF9900" },
};

export default function FeaturedProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const prevImageRef = useRef(product.image);
  if (prevImageRef.current !== product.image) {
    prevImageRef.current = product.image;
    setImgError(false);
  }

  const src = SOURCE_LABEL[product.source] ?? { label: product.source, color: "#888" };

  function handleClick() {
    try {
      localStorage.setItem(`product_cache_${product.id}`, JSON.stringify(product));
    } catch {
      // noop
    }
    router.push(`/product/${product.id}`);
  }

  return (
    <div
      onClick={handleClick}
      style={{
        background: "white",
        borderRadius: "16px",
        border: "1.5px solid #c8a96e",
        boxShadow: "0 4px 16px rgba(200,169,110,0.15)",
        overflow: "hidden",
        marginBottom: "12px",
        display: "flex",
        cursor: "pointer",
      }}
    >
      {/* 画像（左半分） */}
      <div
        style={{
          position: "relative",
          width: "45%",
          flexShrink: 0,
          minHeight: "160px",
          background: "#f3f4f6",
        }}
      >
        {product.image && !imgError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            style={{ objectFit: "cover" }}
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d1d5db",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" style={{ width: 40, height: 40 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
        {/* Navi's Pick ラベル */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            background: "#c8a96e",
            color: "white",
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          Navi&apos;s Pick
        </div>
      </div>

      {/* 情報（右半分） */}
      <div
        style={{
          flex: 1,
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minWidth: 0,
        }}
      >
        {/* ソースバッジ */}
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: src.color,
          }}
        >
          {src.label}
        </span>

        {/* 商品名 */}
        <p
          style={{
            fontSize: "14px",
            fontWeight: 600,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            margin: "6px 0",
            color: "#1a1a1a",
          }}
        >
          {product.name}
        </p>

        {/* 評価 */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ color: "#f59e0b", fontSize: "12px" }}>
            {"★".repeat(Math.min(5, Math.round(product.rating)))}
          </span>
          <span style={{ fontSize: "11px", color: "#888" }}>
            ({product.reviewCount.toLocaleString()})
          </span>
        </div>

        {/* 価格 */}
        <p
          style={{
            fontSize: "18px",
            fontWeight: 800,
            color: "#cc0000",
            marginTop: "4px",
          }}
        >
          ¥{product.price.toLocaleString()}
        </p>

        {/* 購入ボタン */}
        <div
          style={{
            marginTop: "8px",
            padding: "10px",
            background: "#1a1a1a",
            color: "white",
            borderRadius: "8px",
            textAlign: "center",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          詳細を見る
        </div>
      </div>
    </div>
  );
}
