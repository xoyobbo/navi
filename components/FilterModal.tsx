"use client"
import { useState, useEffect } from "react"
import { extractBrands } from "@/lib/brand-extractor"
import PriceRangeSlider from "@/components/PriceRangeSlider"
import type { Product } from "@/types/product"

export interface FilterState {
  minPrice: number | null
  maxPrice: number | null
  selectedBrands: string[]
  selectedFeatures: string[]
  sortBy: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: FilterState) => void
  currentFilters: FilterState
  products: Product[]
}

export default function FilterModal({
  isOpen,
  onClose,
  onApply,
  currentFilters,
  products,
}: Props) {
  const [filters, setFilters] = useState<FilterState>(currentFilters)

  useEffect(() => {
    if (isOpen) {
      setFilters(currentFilters)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const extractedBrands = extractBrands(products)

  if (!isOpen) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }}
      />

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "90dvh",
          background: "white",
          borderRadius: "20px 20px 0 0",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #e8e8e4",
          }}
        >
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "16px", color: "#888", cursor: "pointer", padding: "4px 8px" }}
          >
            ✕
          </button>
          <h2 style={{ fontSize: "16px", fontWeight: "700" }}>絞り込み</h2>
          <button
            onClick={() => {
              setFilters({ minPrice: null, maxPrice: null, selectedBrands: [], selectedFeatures: [], sortBy: "standard" })
            }}
            style={{ background: "none", border: "none", fontSize: "13px", color: "#c8a96e", cursor: "pointer", fontWeight: "600" }}
          >
            リセット
          </button>
        </div>

        {/* スクロールエリア */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* 価格帯 */}
          <section style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "16px", color: "#1a1a1a" }}>価格帯</h3>
            <PriceRangeSlider
              products={products}
              minPrice={filters.minPrice}
              maxPrice={filters.maxPrice}
              onChange={(min, max) => setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }))}
            />
          </section>

          {/* 並び替え */}
          <section style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>並び替え</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "おすすめ順", value: "standard" },
                { label: "総合評価順", value: "total_score" },
                { label: "価格が安い順", value: "price_asc" },
                { label: "価格が高い順", value: "price_desc" },
                { label: "評価が高い順", value: "rating" },
              ].map((sort) => (
                <button
                  key={sort.value}
                  onClick={() => setFilters((prev) => ({ ...prev, sortBy: sort.value }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    border: "1px solid",
                    borderColor: filters.sortBy === sort.value ? "#1a1a1a" : "#e8e8e4",
                    borderRadius: "8px",
                    background: filters.sortBy === sort.value ? "#f5f5f5" : "white",
                    fontSize: "14px",
                    cursor: "pointer",
                    color: "#1a1a1a",
                    fontWeight: filters.sortBy === sort.value ? "600" : "400",
                  }}
                >
                  <span>{sort.label}</span>
                  {filters.sortBy === sort.value && (
                    <span style={{ color: "#1a1a1a", fontWeight: "700" }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* ブランド */}
          {extractedBrands.length > 0 && (
            <section style={{ marginBottom: "32px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>ブランド</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {extractedBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        selectedBrands: prev.selectedBrands.includes(brand)
                          ? prev.selectedBrands.filter((b) => b !== brand)
                          : [...prev.selectedBrands, brand],
                      }))
                    }
                    style={{
                      padding: "8px 16px",
                      border: "1px solid",
                      borderColor: filters.selectedBrands.includes(brand) ? "#1a1a1a" : "#e8e8e4",
                      borderRadius: "20px",
                      background: filters.selectedBrands.includes(brand) ? "#1a1a1a" : "white",
                      color: filters.selectedBrands.includes(brand) ? "white" : "#1a1a1a",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 適用ボタン（固定） */}
        <div
          style={{
            padding: "16px 20px",
            paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
            borderTop: "1px solid #e8e8e4",
            background: "white",
          }}
        >
          <button
            onClick={() => {
              onApply(filters)
              onClose()
            }}
            style={{
              width: "100%",
              padding: "16px",
              background: "#1a1a1a",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            この条件で絞り込む
          </button>
        </div>
      </div>
    </>
  )
}
