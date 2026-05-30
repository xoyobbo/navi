"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import { extractBrands } from "@/lib/brand-extractor";
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
  { label: "価格が安い順", value: "price_asc" },
  { label: "価格が高い順", value: "price_desc" },
  { label: "評価が高い順", value: "rating" },
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
];

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
    case "price_asc":  return [...products].sort((a, b) => a.price - b.price);
    case "price_desc": return [...products].sort((a, b) => b.price - a.price);
    case "rating":     return [...products].sort((a, b) => b.rating - a.rating);
    default:           return products;
  }
}

// ── スケルトン ────────────────────────────────────────────

function CardSkeleton() {
  return <div className="w-40 shrink-0 h-64 bg-white rounded-2xl animate-pulse border border-gray-100" />;
}

function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />
      ))}
    </div>
  );
}

// ── サイドバー ────────────────────────────────────────────

function Sidebar({
  priceRange,
  onPriceRangeChange,
  brands,
  selectedBrands,
  onBrandToggle,
  features,
  selectedFeatures,
  onFeatureToggle,
  onReset,
}: {
  priceRange: string;
  onPriceRangeChange: (r: string) => void;
  brands: string[];
  selectedBrands: string[];
  onBrandToggle: (b: string) => void;
  features: string[];
  selectedFeatures: string[];
  onFeatureToggle: (f: string) => void;
  onReset: () => void;
}) {
  const hasFilters =
    priceRange !== "" || selectedBrands.length > 0 || selectedFeatures.length > 0;

  return (
    <div className="px-3 py-4 space-y-5">
      <div>
        <h3 className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">価格帯</h3>
        <div className="space-y-0.5">
          {PRICE_RANGES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onPriceRangeChange(value)}
              className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition ${
                priceRange === value
                  ? "bg-red-50 text-red-500 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">ブランド</h3>
          <div className="space-y-1.5">
            {brands.map((brand) => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => onBrandToggle(brand)}
                  className="w-4 h-4 rounded border-gray-300 accent-gray-900"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{brand}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {features.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">特徴</h3>
          <div className="space-y-1.5">
            {features.map((feat) => (
              <label key={feat} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedFeatures.includes(feat)}
                  onChange={() => onFeatureToggle(feat)}
                  className="w-4 h-4 rounded border-gray-300 accent-gray-900"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{feat}</span>
              </label>
            ))}
          </div>
        </div>
      )}

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
      <div className="overflow-x-auto px-4" style={scrollHide}>
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
const TOP_CACHE_TTL = 1000 * 60 * 30; // 30分
const POPULAR_CACHE_KEY = "navi_popular";
const POPULAR_CACHE_TTL = 1000 * 60 * 60; // 1時間

type DisplaySection = { keyword: string; title: string; products: Product[]; query?: string };

function TopBrowse() {
  const router = useRouter();
  const [sections, setSections] = useState<DisplaySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [recentHistory, setRecentHistory] = useState<string[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (hasFetched) return;
    setHasFetched(true);

    // 履歴タグは常に最新を並列取得（軽量）
    fetch("/api/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { history?: { query: string }[] }) => {
        const queries = (data.history ?? []).map((h) => h.query).filter(Boolean);
        setRecentHistory([...new Set(queries)].slice(0, 7) as string[]);
      })
      .catch(() => {});

    // ── バックグラウンドでパーソナライズを取得して差し替え ──
    async function loadPersonalized() {
      setIsPersonalizing(true);
      try {
        // sessionStorageのパーソナライズキャッシュを確認
        try {
          const cached = sessionStorage.getItem(TOP_CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached) as { data: TopData; timestamp: number };
            if (Date.now() - timestamp < TOP_CACHE_TTL && (data.personalizedSections?.length ?? 0) > 0) {
              setSections(data.personalizedSections.map((s) => ({
                keyword: s.keyword, title: `「${s.keyword}」のおすすめ`, products: s.products, query: s.keyword,
              })));
              // キャッシュをバックグラウンドで更新（UIには反映しない）
              fetch("/api/search/top").then((r) => r.json()).then((fresh: TopData) => {
                sessionStorage.setItem(TOP_CACHE_KEY, JSON.stringify({ data: fresh, timestamp: Date.now() }));
              }).catch(() => {});
              return;
            }
          }
        } catch {}

        // APIからパーソナライズ取得
        const res = await fetch("/api/search/top");
        const data: TopData = await res.json();
        if ((data.personalizedSections?.length ?? 0) > 0) {
          setSections(data.personalizedSections.map((s) => ({
            keyword: s.keyword, title: `「${s.keyword}」のおすすめ`, products: s.products, query: s.keyword,
          })));
          try {
            sessionStorage.setItem(TOP_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
          } catch {}
        }
      } catch {}
      finally {
        setIsPersonalizing(false);
      }
    }

    // ── メイン: まず人気商品を即表示 ──
    async function load() {
      // ① パーソナライズキャッシュが新鮮なら直接表示
      try {
        const cached = sessionStorage.getItem(TOP_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached) as { data: TopData; timestamp: number };
          if (Date.now() - timestamp < TOP_CACHE_TTL && (data.personalizedSections?.length ?? 0) > 0) {
            setSections(data.personalizedSections.map((s) => ({
              keyword: s.keyword, title: `「${s.keyword}」のおすすめ`, products: s.products, query: s.keyword,
            })));
            setLoading(false);
            loadPersonalized(); // バックグラウンドでキャッシュ更新のみ
            return;
          }
        }
      } catch {}

      // ② 人気商品をsessionStorageまたはAPIから即表示
      try {
        const popularCached = sessionStorage.getItem(POPULAR_CACHE_KEY);
        if (popularCached) {
          const { data, timestamp } = JSON.parse(popularCached) as { data: { products: Product[]; title: string }; timestamp: number };
          if (Date.now() - timestamp < POPULAR_CACHE_TTL) {
            setSections([{ keyword: "_popular", title: data.title, products: data.products }]);
            setLoading(false);
            loadPersonalized();
            return;
          }
        }
      } catch {}

      // ③ 人気商品APIを叩く（~300ms）
      try {
        const res = await fetch("/api/search/popular");
        const popular = await res.json() as { products: Product[]; title: string };
        setSections([{ keyword: "_popular", title: popular.title, products: popular.products ?? [] }]);
        try {
          sessionStorage.setItem(POPULAR_CACHE_KEY, JSON.stringify({ data: popular, timestamp: Date.now() }));
        } catch {}
      } catch {}
      setLoading(false);
      loadPersonalized();
    }

    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3 pb-10 bg-[#f3f4f6]">
      <style>{`@keyframes navi-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

      {/* カテゴリアイコン */}
      <div className="bg-white px-4 py-4">
        <div className="overflow-x-auto" style={scrollHide}>
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

      {/* おすすめセクション（2段階ロード） */}
      {loading ? (
        <>
          {[...Array(2)].map((_, i) => (
            <HScrollSection key={i} title="人気の商品" products={[]} loading={true} />
          ))}
        </>
      ) : sections.length > 0 ? (
        <>
          {isPersonalizing && (
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 16px 4px" }}>
              <span style={{ fontSize: "11px", color: "#aaa", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-accent)", animation: "navi-pulse 1s infinite" }} />
                最適化中...
              </span>
            </div>
          )}
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

      {/* ソートボタン */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-100 overflow-x-auto" style={scrollHide}>
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
          <GridSkeleton count={8} />
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((p) => (
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
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searched, setSearched] = useState(false);
  const [browseKey, setBrowseKey] = useState(0);

  const brandList = useMemo(() => extractBrands(allProducts), [allProducts]);
  const featureList = useMemo(
    () => FEATURE_KEYWORDS.filter((kw) => allProducts.some((p) => p.name.includes(kw))),
    [allProducts]
  );

  const runSearch = useCallback(async (q: string, p: number, range: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setAllProducts([]);
    // 1ページ目のみ履歴を保存（重複保存を防ぐ）
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
        setSelectedFeatures([]);
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      runSearch(urlQ, 1, "");
    } else {
      startTransition(() => {
        setSearched(false);
        setAllProducts([]);
        setQuery("");
        setBrowseKey((k) => k + 1); // 履歴を最新に更新
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

  function handleFeatureToggle(feat: string) {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  }

  function handleReset() {
    setPriceRange("");
    setSelectedBrands([]);
    setSelectedFeatures([]);
    setCurrentPage(1);
    runSearch(urlQ, 1, "");
  }

  function handlePageChange(p: number) {
    setCurrentPage(p);
    runSearch(urlQ, p, priceRange);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const displayProducts = useMemo(() => {
    let filtered = allProducts;
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((p) =>
        selectedBrands.some((brand) => p.name.toLowerCase().includes(brand.toLowerCase()))
      );
    }
    if (selectedFeatures.length > 0) {
      filtered = filtered.filter((p) =>
        selectedFeatures.some((feat) => p.name.includes(feat))
      );
    }
    return applySortLocal(filtered, sort);
  }, [allProducts, sort, selectedBrands, selectedFeatures]);

  const sidebarProps = {
    priceRange,
    onPriceRangeChange: handlePriceRangeChange,
    brands: brandList,
    selectedBrands,
    onBrandToggle: handleBrandToggle,
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
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2"
            style={{
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
              padding: "0 14px",
              height: "48px",
              border: "1.5px solid var(--color-border)",
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

          {/* モバイル：絞り込みボタン */}
          {searched && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden flex items-center gap-1 shrink-0 whitespace-nowrap"
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--color-text)",
                border: "1.5px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "0 12px",
                height: "48px",
                background: "white",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
              </svg>
              絞り込み
            </button>
          )}
        </div>
      </form>

      {/* トップブラウズ：検索から戻るたびに key を変えて強制リフレッシュ */}
      {!searched && !loading && <TopBrowse key={browseKey} />}

      {/* 初期ロード中 */}
      {!searched && loading && (
        <div className="px-3 pt-3 bg-[#f3f4f6] min-h-screen">
          <div className="bg-white rounded-2xl h-10 animate-pulse mb-3" />
          <div className="bg-white rounded-2xl h-8 animate-pulse mb-3" />
          <GridSkeleton count={8} />
        </div>
      )}

      {/* 検索結果 + PC サイドバー */}
      {searched && (
        <div className="md:flex">
          {/* PC サイドバー */}
          <aside className="hidden md:block w-[220px] shrink-0 bg-white border-r border-gray-100 sticky top-[108px] self-start max-h-[calc(100vh-108px)] overflow-y-auto">
            <Sidebar {...sidebarProps} />
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

      {/* モバイル絞り込みドロワー */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">絞り込み</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Sidebar
              {...sidebarProps}
              onPriceRangeChange={(r) => {
                handlePriceRangeChange(r);
                setDrawerOpen(false);
              }}
            />
          </div>
        </div>
      )}
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
