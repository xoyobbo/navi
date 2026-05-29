import type { Product } from "@/types/product";
import { normalizeKeyword } from "@/lib/search-utils";

interface RakutenSearchParams {
  keyword: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  hits?: number;
  page?: number;
}

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
  const allImages = [...largeImages, ...mediumImages].filter(
    (url, i, self) => self.indexOf(url) === i
  );
  const baseImage = allImages[0] ?? "/images/no-image.png";
  const images =
    allImages.length >= 5
      ? allImages.slice(0, 8)
      : allImages.length > 0
      ? [...allImages, ...Array(5 - allImages.length).fill(baseImage)]
      : Array(5).fill(baseImage);

  const features = (item.itemCaption ?? "")
    .split(/[。\n・]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && s.length < 60)
    .slice(0, 5);

  const affiliateUrl = item.affiliateUrl || item.itemUrl;
  return {
    id: `rakuten_${item.itemCode}`,
    source: "rakuten",
    name: item.itemName,
    price: item.itemPrice,
    image: images[0],
    images,
    affiliateUrl,
    purchaseLinks: { rakuten: affiliateUrl },
    rating: item.reviewAverage ?? 0,
    reviewCount: item.reviewCount ?? 0,
    features,
    category: String(item.genreId ?? ""),
    availability: item.availability === 1,
  };
}

export async function searchRakuten(params: RakutenSearchParams): Promise<Product[]> {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!appId || !accessKey) {
    console.error("[rakuten] RAKUTEN_APP_ID または RAKUTEN_ACCESS_KEY が未設定");
    return [];
  }

  try {
    const keyword = normalizeKeyword(params.keyword);
    const url = new URL(
      "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401"
    );
    url.searchParams.set("applicationId", appId);
    url.searchParams.set("accessKey", accessKey);
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("hits", String(Math.min(params.hits ?? 30, 30)));
    url.searchParams.set("page", String(params.page ?? 1));
    url.searchParams.set("sort", "standard");
    url.searchParams.set("availability", "1");
    url.searchParams.set("imageFlag", "1");
    if (params.minPrice) url.searchParams.set("minPrice", String(params.minPrice));
    if (params.maxPrice) url.searchParams.set("maxPrice", String(params.maxPrice));

    const res = await fetch(url.toString(), {
      headers: { Origin: "https://navi-tawny.vercel.app" },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[rakuten] APIエラー:", res.status, body);
      return [];
    }

    const data = await res.json();
    if (!data.Items?.length) {
      console.warn("[rakuten] 0件:", keyword, "status:", res.status);
      return [];
    }

    return (data.Items as (RakutenItem | { Item: RakutenItem })[])
      .map(toProduct)
      .filter((p) => !p.name.includes("ふるさと納税"));
  } catch (e) {
    console.error("[rakuten] 例外:", e);
    return [];
  }
}
