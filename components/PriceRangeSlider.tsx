"use client"
import { useState, useEffect } from "react"
import type { Product } from "@/types/product"

interface Props {
  products: Product[]
  minPrice: number | null
  maxPrice: number | null
  onChange: (min: number | null, max: number | null) => void
}

export default function PriceRangeSlider({ products, minPrice, maxPrice, onChange }: Props) {
  const allPrices = products.map((p) => p.price).filter((p) => p > 0)
  const globalMin = allPrices.length ? Math.min(...allPrices) : 0
  const globalMax = allPrices.length ? Math.max(...allPrices) : 100000

  const [sliderMin, setSliderMin] = useState(minPrice ?? globalMin)
  const [sliderMax, setSliderMax] = useState(maxPrice ?? globalMax)

  useEffect(() => {
    setSliderMin(minPrice ?? globalMin)
    setSliderMax(maxPrice ?? globalMax)
  }, [minPrice, maxPrice, globalMin, globalMax])

  if (!allPrices.length) return null

  const range = globalMax - globalMin
  const ratio = range === 0 ? 0 : 1 / range
  const step = Math.max(1, Math.round(range / 100))

  const priceDistribution = range === 0 ? [] : Array.from({ length: 20 }, (_, i) => {
    const bucketMin = globalMin + (range / 20) * i
    const bucketMax = globalMin + (range / 20) * (i + 1)
    return {
      count: allPrices.filter((p) => p >= bucketMin && p < bucketMax).length,
      price: Math.round((bucketMin + bucketMax) / 2),
    }
  })

  const maxCount = Math.max(...priceDistribution.map((b) => b.count), 1)

  return (
    <div>
      {/* 価格表示 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a1a" }}>
          ¥{sliderMin.toLocaleString()}
        </span>
        <span style={{ fontSize: "13px", color: "#888" }}>〜</span>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a1a" }}>
          ¥{sliderMax.toLocaleString()}
        </span>
      </div>

      {/* 棒グラフ */}
      {priceDistribution.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "60px", marginBottom: "4px" }}>
          {priceDistribution.map((bucket, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${(bucket.count / maxCount) * 100}%`,
                minHeight: "2px",
                background: bucket.price >= sliderMin && bucket.price <= sliderMax ? "#1a1a1a" : "#e8e8e4",
                borderRadius: "2px 2px 0 0",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>
      )}

      {/* レンジスライダー */}
      <div style={{ position: "relative", height: "40px" }}>
        {/* トラック */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: "4px",
            background: "#e8e8e4",
            borderRadius: "2px",
            transform: "translateY(-50%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: `${(sliderMin - globalMin) * ratio * 100}%`,
              right: `${(1 - (sliderMax - globalMin) * ratio) * 100}%`,
              height: "100%",
              background: "#1a1a1a",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* 最小値スライダー（透明） */}
        <input
          type="range"
          min={globalMin}
          max={globalMax}
          step={step}
          value={sliderMin}
          onChange={(e) => {
            const val = Number(e.target.value)
            if (val <= sliderMax) {
              setSliderMin(val)
              onChange(val === globalMin ? null : val, sliderMax === globalMax ? null : sliderMax)
            }
          }}
          style={{
            position: "absolute",
            width: "100%",
            opacity: 0,
            height: "40px",
            cursor: "pointer",
            zIndex: sliderMin > (globalMax + globalMin) / 2 ? 3 : 2,
          }}
        />

        {/* 最大値スライダー（透明） */}
        <input
          type="range"
          min={globalMin}
          max={globalMax}
          step={step}
          value={sliderMax}
          onChange={(e) => {
            const val = Number(e.target.value)
            if (val >= sliderMin) {
              setSliderMax(val)
              onChange(sliderMin === globalMin ? null : sliderMin, val === globalMax ? null : val)
            }
          }}
          style={{
            position: "absolute",
            width: "100%",
            opacity: 0,
            height: "40px",
            cursor: "pointer",
            zIndex: sliderMin > (globalMax + globalMin) / 2 ? 2 : 3,
          }}
        />

        {/* 最小値ハンドル */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${(sliderMin - globalMin) * ratio * 100}%`,
            transform: "translate(-50%, -50%)",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "white",
            border: "2px solid #1a1a1a",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* 最大値ハンドル */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${(sliderMax - globalMin) * ratio * 100}%`,
            transform: "translate(-50%, -50%)",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "white",
            border: "2px solid #1a1a1a",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      </div>

      {/* クイック選択 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
        {[
          { label: "〜1万円", min: 0, max: 10000 },
          { label: "1〜3万円", min: 10000, max: 30000 },
          { label: "3〜5万円", min: 30000, max: 50000 },
          { label: "5万円〜", min: 50000, max: globalMax },
        ].map((r) => (
          <button
            key={r.label}
            onClick={() => {
              setSliderMin(r.min)
              setSliderMax(r.max)
              onChange(r.min === 0 ? null : r.min, r.max === globalMax ? null : r.max)
            }}
            style={{
              padding: "6px 14px",
              border: "1px solid #e8e8e4",
              borderRadius: "20px",
              background: "white",
              fontSize: "12px",
              cursor: "pointer",
              color: "#1a1a1a",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )
}
