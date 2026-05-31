import { NextRequest, NextResponse } from "next/server";
import type { Product } from "@/types/product";
import { normalizeKeyword } from "@/lib/search-utils";
import { validateKeyword, validatePrice } from "@/lib/validation";
import { calcTrustLevel, calcTotalScore } from "@/lib/scoring";

export const maxDuration = 15

type RakutenItem = {
  itemCode: string;
  itemName: string;
  itemPrice: number;
  mediumImageUrls: { imageUrl: string }[];
  largeImageUrls?: { imageUrl: string }[];
  affiliateUrl: string;
  itemUrl: string;
  reviewAverage: number;
  reviewCount: number;
  itemCaption: string;
  genreId: string;
  availability: number;
};

type RakutenResponse = {
  count: number;
  Items: (RakutenItem | { Item: RakutenItem })[];
  errors?: { errorCode: number; errorMessage: string };
};

function toHighResUrl(url: string): string {
  return url.replace(/_ex=\d+x\d+/, "_ex=500x500");
}

function toProduct(raw: RakutenItem | { Item: RakutenItem }): Product {
  const item: RakutenItem = "Item" in raw ? raw.Item : raw;

  const largeImages = (item.largeImageUrls ?? [])
    .map((img) => toHighResUrl(img.imageUrl))
    .filter(Boolean);

  const mediumImages = (item.mediumImageUrls ?? [])
    .map((img) => toHighResUrl(img.imageUrl))
    .filter(Boolean);

  // 重複除去
  const allImages = [...largeImages, ...mediumImages].filter(
    (url, index, self) => self.indexOf(url) === index
  );

  const baseImage = allImages[0] ?? "/images/no-image.png";

  // 5枚未満の場合は先頭画像で埋める
  const images =
    allImages.length >= 5
      ? allImages.slice(0, 8)
      : allImages.length > 0
      ? [...allImages, ...Array(5 - allImages.length).fill(baseImage)]
      : Array(5).fill(baseImage);

  const image = images[0];

  const features = (item.itemCaption ?? "")
    .split(/[。\n・]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && s.length < 60)
    .slice(0, 5);

  const affiliateUrl = item.affiliateUrl || item.itemUrl;
  const rating = item.reviewAverage ?? 0;
  const reviewCount = item.reviewCount ?? 0;
  return {
    id: `rakuten_${item.itemCode}`,
    source: "rakuten",
    name: item.itemName,
    price: item.itemPrice,
    image,
    images,
    affiliateUrl,
    rating,
    reviewCount,
    features,
    category: String(item.genreId ?? ""),
    availability: item.availability === 1,
    purchaseLinks: { rakuten: affiliateUrl },
    trustLevel: calcTrustLevel(rating, reviewCount),
    totalScore: calcTotalScore(rating, reviewCount),
  };
}

const HITS = 30; // Rakuten API の1リクエスト最大件数

export async function GET(req: NextRequest) {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  if (!appId || !accessKey) {
    return NextResponse.json(
      { error: "RAKUTEN_APP_ID または RAKUTEN_ACCESS_KEY が設定されていません" },
      { status: 500 }
    );
  }

  const { searchParams } = req.nextUrl;
  const rawQuery = searchParams.get("q") ?? "";

  const { isValid, cleaned, error: validationError } = validateKeyword(rawQuery);
  if (!isValid) {
    return NextResponse.json({ products: [], error: validationError }, { status: 400 });
  }

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const minPrice = validatePrice(Number(searchParams.get("minPrice")));
  const maxPrice = validatePrice(Number(searchParams.get("maxPrice")));

  const normalizedQuery = normalizeKeyword(cleaned);

  const url = new URL(
    "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401"
  );
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("keyword", normalizedQuery);
  url.searchParams.set("hits", String(HITS));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "standard");
  url.searchParams.set("availability", "1");
  url.searchParams.set("imageFlag", "1");
  if (affiliateId) url.searchParams.set("affiliateId", affiliateId);
  if (minPrice !== null) url.searchParams.set("minPrice", String(minPrice));
  if (maxPrice !== null) url.searchParams.set("maxPrice", String(maxPrice));

  try {
    const res = await fetch(url.toString(), {
      headers: { Origin: "https://navi-tawny.vercel.app" },
      cache: "no-store",
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

    const allProducts = (data.Items ?? []).map(toProduct);

    // 商品名にキーワードが含まれるものだけに絞る
    // フィルタ後に0件になる場合（英語クエリ→日本語商品名など）は元の結果を使う
    const kw = normalizedQuery.toLowerCase();
    const words = kw.split(/\s+/).filter(Boolean);
    let products = allProducts;
    if (words.length > 0) {
      const filtered = allProducts.filter((p) => {
        const name = p.name.toLowerCase();
        return words.some((word) => name.includes(word));
      });
      if (filtered.length > 0) products = filtered;
    }

    // high → medium → low の順に並べる
    const trustOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    products = [...products].sort((a, b) => {
      const ta = trustOrder[a.trustLevel ?? "medium"];
      const tb = trustOrder[b.trustLevel ?? "medium"];
      if (ta !== tb) return ta - tb;
      return b.reviewCount - a.reviewCount;
    });

    const total = data.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / HITS));

    return NextResponse.json({
      products,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    console.error("[rakuten]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
