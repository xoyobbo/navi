"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  images: string[];
  alt: string;
};

export default function ImageSlider({ images, alt }: Props) {
  const safeImages = images.length > 0 ? images : ["/images/no-image.png"];
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  // 重複URLを検出（2枚目以降の同一URLを duplicate とみなす）
  const seenUrls = new Set<string>();
  const isDuplicate = safeImages.map((url) => {
    if (seenUrls.has(url)) return true;
    seenUrls.add(url);
    return false;
  });

  function prev() {
    setCurrent((c) => (c - 1 + safeImages.length) % safeImages.length);
  }
  function next() {
    setCurrent((c) => (c + 1) % safeImages.length);
  }
  function markError(i: number) {
    setImgErrors((prev) => new Set(prev).add(i));
  }

  return (
    <div>
      {/* メイン画像 */}
      <div
        className="relative aspect-square bg-[#fafaf8] select-none"
        onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const diff = touchStart - e.changedTouches[0].clientX;
          if (diff > 50) next();
          if (diff < -50) prev();
        }}
      >
        {!imgErrors.has(current) ? (
          <Image
            src={safeImages[current]}
            alt={`${alt} ${current + 1}`}
            fill
            className="object-contain p-6"
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
            onError={() => markError(current)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-20 h-20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}

        {/* 矢印ボタン */}
        {safeImages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white transition"
              aria-label="前の画像"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white transition"
              aria-label="次の画像"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}

        {/* ドットインジケーター */}
        {safeImages.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {safeImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === current ? "bg-gray-800 w-3" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* サムネイル */}
      {safeImages.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto px-3 py-2"
          style={{ scrollbarWidth: "none" }}
        >
          {safeImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${
                i === current ? "border-gray-900" : "border-gray-100"
              } ${
                isDuplicate[i]
                  ? "opacity-40 hover:opacity-60"
                  : i !== current
                  ? "opacity-60 hover:opacity-100"
                  : ""
              }`}
            >
              {!imgErrors.has(i) ? (
                <Image
                  src={img}
                  alt={`${alt} ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                  onError={() => markError(i)}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 text-gray-300 text-[10px]">
                  NG
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
