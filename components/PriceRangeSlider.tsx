"use client"
import { useState, useEffect, useRef } from "react"
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
  const [dragging, setDragging] = useState<"min" | "max" | null>(null)

  const trackRef = useRef<HTMLDivElement>(null)
  // refs でクロージャ内の最新値を参照
  const draggingRef = useRef<"min" | "max" | null>(null)
  const sliderMinRef = useRef(sliderMin)
  const sliderMaxRef = useRef(sliderMax)
  const globalMinRef = useRef(globalMin)
  const globalMaxRef = useRef(globalMax)
  const onChangeRef = useRef(onChange)

  sliderMinRef.current = sliderMin
  sliderMaxRef.current = sliderMax
  globalMinRef.current = globalMin
  globalMaxRef.current = globalMax
  onChangeRef.current = onChange

  useEffect(() => {
    setSliderMin(minPrice ?? globalMin)
    setSliderMax(maxPrice ?? globalMax)
  }, [minPrice, maxPrice, globalMin, globalMax])

  // グローバルドラッグイベントを1回だけ登録
  useEffect(() => {
    const getVal = (clientX: number) => {
      const el = trackRef.current
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const gMin = globalMinRef.current
      const gMax = globalMaxRef.current
      const step = Math.max(1, Math.round((gMax - gMin) / 100))
      return Math.round((gMin + (gMax - gMin) * pct) / step) * step
    }

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return
      if (e.cancelable) e.preventDefault()
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const val = getVal(clientX)
      const gMin = globalMinRef.current
      const gMax = globalMaxRef.current

      if (draggingRef.current === "min") {
        const next = Math.min(val, sliderMaxRef.current - 1)
        setSliderMin(next)
        onChangeRef.current(next === gMin ? null : next, sliderMaxRef.current === gMax ? null : sliderMaxRef.current)
      } else {
        const next = Math.max(val, sliderMinRef.current + 1)
        setSliderMax(next)
        onChangeRef.current(sliderMinRef.current === gMin ? null : sliderMinRef.current, next === gMax ? null : next)
      }
    }

    const onEnd = () => {
      if (!draggingRef.current) return
      draggingRef.current = null
      setDragging(null)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("touchmove", onMove, { passive: false })
    window.addEventListener("mouseup", onEnd)
    window.addEventListener("touchend", onEnd)

    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("mouseup", onEnd)
      window.removeEventListener("touchend", onEnd)
    }
  }, [])

  if (!allPrices.length) return null

  const range = globalMax - globalMin
  const ratio = range === 0 ? 0 : 1 / range

  const priceDistribution = range === 0 ? [] : Array.from({ length: 20 }, (_, i) => {
    const lo = globalMin + (range / 20) * i
    const hi = globalMin + (range / 20) * (i + 1)
    return {
      count: allPrices.filter((p) => p >= lo && p < hi).length,
      price: Math.round((lo + hi) / 2),
    }
  })
  const maxCount = Math.max(...priceDistribution.map((b) => b.count), 1)

  const minPct = (sliderMin - globalMin) * ratio * 100
  const maxPct = (sliderMax - globalMin) * ratio * 100

  const startDrag = (which: "min" | "max") => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    draggingRef.current = which
    setDragging(which)
  }

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
                transition: "background 0.15s",
              }}
            />
          ))}
        </div>
      )}

      {/* スライダー */}
      <div
        ref={trackRef}
        style={{ position: "relative", height: "40px", userSelect: "none" }}
      >
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
          {/* 選択範囲ハイライト */}
          <div
            style={{
              position: "absolute",
              left: `${minPct}%`,
              right: `${100 - maxPct}%`,
              height: "100%",
              background: "#1a1a1a",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* 最小値ハンドル */}
        <div
          onMouseDown={startDrag("min")}
          onTouchStart={startDrag("min")}
          style={{
            position: "absolute",
            top: "50%",
            left: `${minPct}%`,
            transform: "translate(-50%, -50%)",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "white",
            border: dragging === "min" ? "3px solid #1a1a1a" : "2px solid #1a1a1a",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            cursor: dragging === "min" ? "grabbing" : "grab",
            touchAction: "none",
            zIndex: 2,
          }}
        />

        {/* 最大値ハンドル */}
        <div
          onMouseDown={startDrag("max")}
          onTouchStart={startDrag("max")}
          style={{
            position: "absolute",
            top: "50%",
            left: `${maxPct}%`,
            transform: "translate(-50%, -50%)",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "white",
            border: dragging === "max" ? "3px solid #1a1a1a" : "2px solid #1a1a1a",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            cursor: dragging === "max" ? "grabbing" : "grab",
            touchAction: "none",
            zIndex: 2,
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
