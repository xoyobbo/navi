import type { Product, SearchParams, SearchResult, SortOrder } from "@/types/product";
import { scoreProducts } from "@/lib/scoring";

type ProductSource = "rakuten" | "yahoo" | "amazon";

// ── 内部ユーティリティ ────────────────────────────────────────

function sortProducts(products: Product[], sort: SortOrder): Product[] {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "price_asc":  return a.price - b.price;
      case "price_desc": return b.price - a.price;
      case "rating_desc": {
        // レビュー件数を加味した重み付きスコア (少ない件数の ★5 を過大評価しない)
        const scoreA = a.rating * Math.log10(a.reviewCount + 10);
        const scoreB = b.rating * Math.log10(b.reviewCount + 10);
        return scoreB - scoreA;
      }
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

async function fetchRakuten(
  query: string,
  page: number,
  perPage: number,
  sort: SortOrder = "price_asc",
  minPrice?: number | null,
  maxPrice?: number | null,
): Promise<Product[]> {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  if (!appId || !accessKey) {
    console.warn("[search] 楽天キー未設定");
    return [];
  }

  // 新 API エンドポイント（2026-04-01〜）
  const url = new URL("https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401");
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("keyword", query);
  url.searchParams.set("hits", String(Math.min(perPage, 30)));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", sort === "price_desc" ? "-itemPrice" : sort === "price_asc" ? "+itemPrice" : "standard");
  url.searchParams.set("availability", "1");
  url.searchParams.set("imageFlag", "1");
  if (affiliateId) url.searchParams.set("affiliateId", affiliateId);
  if (minPrice) url.searchParams.set("minPrice", String(minPrice));
  if (maxPrice) url.searchParams.set("maxPrice", String(maxPrice));

  const res = await fetch(url.toString(), {
    headers: { Origin: "https://navi-tawny.vercel.app" },
    cache: "no-store",
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

    // 新 API は largeImageUrls なし。mediumImageUrls の _ex=128x128 を高解像度に差し替える
    const medImg = (item.mediumImageUrls as { imageUrl: string }[] | undefined)?.[0]?.imageUrl ?? "";
    const image = medImg
      ? medImg.replace("_ex=128x128", "_ex=500x500")
      : "/images/no-image.png";

    const itemUrl = String(item.itemUrl || "");
    const affiliateUrl = String(item.affiliateUrl || item.itemUrl || "");

    return {
      id: `rakuten_${item.itemCode}`,
      source: "rakuten" as const,
      name: String(item.itemName ?? ""),
      price: Number(item.itemPrice ?? 0),
      image,
      affiliateUrl,
      rating: Number(item.reviewAverage ?? 0),
      reviewCount: Number(item.reviewCount ?? 0),
      features,
      category: String(item.genreId ?? ""),
      availability: item.availability === 1,
      purchaseLinks: { rakuten: affiliateUrl || itemUrl },
    } satisfies Product;
  });
}

// ── Yahoo!ショッピングAPI直接呼び出し ──────────────────────────

async function fetchYahoo(
  query: string,
  page: number,
  perPage: number,
  sort: SortOrder = "price_asc",
  minPrice?: number | null,
  maxPrice?: number | null,
): Promise<Product[]> {
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
  url.searchParams.set("in_stock", "1");
  const yahooSort = sort === "rating_desc" ? "-review_average" : sort === "price_desc" ? "-price" : sort === "price_asc" ? "+price" : "-score";
  url.searchParams.set("sort", yahooSort);
  if (minPrice) url.searchParams.set("price_from", String(minPrice));
  if (maxPrice) url.searchParams.set("price_to", String(maxPrice));

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Yahoo!API ${res.status}: ${body.slice(0, 100)}`);
  }

  const data = await res.json();

  return (data.hits ?? [])
    .filter((hit: Record<string, unknown>) => {
      const img = hit.image as Record<string, string> | undefined;
      return img?.large || img?.medium || img?.small;
    })
    .map((hit: Record<string, unknown>) => {
      const desc = String(hit.description ?? "");
      const features = desc
        .split(/[。\n・、]/).map((s: string) => s.trim())
        .filter((s: string) => s.length > 4 && s.length < 60).slice(0, 5);
      const review = hit.review as Record<string, number> | undefined;
      const image = hit.image as Record<string, string> | undefined;
      const priceLabel = hit.priceLabel as Record<string, number> | undefined;
      const genreCategory = hit.genreCategory as Record<string, string> | undefined;
      const rawImage = image?.large || image?.medium || image?.small || "/images/no-image.png";
      return {
        id: `yahoo_${hit.code}`,
        source: "yahoo" as const,
        name: String(hit.name ?? ""),
        price: Number(priceLabel?.taxIncluded ?? hit.price ?? 0),
        image: rawImage,
        affiliateUrl: String(hit.url ?? ""),
        rating: Number(review?.rate ?? 0),
        reviewCount: Number(review?.count ?? 0),
        features,
        category: genreCategory?.name ?? "",
        availability: hit.inStock !== false,
        purchaseLinks: { yahoo: String(hit.url ?? "") },
      } satisfies Product;
    });
}

// ── 統合検索エントリーポイント ────────────────────────────────

export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const { query, sort = "price_asc", page = 1, perPage = 20, minPrice, maxPrice } = params;

  const [rakutenResult, yahooResult] = await Promise.allSettled([
    fetchRakuten(query, page, perPage, sort, minPrice, maxPrice),
    fetchYahoo(query, page, perPage, sort, minPrice, maxPrice),
  ]);

  const rakutenProducts = rakutenResult.status === "fulfilled" ? rakutenResult.value : [];
  const yahooProducts = yahooResult.status === "fulfilled" ? yahooResult.value : [];

  if (rakutenResult.status === "rejected") console.warn("[search] 楽天スキップ:", rakutenResult.reason);
  if (yahooResult.status === "rejected") console.warn("[search] Yahoo!スキップ:", yahooResult.reason);

  // 画質優先：楽天が5件以上あればYahoo!を使わない
  const sources: ProductSource[] = [];
  let allProducts: Product[];
  if (rakutenProducts.length >= 5) {
    allProducts = rakutenProducts;
    sources.push("rakuten");
  } else {
    // 楽天が不足の場合のみYahoo!で補完
    allProducts = [...rakutenProducts, ...yahooProducts];
    if (rakutenProducts.length > 0) sources.push("rakuten");
    if (yahooProducts.length > 0) sources.push("yahoo");
  }

  // 画像なし商品を除外してから価格フィルタ
  const withImages = allProducts.filter((p) => p.image !== "");
  const priceFiltered = withImages.filter((p) => {
    if (minPrice && p.price < minPrice) return false;
    if (maxPrice && p.price > maxPrice) return false;
    return true;
  });

  const unique = deduplicateByName(priceFiltered);
  const scored = scoreProducts(unique);
  const sorted = sortProducts(scored, sort);

  return {
    products: sorted,
    totalCount: unique.length,
    sources,
  };
}
