"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/product";

const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
  rakuten: { label: "楽天市場", color: "var(--navi-rakuten)" },
  yahoo:   { label: "Yahoo!", color: "var(--navi-yahoo)" },
  amazon:  { label: "Amazon", color: "var(--navi-amazon)" },
};

export default function FeaturedProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const prevImageRef = useRef(product.image);
  if (prevImageRef.current !== product.image) {
    prevImageRef.current = product.image;
    setImgError(false);
  }

  const src = SOURCE_LABEL[product.source] ?? { label: product.source, color: "var(--navi-text-hint)" };

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
        background: "var(--navi-bg-card)",
        borderRadius: "var(--navi-radius-md)",
        border: "0.5px solid var(--navi-gold)",
        overflow: "hidden",
        marginBottom: "12px",
        display: "flex",
        height: "160px",
        cursor: "pointer",
      }}
    >
      {/* ゴールドのアクセントライン */}
      <div style={{
        width: "3px",
        background: "var(--navi-gold)",
        flexShrink: 0,
      }} />

      {/* 画像 */}
      <div style={{
        position: "relative",
        width: "157px",
        height: "160px",
        flexShrink: 0,
        background: "#fafaf8",
      }}>
        {product.image && !imgError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            style={{ objectFit: "contain" }}
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--navi-text-hint)",
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" style={{ width: 40, height: 40 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
        {/* Navi's Pick ラベル */}
        <span style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          background: "var(--navi-gold)",
          color: "#1a0e00",
          fontSize: "9px",
          fontWeight: "700",
          padding: "2px 7px",
          borderRadius: "4px",
          letterSpacing: "0.08em",
        }}>
          PICK
        </span>
      </div>

      {/* 情報エリア */}
      <div style={{
        flex: 1,
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minWidth: 0,
      }}>
        {/* ソース */}
        <span style={{
          fontSize: "10px",
          fontWeight: "600",
          color: src.color,
          letterSpacing: "0.03em",
        }}>
          {src.label}
        </span>

        {/* 商品名 */}
        <p style={{
          fontSize: "13px",
          lineHeight: "1.5",
          color: "var(--navi-text)",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          fontWeight: "400",
          letterSpacing: "0.01em",
        }}>
          {product.name}
        </p>

        {/* 価格＋ボタン */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{
            fontSize: "17px",
            fontWeight: "700",
            color: "var(--navi-price)",
            letterSpacing: "-0.01em",
          }}>
            ¥{product.price.toLocaleString()}
          </p>
          <div style={{
            padding: "6px 12px",
            background: "var(--navi-black)",
            color: "white",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "0.03em",
          }}>
            詳細
          </div>
        </div>
      </div>
    </div>
  );
}
