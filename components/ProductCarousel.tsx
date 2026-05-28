"use client";

import { useRef, useState } from "react";
import type { Product } from "@/types/product";
import ProductCard from "./ProductCard";

interface Props {
  products: Product[];
  getBadge: (product: Product, absoluteIndex: number) => string;
}

const ITEMS_PER_PAGE = 4;

export default function ProductCarousel({ products, getBadge }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const currentProducts = products.slice(
    currentIndex * ITEMS_PER_PAGE,
    (currentIndex + 1) * ITEMS_PER_PAGE
  );

  const goNext = () => {
    if (currentIndex < totalPages - 1) setCurrentIndex((i) => i + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  return (
    <div className="w-full">
      {/* ページ数 + ドット */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-400">
          {currentIndex + 1} / {totalPages}ページ（全{products.length}件）
        </span>
        <div className="flex gap-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition ${
                i === currentIndex ? "bg-gray-800" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 商品グリッド（タッチスワイプ対応） */}
      <div
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (diff > 50) goNext();
          if (diff < -50) goPrev();
        }}
        className="grid grid-cols-2 gap-3"
      >
        {currentProducts.map((product, i) => {
          const absoluteIndex = currentIndex * ITEMS_PER_PAGE + i;
          return (
            <ProductCard
              key={product.id}
              product={product}
              badge={getBadge(product, absoluteIndex)}
            />
          );
        })}
      </div>

      {/* 前へ・次へボタン */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className={`flex-1 py-2.5 rounded-xl border text-sm transition ${
            currentIndex === 0
              ? "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed"
              : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
          }`}
        >
          ← 前の商品
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex === totalPages - 1}
          className={`flex-1 py-2.5 rounded-xl border text-sm transition ${
            currentIndex === totalPages - 1
              ? "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed"
              : "border-gray-900 text-white bg-gray-900 hover:bg-gray-700"
          }`}
        >
          次の商品 →
        </button>
      </div>
    </div>
  );
}
