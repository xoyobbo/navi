import type { Product, SearchParams, SearchResult, SortOrder } from "@/types/product";

// ── 内部ユーティリティ ────────────────────────────────────────

function sortProducts(products: Product[], sort: SortOrder): Product[] {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "price_asc":  return a.price - b.price;
      case "price_desc": return b.price - a.price;
      case "rating_desc":
        return b.rating - a.rating || b.reviewCount - a.reviewCount;
      default: return 0;
    }
  });
}

function deduplicateByName(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    const key = p.name.slice(0, 40).toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── 楽天API直接呼び出し ──────────────────────────────────────

async function fetchRakuten(query: string, page: number, perPage: number, sort: SortOrder = "price_asc"): Promise<Product[]> {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!appId || !accessKey) {
    console.warn("[search] 楽天キー未設定");
    return [];
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://navi-tawny.vercel.app";
  const url = new URL("https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401");
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("keyword", query);
  url.searchParams.set("hits", String(Math.min(perPage, 30)));
  url.searchParams.set("page", String(page));
  // 評価順の場合は楽天の reviewCount 降順で取得（評価数が多い＝信頼度高い商品を優先）
  url.searchParams.set("sort", sort === "rating_desc" ? "-reviewCount" : "+itemPrice");
  url.searchParams.set("availability", "1");
  url.searchParams.set("imageFlag", "1");
  url.searchParams.set("formatVersion", "2");

  const res = await fetch(url.toString(), {
    headers: { accessKey, Referer: appUrl, Origin: appUrl, "User-Agent": "Navi/1.0" },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`楽天API ${res.status}: ${body?.errors?.errorMessage ?? res.statusText}`);
  }

  const data = await res.json();
  return (data.Items ?? []).map((raw: Record<string, unknown>) => {
    const item = ("Item" in raw ? raw.Item : raw) as Record<string, unknown>;
    const caption = String(item.itemCaption ?? "");
    const features = caption
      .split(/[。\n・]/).map((s: string) => s.trim())
      .filter((s: string) => s.length > 4 && s.length < 60).slice(0, 5);
    return {
      id: `rakuten_${item.itemCode}`,
      source: "rakuten" as const,
      name: String(item.itemName ?? ""),
      price: Number(item.itemPrice ?? 0),
      image: (item.mediumImageUrls as { imageUrl: string }[])?.[0]?.imageUrl ?? "",
      affiliateUrl: String(item.affiliateUrl || item.itemUrl || ""),
      rating: Number(item.reviewAverage ?? 0),
      reviewCount: Number(item.reviewCount ?? 0),
      features,
      category: String(item.genreName ?? ""),
      availability: item.availability === 1,
    } satisfies Product;
  });
}

// ── Yahoo!ショッピングAPI直接呼び出し ──────────────────────────

async function fetchYahoo(query: string, page: number, perPage: number, sort: SortOrder = "price_asc"): Promise<Product[]> {
  const clientId = process.env.YAHOO_CLIENT_ID;
  if (!clientId) {
    console.warn("[search] Yahoo!キー未設定");
    return [];
  }

  const url = new URL("https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch");
  url.searchParams.set("appid", clientId);
  url.searchParams.set("query", query);
  url.searchParams.set("results", String(Math.min(perPage, 50)));
  url.searchParams.set("start", String((page - 1) * perPage + 1));
  url.searchParams.set("in_stock", "true");
  // rating_desc → Yahoo!の評価平均降順、price_desc → 価格降順、それ以外 → 価格昇順
  const yahooSort = sort === "rating_desc" ? "-review_average" : sort === "price_desc" ? "-price" : "+price";
  url.searchParams.set("sort", yahooSort);

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Yahoo!API ${res.status}: ${body.slice(0, 100)}`);
  }

  const data = await res.json();
  return (data.hits ?? []).map((hit: Record<string, unknown>) => {
    const desc = String(hit.description ?? "");
    const features = desc
      .split(/[。\n・、]/).map((s: string) => s.trim())
      .filter((s: string) => s.length > 4 && s.length < 60).slice(0, 5);
    const review = hit.review as Record<string, number> | undefined;
    const image = hit.image as Record<string, string> | undefined;
    const priceLabel = hit.priceLabel as Record<string, number> | undefined;
    const genreCategory = hit.genreCategory as Record<string, string> | undefined;
    return {
      id: `yahoo_${hit.code}`,
      source: "yahoo" as const,
      name: String(hit.name ?? ""),
      price: Number(priceLabel?.taxIncluded ?? hit.price ?? 0),
      image: image?.medium ?? "",
      affiliateUrl: String(hit.url ?? ""),
      rating: Number(review?.rate ?? 0),
      reviewCount: Number(review?.count ?? 0),
      features,
      category: genreCategory?.name ?? "",
      availability: hit.inStock !== false,
    } satisfies Product;
  });
}

// ── 統合検索エントリーポイント ────────────────────────────────

export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const { query, sort = "price_asc", page = 1, perPage = 20 } = params;

  const [rakutenResult, yahooResult] = await Promise.allSettled([
    fetchRakuten(query, page, perPage, sort),
    fetchYahoo(query, page, perPage, sort),
  ]);

  const allProducts: Product[] = [];
  const sources: ProductSource[] = [];

  if (rakutenResult.status === "fulfilled") {
    allProducts.push(...rakutenResult.value);
    if (rakutenResult.value.length > 0) sources.push("rakuten");
  } else {
    console.warn("[search] 楽天スキップ:", rakutenResult.reason);
  }

  if (yahooResult.status === "fulfilled") {
    allProducts.push(...yahooResult.value);
    if (yahooResult.value.length > 0) sources.push("yahoo");
  } else {
    console.warn("[search] Yahoo!スキップ:", yahooResult.reason);
  }

  const unique = deduplicateByName(allProducts);
  const sorted = sortProducts(unique, sort);

  return {
    products: sorted,
    totalCount: unique.length,
    sources,
  };
}

type ProductSource = "rakuten" | "yahoo" | "amazon";
