import type { Product, SearchParams, SearchResult, SortOrder } from "@/types/product";

type ApiResult = {
  products: Product[];
  totalCount: number;
  source: string;
  error?: string;
};

function sortProducts(products: Product[], sort: SortOrder): Product[] {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "rating_desc":
        return b.rating - a.rating || b.reviewCount - a.reviewCount;
      default:
        return 0;
    }
  });
}

function deduplicateByName(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    // 商品名の先頭40文字をキーに重複排除
    const key = p.name.slice(0, 40).toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ベースURLを環境に応じて解決（サーバーサイド呼び出し時に絶対URLが必要）
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return "http://localhost:3000";
}

export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const { query, sort = "price_asc", page = 1, perPage = 20 } = params;
  const base = getBaseUrl();
  const qs = `q=${encodeURIComponent(query)}&page=${page}&perPage=${perPage}`;

  // 楽天・Yahoo! を並列で叩く
  const [rakutenResult, yahooResult] = await Promise.allSettled([
    fetch(`${base}/api/rakuten?${qs}`).then((r) => r.json() as Promise<ApiResult>),
    fetch(`${base}/api/yahoo?${qs}`).then((r) => r.json() as Promise<ApiResult>),
  ]);

  const allProducts: Product[] = [];
  const sources: string[] = [];
  let totalCount = 0;

  if (rakutenResult.status === "fulfilled" && !rakutenResult.value.error) {
    allProducts.push(...(rakutenResult.value.products ?? []));
    totalCount += rakutenResult.value.totalCount ?? 0;
    sources.push("rakuten");
  } else {
    const reason =
      rakutenResult.status === "rejected"
        ? rakutenResult.reason
        : rakutenResult.value.error;
    console.warn("[search] 楽天APIスキップ:", reason);
  }

  if (yahooResult.status === "fulfilled" && !yahooResult.value.error) {
    allProducts.push(...(yahooResult.value.products ?? []));
    totalCount += yahooResult.value.totalCount ?? 0;
    sources.push("yahoo");
  } else {
    const reason =
      yahooResult.status === "rejected"
        ? yahooResult.reason
        : yahooResult.value.error;
    console.warn("[search] Yahoo!APIスキップ:", reason);
  }

  const unique = deduplicateByName(allProducts);
  const sorted = sortProducts(unique, sort);

  return {
    products: sorted,
    totalCount,
    sources: sources as SearchResult["sources"],
  };
}
