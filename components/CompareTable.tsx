"use client";

import Image from "next/image";
import type { Product } from "@/types/product";

type Props = {
  products: Product[];
  summary: string;
  recommendation: string;
};

const SOURCE_LABEL: Record<string, string> = {
  rakuten: "楽天",
  yahoo: "Yahoo!",
  amazon: "Amazon",
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
          fill={rating >= s ? "#FBBF24" : rating >= s - 0.5 ? "#FCD34D" : "#E5E7EB"}
          className="w-3 h-3">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function CompareTable({ products, summary, recommendation }: Props) {
  const minPrice = Math.min(...products.map((p) => p.price));
  const maxRating = Math.max(...products.map((p) => p.rating));
  const maxScore = Math.max(...products.map((p) => p.score ?? 0));

  const labelCell = "py-3 px-3 text-xs font-semibold text-gray-500 bg-gray-50 whitespace-nowrap text-left border-b border-gray-100";
  const dataCell = "py-3 px-3 text-center align-middle border-b border-gray-100 text-sm";

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white w-full">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <colgroup>
            <col className="w-20" />
            {products.map((p) => (
              <col key={p.id} className={p.score === maxScore ? "bg-sky-50" : ""} />
            ))}
          </colgroup>

          {/* ヘッダー */}
          <thead>
            <tr>
              <th className="py-2 px-3 bg-gray-50 text-xs text-gray-400 font-normal text-left border-b border-gray-200">
                項目
              </th>
              {products.map((p, i) => (
                <th
                  key={p.id}
                  className={`py-2 px-3 text-center text-xs font-bold border-b border-gray-200 ${
                    p.score === maxScore ? "bg-sky-100 text-sky-700" : "bg-gray-50 text-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>商品{String.fromCharCode(65 + i)}</span>
                    {p.score === maxScore && (
                      <span className="bg-sky-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">おすすめ</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* 画像 */}
            <tr>
              <td className={labelCell}>画像</td>
              {products.map((p) => (
                <td key={p.id} className={`${dataCell} ${p.score === maxScore ? "bg-sky-50/50" : ""}`}>
                  <div className="relative w-16 h-16 mx-auto rounded-lg overflow-hidden bg-gray-100">
                    {p.image ? (
                      <Image src={p.image} alt={p.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300 text-xs">No image</div>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* 商品名 */}
            <tr>
              <td className={labelCell}>商品名</td>
              {products.map((p) => (
                <td key={p.id} className={`${dataCell} ${p.score === maxScore ? "bg-sky-50/50" : ""}`}>
                  <p className="text-xs text-gray-700 line-clamp-3 text-left">{p.name}</p>
                </td>
              ))}
            </tr>

            {/* 価格 */}
            <tr>
              <td className={labelCell}>価格</td>
              {products.map((p) => (
                <td key={p.id} className={`${dataCell} ${p.score === maxScore ? "bg-sky-50/50" : ""}`}>
                  <span className="font-bold text-gray-900">¥{p.price.toLocaleString()}</span>
                  {p.price === minPrice && (
                    <span className="ml-1 bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">最安</span>
                  )}
                </td>
              ))}
            </tr>

            {/* 総合スコア */}
            <tr>
              <td className={labelCell}>スコア</td>
              {products.map((p) => (
                <td key={p.id} className={`${dataCell} ${p.score === maxScore ? "bg-sky-50/50" : ""}`}>
                  {p.score !== undefined ? (
                    <span className={`font-bold text-base ${
                      p.score >= 90 ? "text-yellow-500" :
                      p.score >= 80 ? "text-blue-500" :
                      p.score >= 70 ? "text-green-500" : "text-gray-400"
                    }`}>
                      {p.score}点
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* 評価 */}
            <tr>
              <td className={labelCell}>評価</td>
              {products.map((p) => (
                <td key={p.id} className={`${dataCell} ${p.score === maxScore ? "bg-sky-50/50" : ""}`}>
                  <Stars rating={p.rating} />
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className="text-xs font-semibold text-gray-700">{p.rating.toFixed(1)}</span>
                    {p.rating === maxRating && p.rating > 0 && (
                      <span className="bg-yellow-100 text-yellow-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">高評価</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* レビュー件数 */}
            <tr>
              <td className={labelCell}>レビュー数</td>
              {products.map((p) => (
                <td key={p.id} className={`${dataCell} text-gray-600 ${p.score === maxScore ? "bg-sky-50/50" : ""}`}>
                  {p.reviewCount.toLocaleString()}件
                </td>
              ))}
            </tr>

            {/* 購入元 */}
            <tr>
              <td className={labelCell}>購入元</td>
              {products.map((p) => (
                <td key={p.id} className={`${dataCell} ${p.score === maxScore ? "bg-sky-50/50" : ""}`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    p.source === "rakuten" ? "bg-red-50 text-red-600" :
                    p.source === "yahoo" ? "bg-purple-50 text-purple-600" :
                    "bg-orange-50 text-orange-600"
                  }`}>
                    {SOURCE_LABEL[p.source] ?? p.source}
                  </span>
                </td>
              ))}
            </tr>

            {/* 購入ボタン */}
            <tr>
              <td className={`${labelCell} border-b-0`}>購入</td>
              {products.map((p) => (
                <td key={p.id} className={`py-3 px-3 border-b-0 ${p.score === maxScore ? "bg-sky-50/50" : ""}`}>
                  <a
                    href={p.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`block text-center text-xs font-medium py-1.5 rounded-lg transition ${
                      p.score === maxScore
                        ? "bg-sky-500 hover:bg-sky-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    購入する
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* AI総評 */}
      <div className="border-t border-gray-100 p-4 bg-gradient-to-r from-sky-50 to-white">
        <div className="flex items-center gap-1.5 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0EA5E9" className="w-4 h-4">
            <path d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <span className="text-xs font-bold text-sky-600">Naviの総評</span>
        </div>
        {summary && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{summary}</p>}
        {recommendation && (
          <p className="mt-2 text-xs font-semibold text-sky-700 bg-sky-100 rounded-lg px-3 py-2">
            {recommendation}
          </p>
        )}
      </div>
    </div>
  );
}
