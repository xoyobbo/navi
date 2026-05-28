import type { Product } from "@/types/product";

interface YahooSearchParams {
  keyword: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  hits?: number;
}

export async function searchYahoo(params: YahooSearchParams): Promise<Product[]> {
  const clientId = process.env.YAHOO_CLIENT_ID;
  if (!clientId) return [];

  try {
    const query = new URLSearchParams({
      appid: clientId,
      query: params.keyword,
      results: String(params.hits ?? 20),
      sort: "-score",
      in_stock: "true",
    });
    if (params.minPrice) query.set("price_from", String(params.minPrice));
    if (params.maxPrice) query.set("price_to", String(params.maxPrice));

    const res = await fetch(
      `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?${query}`
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.hits?.length) return [];

    return data.hits.map((hit: Record<string, unknown>): Product => {
      const hitImage = hit.image as Record<string, string> | undefined;
      const hitReview = hit.review as Record<string, number> | undefined;
      const image = hitImage?.large || hitImage?.medium || hitImage?.small || "/images/no-image.png";
      const url = String(hit.url ?? "");
      return {
        id: `yahoo_${hit.code}`,
        source: "yahoo",
        name: String(hit.name ?? ""),
        price: Number(hit.price ?? 0),
        image,
        images: [hitImage?.large, hitImage?.medium].filter((u): u is string => Boolean(u)),
        affiliateUrl: url,
        purchaseLinks: { yahoo: url },
        rating: Number(hitReview?.rate ?? 0),
        reviewCount: Number(hitReview?.count ?? 0),
        features: [],
        category: "",
        availability: true,
      };
    });
  } catch (e) {
    console.error("[yahoo] 例外:", e);
    return [];
  }
}
