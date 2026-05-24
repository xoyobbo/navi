import { NextRequest, NextResponse } from "next/server";
import type { Product } from "@/types/product";

// Yahoo!ショッピング商品検索APIのレスポンス型（必要なフィールドのみ）
type YahooHit = {
  name: string;
  code: string;
  price: number;
  image: { medium: string };
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

function toProduct(hit: YahooHit): Product {
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
    image: hit.image?.medium ?? "",
    affiliateUrl: hit.url,
    rating: hit.review?.rate ?? 0,
    reviewCount: hit.review?.count ?? 0,
    features,
    category: hit.genreCategory?.name ?? "",
    availability: hit.inStock ?? true,
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
  const perPage = Math.min(Number(searchParams.get("perPage") ?? 20), 50);

  const url = new URL("https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch");
  url.searchParams.set("appid", clientId);
  url.searchParams.set("query", query);
  url.searchParams.set("results", String(perPage));
  url.searchParams.set("start", String((page - 1) * perPage + 1));
  url.searchParams.set("in_stock", "true");
  url.searchParams.set("sort", "+price"); // 価格昇順

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Yahoo!API HTTP エラー: ${res.status} ${body}`);
    }

    const data: YahooResponse = await res.json();

    const products = (data.hits ?? []).map(toProduct);

    return NextResponse.json({
      products,
      totalCount: data.totalResultsAvailable ?? products.length,
      source: "yahoo",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    console.error("[yahoo] 検索失敗:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
