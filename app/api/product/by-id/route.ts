import { NextRequest, NextResponse } from "next/server";
import type { Product } from "@/types/product";

// 楽天 itemCode で1件取得
async function fetchRakutenById(itemCode: string): Promise<Product | null> {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!appId || !accessKey) return null;

  const url = new URL("https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401");
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("itemCode", itemCode);

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(url.toString(), {
    headers: { Origin: origin },
    next: { revalidate: 300 },
  });

  if (!res.ok) return null;

  const data = await res.json();
  const raw = data.Items?.[0];
  if (!raw) return null;

  const item = "Item" in raw ? raw.Item : raw;
  const medImg = item.mediumImageUrls?.[0]?.imageUrl ?? "";
  const image = medImg ? medImg.replace("_ex=128x128", "_ex=500x500") : "/images/no-image.png";
  const affiliateUrl = item.affiliateUrl || item.itemUrl || "";
  const features = (item.itemCaption ?? "")
    .split(/[。\n・]/).map((s: string) => s.trim())
    .filter((s: string) => s.length > 4 && s.length < 60).slice(0, 5);

  return {
    id: `rakuten_${item.itemCode}`,
    source: "rakuten",
    name: item.itemName,
    price: item.itemPrice,
    image,
    affiliateUrl,
    rating: item.reviewAverage ?? 0,
    reviewCount: item.reviewCount ?? 0,
    features,
    category: String(item.genreId ?? ""),
    availability: item.availability === 1,
    purchaseLinks: { rakuten: affiliateUrl },
  };
}

// Yahoo itemCode で1件取得
async function fetchYahooById(code: string): Promise<Product | null> {
  const clientId = process.env.YAHOO_CLIENT_ID;
  if (!clientId) return null;

  const url = new URL("https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch");
  url.searchParams.set("appid", clientId);
  url.searchParams.set("itemcode", code);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) return null;

  const data = await res.json();
  const hit = data.hits?.[0];
  if (!hit) return null;

  const image = hit.image?.large || hit.image?.medium || hit.image?.small || "/images/no-image.png";
  const desc = String(hit.description ?? "");
  const features = desc
    .split(/[。\n・、]/).map((s: string) => s.trim())
    .filter((s: string) => s.length > 4 && s.length < 60).slice(0, 5);

  return {
    id: `yahoo_${hit.code}`,
    source: "yahoo",
    name: hit.name,
    price: hit.priceLabel?.taxIncluded ?? hit.price ?? 0,
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
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id パラメータが必要です" }, { status: 400 });
  }

  try {
    let product: Product | null = null;

    if (id.startsWith("rakuten_")) {
      const itemCode = id.slice("rakuten_".length);
      product = await fetchRakutenById(itemCode);
    } else if (id.startsWith("yahoo_")) {
      const code = id.slice("yahoo_".length);
      product = await fetchYahooById(code);
    }

    if (!product) {
      return NextResponse.json({ error: "商品が見つかりませんでした" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    console.error("[product/by-id]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
