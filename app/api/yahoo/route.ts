import { NextRequest, NextResponse } from "next/server";
import type { Product } from "@/types/product";

type YahooImage = {
  small?: string;
  medium?: string;
  large?: string;
  xlarge?: string;
};

type YahooHit = {
  name: string;
  code: string;
  price: number;
  image: YahooImage;
  itemImageUrl?: string;
  url: string;
  review: { rate: number; count: number };
  description: string;
  genreCategory: { name: string };
  inStock: boolean;
  priceLabel?: { taxIncluded: number };
};

type YahooResponse = {
  hits: YahooHit[];
  totalResultsReturned: number;
  totalResultsAvailable: number;
};

function toProduct(hit: YahooHit): Product | null {
  const image =
    hit.image?.large ||
    hit.image?.medium ||
    hit.image?.small ||
    "/images/no-image.png";
  if (!hit.image?.large && !hit.image?.medium && !hit.image?.small) return null;

  const desc = hit.description ?? "";
  const features = desc
    .split(/[。\n・、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && s.length < 60)
    .slice(0, 5);

  const price = hit.priceLabel?.taxIncluded ?? hit.price;

  return {
    id: `yahoo_${hit.code}`,
    source: "yahoo",
    name: hit.name,
    price,
    image,
    affiliateUrl: hit.url,
    rating: hit.review?.rate ?? 0,
    reviewCount: hit.review?.count ?? 0,
    features,
    category: hit.genreCategory?.name ?? "",
    availability: hit.inStock ?? true,
    purchaseLinks: { yahoo: hit.url },
  };
}

export async function GET(req: NextRequest) {
  const clientId = process.env.YAHOO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "YAHOO_CLIENT_ID が設定されていません" },
      { status: 500 }
    );
  }

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "クエリパラメータ q が必要です" }, { status: 400 });
  }

  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Math.min(Number(searchParams.get("perPage") ?? 20), 30);
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sortParam = searchParams.get("sort") ?? "standard";

  const url = new URL("https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch");
  url.searchParams.set("appid", clientId);
  url.searchParams.set("query", query);
  url.searchParams.set("results", String(perPage));
  url.searchParams.set("start", String((page - 1) * perPage + 1));
  url.searchParams.set("in_stock", "1");
  url.searchParams.set("sort", sortParam === "rating" ? "-review_average" : sortParam === "price" ? "+price" : "-score");
  if (minPrice) url.searchParams.set("price_from", minPrice);
  if (maxPrice) url.searchParams.set("price_to", maxPrice);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[yahoo] HTTP エラー:", res.status, body.slice(0, 200));
      return NextResponse.json({ products: [], totalCount: 0, source: "yahoo" });
    }

    const data: YahooResponse = await res.json();

    const products = (data.hits ?? []).map(toProduct).filter((p): p is Product => p !== null);

    return NextResponse.json({
      products,
      totalCount: data.totalResultsAvailable ?? products.length,
      source: "yahoo",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    console.error("[yahoo] 検索失敗:", message);
    return NextResponse.json({ products: [], totalCount: 0, source: "yahoo" });
  }
}
