import { NextRequest, NextResponse } from "next/server";
import type { Product } from "@/types/product";

// 楽天市場商品検索APIのレスポンス型（必要なフィールドのみ）
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
  availability: number; // 0: 取り寄せ, 1: 在庫あり
};

type RakutenResponse = {
  Items: { Item: RakutenItem }[];
  count: number;
  error?: string;
  error_description?: string;
};

function toProduct(item: RakutenItem): Product {
  const caption = item.itemCaption ?? "";
  // itemCaption から最大5個の特徴を抽出（句点・改行で分割）
  const features = caption
    .split(/[。\n・]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && s.length < 60)
    .slice(0, 5);

  return {
    id: `rakuten_${item.itemCode}`,
    source: "rakuten",
    name: item.itemName,
    price: item.itemPrice,
    image: item.mediumImageUrls[0]?.imageUrl ?? "",
    affiliateUrl: item.affiliateUrl || item.itemUrl,
    rating: item.reviewAverage ?? 0,
    reviewCount: item.reviewCount ?? 0,
    features,
    category: item.genreName ?? "",
    availability: item.availability === 1,
  };
}

export async function GET(req: NextRequest) {
  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "RAKUTEN_APP_ID が設定されていません" },
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

  const url = new URL("https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706");
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("keyword", query);
  url.searchParams.set("hits", String(perPage));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "+itemPrice"); // デフォルトは価格昇順
  url.searchParams.set("availability", "1");
  url.searchParams.set("imageFlag", "1");
  url.searchParams.set("formatVersion", "2");

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 60 }, // 1分キャッシュ
    });

    if (!res.ok) {
      throw new Error(`楽天API HTTP エラー: ${res.status}`);
    }

    const data: RakutenResponse = await res.json();

    if (data.error) {
      throw new Error(`楽天API エラー: ${data.error_description ?? data.error}`);
    }

    const products = (data.Items ?? []).map((wrapper) =>
      toProduct(wrapper.Item ?? wrapper as unknown as RakutenItem)
    );

    return NextResponse.json({
      products,
      totalCount: data.count ?? products.length,
      source: "rakuten",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    console.error("[rakuten] 検索失敗:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
