import { NextRequest, NextResponse } from "next/server";
import type { Product } from "@/types/product";

// 楽天市場商品検索API v20260401 レスポンス型
type RakutenItem = {
  itemCode: string;
  itemName: string;
  itemPrice: number;
  mediumImageUrls: { imageUrl: string }[];
  affiliateUrl: string;
  itemUrl: string;
  reviewAverage: number;
  reviewCount: number;
  itemCaption: string;
  genreName: string;
  availability: number;
};

type RakutenResponse = {
  count: number;
  Items: (RakutenItem | { Item: RakutenItem })[];
  errors?: { errorCode: number; errorMessage: string };
};

function toProduct(raw: RakutenItem | { Item: RakutenItem }): Product {
  const item: RakutenItem = "Item" in raw ? raw.Item : raw;
  const features = (item.itemCaption ?? "")
    .split(/[。\n・]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && s.length < 60)
    .slice(0, 5);

  return {
    id: `rakuten_${item.itemCode}`,
    source: "rakuten",
    name: item.itemName,
    price: item.itemPrice,
    image: item.mediumImageUrls?.[0]?.imageUrl ?? "",
    affiliateUrl: item.affiliateUrl || item.itemUrl,
    rating: item.reviewAverage ?? 0,
    reviewCount: item.reviewCount ?? 0,
    features,
    category: item.genreName ?? "",
    availability: item.availability === 1,
  };
}

// 新APIプラットフォーム (openapi.rakuten.co.jp) 用の認証ヘッダー
// Referer と Origin の両方が必須
function rakutenHeaders(): Record<string, string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://navi-tawny.vercel.app";
  return {
    accessKey: process.env.RAKUTEN_ACCESS_KEY!,
    Referer: appUrl,
    Origin: appUrl,
    "User-Agent": "Navi/1.0",
  };
}

export async function GET(req: NextRequest) {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!appId || !accessKey) {
    return NextResponse.json(
      { error: "RAKUTEN_APP_ID または RAKUTEN_ACCESS_KEY が設定されていません" },
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

  const url = new URL(
    "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401"
  );
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("keyword", query);
  url.searchParams.set("hits", String(perPage));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "+itemPrice");
  url.searchParams.set("availability", "1");
  url.searchParams.set("imageFlag", "1");
  url.searchParams.set("formatVersion", "2");

  try {
    const res = await fetch(url.toString(), {
      headers: rakutenHeaders(),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        `楽天API エラー ${res.status}: ${body?.errors?.errorMessage ?? res.statusText}`
      );
    }

    const data: RakutenResponse = await res.json();

    if (data.errors) {
      throw new Error(`楽天API エラー: ${data.errors.errorMessage}`);
    }

    const products = (data.Items ?? []).map(toProduct);

    return NextResponse.json({
      products,
      totalCount: data.count ?? products.length,
      source: "rakuten",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    console.error("[rakuten]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
