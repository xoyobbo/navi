"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import FeaturedProductCard from "@/components/FeaturedProductCard";
import Pagination from "@/components/Pagination";
import FilterModal, { type FilterState } from "@/components/FilterModal";
import PriceRangeSlider from "@/components/PriceRangeSlider";
import { extractBrands } from "@/lib/brand-extractor";
import { COLOR_MAP } from "@/lib/color-extractor";
import type { Product } from "@/types/product";

// ── 定数 ────────────────────────────────────────────────

const CATEGORIES = [
  { label: "家電", emoji: "📱", q: "家電" },
  { label: "ファッション", emoji: "👗", q: "ファッション" },
  { label: "美容・コスメ", emoji: "💄", q: "美容 コスメ" },
  { label: "食品・飲料", emoji: "🍱", q: "食品" },
  { label: "スポーツ", emoji: "⚽", q: "スポーツ用品" },
  { label: "本・雑誌", emoji: "📚", q: "本 雑誌" },
  { label: "ゲーム", emoji: "🎮", q: "ゲーム" },
  { label: "インテリア", emoji: "🛋️", q: "インテリア 家具" },
  { label: "ベビー", emoji: "👶", q: "ベビー用品" },
  { label: "ペット", emoji: "🐾", q: "ペット用品" },
];

const SORT_OPTIONS = [
  { label: "おすすめ順", value: "standard" },
  { label: "総合評価順", value: "total_score" },
  { label: "口コミが多い順", value: "review_count_desc" },
  { label: "評価順", value: "rating" },
  { label: "価格が安い順", value: "price_asc" },
  { label: "価格が高い順", value: "price_desc" },
];

const PRICE_RANGES = [
  { label: "指定なし", value: "" },
  { label: "〜1,000円", value: "~1000" },
  { label: "1,000〜3,000円", value: "1000~3000" },
  { label: "3,000〜5,000円", value: "3000~5000" },
  { label: "5,000〜10,000円", value: "5000~10000" },
  { label: "10,000〜30,000円", value: "10000~30000" },
  { label: "30,000円〜", value: "30000~" },
];

const FEATURE_KEYWORDS = [
  "防水", "ワイヤレス", "Bluetooth", "充電", "軽量",
  "速乾", "撥水", "UV", "高耐久", "折りたたみ",
  "保温", "冷感", "消臭", "ストレッチ", "防風",
  "ノイズキャンセリング", "防塵", "耐衝撃", "吸汗", "抗菌",
  "急速充電", "長時間", "静音", "省エネ", "低反発",
  "4K", "8K", "有機EL", "防曇", "防臭",
];

const MATERIAL_KEYWORDS = [
  "シルク", "コットン", "ナイロン", "ポリエステル", "レザー",
  "メッシュ", "ウール", "綿", "麻", "ステンレス",
  "アルミ", "木製", "ゴム", "シリコン",
];

const COLOR_KEYWORDS = Object.keys(COLOR_MAP).concat(["黒", "白", "赤", "青", "緑", "茶"]);

const scrollHide: React.CSSProperties = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

// ── ユーティリティ ────────────────────────────────────────

function parseRange(range: string): { min?: number; max?: number } {
  const map: Record<string, { min?: number; max?: number }> = {
    "~1000":       { min: 0,     max: 1000 },
    "1000~3000":   { min: 1000,  max: 3000 },
    "3000~5000":   { min: 3000,  max: 5000 },
    "5000~10000":  { min: 5000,  max: 10000 },
    "10000~30000": { min: 10000, max: 30000 },
    "30000~":      { min: 30000 },
  };
  return map[range] ?? {};
}

function buildApiUrl(q: string, page: number, priceRange: string): string {
  const params = new URLSearchParams({ q, page: String(page) });
  const { min, max } = parseRange(priceRange);
  if (min !== undefined) params.set("minPrice", String(min));
  if (max !== undefined) params.set("maxPrice", String(max));
  return `/api/rakuten?${params.toString()}`;
}

function applySortLocal(products: Product[], sort: string): Product[] {
  switch (sort) {
    case "price_asc":         return [...products].sort((a, b) => a.price - b.price);
    case "price_desc":        return [...products].sort((a, b) => b.price - a.price);
    case "rating":            return [...products].sort((a, b) => b.rating - a.rating);
    case "review_count_desc": return [...products].sort((a, b) => b.reviewCount - a.reviewCount);
    case "total_score":       return [...products].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    default:                  return products;
  }
}

// ── スケルトン ────────────────────────────────────────────

function CardSkeleton() {
  return <div className="w-40 shrink-0 h-64 bg-white rounded-2xl animate-pulse border border-gray-100" />;
}

function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />
      ))}
    </div>
  );
}

// ── チェックリスト（サイドバー共通） ────────────────────────

function CheckList({
  title, items, selected, onToggle,
}: {
  title: string;
  items: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">{title}</h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <label key={item} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.includes(item)}
              onChange={() => onToggle(item)}
              className="w-4 h-4 rounded border-gray-300 accent-gray-900"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── サイドバー ────────────────────────────────────────────

function Sidebar({
  products, minPrice, maxPrice, onPriceChange,
  brands, selectedBrands, onBrandToggle,
  colors, selectedColors, onColorToggle,
  materials, selectedMaterials, onMaterialToggle,
  features, selectedFeatures, onFeatureToggle,
  onReset,
}: {
  products: Product[];
  minPrice: number | null;
  maxPrice: number | null;
  onPriceChange: (min: number | null, max: number | null) => void;
  brands: string[];
  selectedBrands: string[];
  onBrandToggle: (b: string) => void;
  colors: string[];
  selectedColors: string[];
  onColorToggle: (c: string) => void;
  materials: string[];
  selectedMaterials: string[];
  onMaterialToggle: (m: string) => void;
  features: string[];
  selectedFeatures: string[];
  onFeatureToggle: (f: string) => void;
  onReset: () => void;
}) {
  const hasFilters =
    minPrice !== null ||
    maxPrice !== null ||
    selectedBrands.length > 0 ||
    selectedColors.length > 0 ||
    selectedMaterials.length > 0 ||
    selectedFeatures.length > 0;

  const hasPrices = products.some((p) => p.price > 0);

  return (
    <div className="px-3 pt-3 pb-4 space-y-5">
      {/* 価格帯 - 価格データがある場合のみ表示 */}
      {hasPrices && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">価格帯</h3>
          <PriceRangeSlider
            products={products}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onChange={onPriceChange}
          />
        </div>
      )}

      {/* ブランド */}
      <CheckList title="ブランド" items={brands} selected={selectedBrands} onToggle={onBrandToggle} />

      {/* 色 */}
      {colors.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">カラー</h3>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((color) => {
              const hex = COLOR_MAP[color];
              const isSelected = selectedColors.includes(color);
              return (
                <button
                  key={color}
                  onClick={() => onColorToggle(color)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition ${
                    isSelected
                      ? "border-gray-800 bg-gray-100 font-semibold text-gray-900"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {hex && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: hex,
                        border: "1px solid rgba(0,0,0,0.15)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 素材 */}
      <CheckList title="素材" items={materials} selected={selectedMaterials} onToggle={onMaterialToggle} />

      {/* 機能 */}
      <CheckList title="機能・特徴" items={features} selected={selectedFeatures} onToggle={onFeatureToggle} />

      {hasFilters && (
        <button
          onClick={onReset}
          className="w-full text-xs text-gray-500 border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition"
        >
          絞り込みリセット
        </button>
      )}
    </div>
  );
}

// ── 横スクロールセクション ────────────────────────────────

function HScrollSection({
  title, query = "", products, loading,
}: {
  title: string; query?: string; products: Product[]; loading: boolean;
}) {
  const router = useRouter();
  return (
    <section className="bg-white shadow-sm py-4">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        {query && (
          <button
            onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
            className="text-xs text-sky-500 font-medium shrink-0"
          >
            もっと見る →
          </button>
        )}
      </div>
      <div className="overflow-x-auto px-4 min-w-0" style={scrollHide}>
        <div className="flex gap-3 pb-2" style={{ width: "max-content" }}>
          {loading
            ? [...Array(4)].map((_, i) => <CardSkeleton key={i} />)
            : products.map((p) => (
                <div key={p.id} className="w-40 shrink-0">
                  <ProductCard product={p} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

// ── トップブラウズ ────────────────────────────────────────

type PersonalizedSection = { keyword: string; products: Product[] };

type TopData = {
  personalizedSections: PersonalizedSection[];
  isPersonalized: boolean;
};

const TOP_CACHE_KEY = "navi_top_products";
const TOP_CACHE_TTL = 1000 * 60 * 30;
const POPULAR_CACHE_KEY = "navi_popular";
const POPULAR_CACHE_TTL = 1000 * 60 * 60;

type DisplaySection = { keyword: string; title: string; products: Product[]; query?: string };

function toDisplaySections(sections: { keyword: string; products: Product[] }[]): DisplaySection[] {
  return sections.map((s) => ({
    keyword: s.keyword,
    title: `「${s.keyword}」のおすすめ`,
    products: s.products,
    query: s.keyword,
  }));
}

function TopBrowse() {
  const router = useRouter();
  const [sections, setSections] = useState<DisplaySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [recentHistory, setRecentHistory] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { history?: { query: string }[] }) => {
        const queries = (data.history ?? []).map((h) => h.query).filter(Boolean);
        setRecentHistory([...new Set(queries)].slice(0, 7) as string[]);
      })
      .catch(() => {});

    async function load() {
      let popularShown = false;

      try {
        const cached = sessionStorage.getItem(TOP_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached) as { data: TopData; timestamp: number };
          if (Date.now() - timestamp < TOP_CACHE_TTL && (data.personalizedSections?.length ?? 0) > 0) {
            setSections(toDisplaySections(data.personalizedSections));
            setIsPersonalized(data.isPersonalized);
            setLoading(false);
            popularShown = true;
          }
        }
      } catch {}

      if (!popularShown) {
        try {
          const cachedPop = sessionStorage.getItem(POPULAR_CACHE_KEY);
          if (cachedPop) {
            const { data, timestamp } = JSON.parse(cachedPop) as { data: { products: Product[]; title: string }; timestamp: number };
            if (Date.now() - timestamp < POPULAR_CACHE_TTL) {
              setSections([{ keyword: "_popular", title: data.title, products: data.products }]);
              setLoading(false);
              popularShown = true;
            }
          }
        } catch {}

        if (!popularShown) {
          try {
            const res = await fetch("/api/search/popular");
            const pop = await res.json() as { products: Product[]; title: string };
            setSections([{ keyword: "_popular", title: pop.title, products: pop.products ?? [] }]);
            try { sessionStorage.setItem(POPULAR_CACHE_KEY, JSON.stringify({ data: pop, timestamp: Date.now() })); } catch {}
          } catch {}
          setLoading(false);
        }
      }

      setIsPersonalizing(true);
      try {
        let personalizedSections: { keyword: string; products: Product[] }[] | null = null;
        let needsFetch = true;

        try {
          const cached = sessionStorage.getItem(TOP_CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached) as { data: TopData; timestamp: number };
            if (Date.now() - timestamp < TOP_CACHE_TTL && (data.personalizedSections?.length ?? 0) > 0) {
              personalizedSections = data.personalizedSections;
              needsFetch = false;
              fetch("/api/search/top")
                .then((r) => r.json())
                .then((fresh: TopData) => {
                  sessionStorage.setItem(TOP_CACHE_KEY, JSON.stringify({ data: fresh, timestamp: Date.now() }));
                })
                .catch(() => {});
            }
          }
        } catch {}

        if (needsFetch) {
          const res = await fetch("/api/search/top");
          const data: TopData = await res.json();
          if ((data.personalizedSections?.length ?? 0) > 0) {
            personalizedSections = data.personalizedSections;
            setIsPersonalized(data.isPersonalized);
            try {
              sessionStorage.setItem(TOP_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
            } catch {}
          }
        }

        if (personalizedSections && personalizedSections.length > 0) {
          setSections(toDisplaySections(personalizedSections));
        }
      } catch {}
      setIsPersonalizing(false);
    }

    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPersonalized = isPersonalized && sections.some((s) => s.keyword !== "_popular");

  return (
    <div className="space-y-3 pb-10 bg-[#f3f4f6]">
      <style>{`@keyframes navi-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

      {/* カテゴリアイコン */}
      <div className="bg-white px-4 py-4">
        <div className="overflow-x-auto min-w-0" style={scrollHide}>
          <div className="flex gap-4" style={{ width: "max-content" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.q}
                onClick={() => router.push(`/search?q=${encodeURIComponent(cat.q)}`)}
                className="flex flex-col items-center gap-1.5"
                style={{ minWidth: "56px" }}
              >
                <div
                  className="flex items-center justify-center rounded-full text-2xl"
                  style={{ width: "52px", height: "52px", background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                >
                  {cat.emoji}
                </div>
                <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-text-sub)", whiteSpace: "nowrap" }}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 最近の検索履歴 */}
      {recentHistory.length > 0 && (
        <div className="bg-white px-4 py-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">最近の検索</p>
          <div className="flex flex-wrap gap-2">
            {recentHistory.map((query) => (
              <button
                key={query}
                onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
                className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-100 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3 h-3 text-gray-400 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 検索履歴ベースのおすすめ */}
      {loading ? (
        <>
          {[...Array(2)].map((_, i) => (
            <HScrollSection key={i} title="人気の商品" products={[]} loading={true} />
          ))}
        </>
      ) : sections.length > 0 ? (
        <>
          {/* セクションヘッダー */}
          <div className="px-4 pt-1 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500">
              {hasPersonalized ? "検索履歴からのおすすめ" : "人気のおすすめ商品"}
            </p>
            {isPersonalizing && (
              <span style={{ fontSize: "11px", color: "#aaa", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-accent)", animation: "navi-pulse 1s infinite" }} />
                最適化中...
              </span>
            )}
          </div>

          {sections.map((section) => (
            <HScrollSection
              key={section.keyword}
              title={section.title}
              query={section.query ?? ""}
              products={section.products}
              loading={false}
            />
          ))}
        </>
      ) : (
        <div className="mx-4 mt-8 text-center">
          <p className="text-gray-400 text-sm mb-1">まだ検索履歴がありません</p>
          <p className="text-gray-300 text-xs">検索すると、ここに過去の検索に基づくおすすめが表示されます</p>
        </div>
      )}
    </div>
  );
}

// ── 検索結果 ─────────────────────────────────────────────

function SearchResults({
  urlQ,
  products,
  totalCount,
  loading,
  sort,
  currentPage,
  totalPages,
  onSortChange,
  onPageChange,
}: {
  urlQ: string;
  products: Product[];
  totalCount: number;
  loading: boolean;
  sort: string;
  currentPage: number;
  totalPages: number;
  onSortChange: (s: string) => void;
  onPageChange: (p: number) => void;
}) {
  const highTrust = products.filter((p) => p.trustLevel === "high");
  const others    = products.filter((p) => p.trustLevel !== "high");

  return (
    <div className="bg-[#f3f4f6] min-h-screen pb-4">
      {/* ヘッダー */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <p className="text-sm text-gray-700">
          <span className="font-bold">「{urlQ}」</span>
          {" "}の検索結果
          {totalCount > 0 && (
            <span className="text-gray-400 text-xs ml-1">約{totalCount.toLocaleString()}件</span>
          )}
        </p>
      </div>

      {/* ソートボタン（PC・スマホ共通で常に表示） */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-100 overflow-x-auto min-w-0" style={scrollHide}>
        <div className="flex gap-2" style={{ width: "max-content" }}>
          {SORT_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onSortChange(value)}
              className="whitespace-nowrap transition"
              style={{
                fontSize: "13px",
                fontWeight: 500,
                padding: "8px 16px",
                borderRadius: "999px",
                minHeight: "36px",
                background: sort === value ? "var(--color-primary)" : "var(--color-bg)",
                color: sort === value ? "white" : "var(--color-text-sub)",
                border: sort === value ? "none" : "1px solid var(--color-border)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 商品グリッド */}
      <div className="px-3 pt-3">
        {loading ? (
          <GridSkeleton count={10} />
        ) : products.length > 0 ? (
          <>
            {/* Featured: PC 2列 / Mobile 1列 */}
            {highTrust.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {highTrust.slice(0, 2).map((p) => (
                  <FeaturedProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

            {/* その他: Mobile 2列 / SM 3列 / PC 4-5列 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[...highTrust.slice(2), ...others].map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {/* ページネーション */}
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={onPageChange}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">😔</p>
            <p className="text-sm">「{urlQ}」の商品が見つかりませんでした</p>
            <p className="text-xs mt-1">絞り込み条件を変更してみてください</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQ);
  const [sort, setSort] = useState("standard");
  const [priceRange, setPriceRange] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    minPrice: null,
    maxPrice: null,
    selectedBrands: [],
    selectedFeatures: [],
    sortBy: "standard",
  });
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searched, setSearched] = useState(false);
  const [browseKey, setBrowseKey] = useState(0);

  const brandList = useMemo(() => extractBrands(allProducts), [allProducts]);
  const colorList = useMemo(
    () => COLOR_KEYWORDS.filter((c) => allProducts.some((p) => p.name.includes(c))),
    [allProducts]
  );
  const materialList = useMemo(
    () => MATERIAL_KEYWORDS.filter((m) =>
      allProducts.some((p) => p.name.includes(m) || p.features.some((f) => f.includes(m)))
    ),
    [allProducts]
  );
  const featureList = useMemo(
    () => FEATURE_KEYWORDS.filter((kw) => allProducts.some((p) => p.name.includes(kw) || p.features.some((f) => f.includes(kw)))),
    [allProducts]
  );

  const runSearch = useCallback(async (q: string, p: number, range: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setAllProducts([]);
    if (p === 1) {
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      }).catch(() => {});
    }
    try {
      const res = await fetch(buildApiUrl(q, p, range));
      const data = await res.json();
      setAllProducts(data.products ?? []);
      setTotalCount(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setSearched(true);
    } catch {
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlQ) {
      startTransition(() => {
        setQuery(urlQ);
        setSort("standard");
        setPriceRange("");
        setCurrentPage(1);
        setSelectedBrands([]);
        setSelectedColors([]);
        setSelectedMaterials([]);
        setSelectedFeatures([]);
        setActiveFilters({ minPrice: null, maxPrice: null, selectedBrands: [], selectedFeatures: [], sortBy: "standard" });
      });
      runSearch(urlQ, 1, "");
    } else {
      startTransition(() => {
        setSearched(false);
        setAllProducts([]);
        setQuery("");
        setBrowseKey((k) => k + 1);
      });
    }
  }, [urlQ, runSearch]);

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function handlePriceRangeChange(range: string) {
    setPriceRange(range);
    setCurrentPage(1);
    runSearch(urlQ, 1, range);
  }

  function handleSortChange(s: string) {
    setSort(s);
  }

  function handleBrandToggle(brand: string) {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  }

  function handleColorToggle(color: string) {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  }

  function handleMaterialToggle(material: string) {
    setSelectedMaterials((prev) =>
      prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material]
    );
  }

  function handleFeatureToggle(feat: string) {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  }

  function handleReset() {
    setPriceRange("");
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedMaterials([]);
    setSelectedFeatures([]);
    setActiveFilters({ minPrice: null, maxPrice: null, selectedBrands: [], selectedFeatures: [], sortBy: "standard" });
    setCurrentPage(1);
    runSearch(urlQ, 1, "");
  }

  function handleApplyFilters(filters: FilterState) {
    setActiveFilters(filters);
    setSort(filters.sortBy);
    setSelectedBrands(filters.selectedBrands);
    setSelectedFeatures(filters.selectedFeatures);
  }

  function handlePageChange(p: number) {
    setCurrentPage(p);
    runSearch(urlQ, p, priceRange);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const displayProducts = useMemo(() => {
    let filtered = allProducts;
    if (activeFilters.minPrice !== null) {
      filtered = filtered.filter((p) => p.price >= activeFilters.minPrice!);
    }
    if (activeFilters.maxPrice !== null) {
      filtered = filtered.filter((p) => p.price <= activeFilters.maxPrice!);
    }
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((p) =>
        selectedBrands.some((brand) => p.name.toLowerCase().includes(brand.toLowerCase()))
      );
    }
    if (selectedColors.length > 0) {
      filtered = filtered.filter((p) =>
        selectedColors.some((c) => p.name.includes(c))
      );
    }
    if (selectedMaterials.length > 0) {
      filtered = filtered.filter((p) =>
        selectedMaterials.some((m) => p.name.includes(m) || p.features.some((f) => f.includes(m)))
      );
    }
    if (selectedFeatures.length > 0) {
      filtered = filtered.filter((p) =>
        selectedFeatures.some((feat) => p.name.includes(feat) || p.features.some((f) => f.includes(feat)))
      );
    }
    return applySortLocal(filtered, sort);
  }, [allProducts, sort, selectedBrands, selectedColors, selectedMaterials, selectedFeatures, activeFilters]);

  const activeFilterCount = [
    activeFilters.minPrice !== null || activeFilters.maxPrice !== null,
    activeFilters.selectedBrands.length > 0,
    activeFilters.sortBy !== "standard",
  ].filter(Boolean).length;

  const hasActiveFilters =
    activeFilterCount > 0 ||
    priceRange !== "" ||
    selectedColors.length > 0 ||
    selectedMaterials.length > 0 ||
    selectedFeatures.length > 0;

  const sidebarProps = {
    products: allProducts,
    minPrice: activeFilters.minPrice,
    maxPrice: activeFilters.maxPrice,
    onPriceChange: (min: number | null, max: number | null) =>
      handleApplyFilters({ ...activeFilters, minPrice: min, maxPrice: max }),
    brands: brandList,
    selectedBrands,
    onBrandToggle: handleBrandToggle,
    colors: colorList,
    selectedColors,
    onColorToggle: handleColorToggle,
    materials: materialList,
    selectedMaterials,
    onMaterialToggle: handleMaterialToggle,
    features: featureList,
    selectedFeatures,
    onFeatureToggle: handleFeatureToggle,
    onReset: handleReset,
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* 検索バー（固定） */}
      <form
        onSubmit={handleSearch}
        style={{
          position: "sticky",
          top: "var(--nav-top-h)",
          zIndex: 90,
          background: "white",
          borderBottom: "1px solid var(--color-border)",
          padding: "10px 16px",
        }}
      >
        <div className="flex items-center gap-2" style={{ overflow: "clip" }}>
          <div
            className="flex-1 flex items-center gap-2"
            style={{
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
              padding: "0 14px",
              height: "48px",
              border: "1.5px solid var(--color-border)",
              minWidth: 0,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="var(--color-text-sub)"
              className="w-4 h-4 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSearch();
                if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault();
              }}
              placeholder="商品を検索"
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                fontSize: "16px",
                color: "var(--color-text)",
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  router.push("/search");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-sub)",
                  padding: "4px",
                  minHeight: "auto",
                  flexShrink: 0,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* モバイル：絞り込みボタン（アイコンのみ） */}
          {searched && (
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="md:hidden"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                border: hasActiveFilters ? "1.5px solid #c8a96e" : "1px solid #e8e8e4",
                borderRadius: "50%",
                background: hasActiveFilters ? "#fef9f0" : "white",
                cursor: "pointer",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={hasActiveFilters ? "#c8a96e" : "#666"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              {hasActiveFilters && (
                <div style={{
                  position: "absolute",
                  top: "0px",
                  right: "0px",
                  width: "16px",
                  height: "16px",
                  background: "#c8a96e",
                  borderRadius: "50%",
                  fontSize: "10px",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                }}>
                  {activeFilterCount}
                </div>
              )}
            </button>
          )}
        </div>
      </form>

      {!searched && !loading && <TopBrowse key={browseKey} />}

      {!searched && loading && (
        <div className="px-3 pt-3 bg-[#f3f4f6] min-h-screen">
          <div className="bg-white rounded-2xl h-10 animate-pulse mb-3" />
          <div className="bg-white rounded-2xl h-8 animate-pulse mb-3" />
          <GridSkeleton count={10} />
        </div>
      )}

      {/* 検索結果 + PC サイドバー */}
      {searched && (
        <div className="md:flex">
          {/* PC サイドバー */}
          <aside
            className="hidden md:flex md:flex-col w-[260px] shrink-0 border-r border-gray-100 sticky self-start bg-white"
            style={{ top: "125px", maxHeight: "calc(100vh - 125px)" }}
          >
            {/* ヘッダー：メインコンテンツの件数行と高さを揃える */}
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <h2 className="text-sm font-bold text-gray-700">絞り込み</h2>
            </div>
            {/* スクロール可能エリア */}
            <div className="overflow-y-auto flex-1">
              <Sidebar {...sidebarProps} />
            </div>
          </aside>

          {/* メインコンテンツ */}
          <div className="flex-1 min-w-0">
            <SearchResults
              urlQ={urlQ}
              products={displayProducts}
              totalCount={totalCount}
              loading={loading}
              sort={sort}
              currentPage={currentPage}
              totalPages={totalPages}
              onSortChange={handleSortChange}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* モバイル絞り込みモーダル */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
        products={allProducts}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#f3f4f6]" />}>
      <SearchContent />
    </Suspense>
  );
}
