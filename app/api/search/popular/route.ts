import { redis } from "@/lib/redis";
import { searchRakuten } from "@/lib/api/rakuten";
import type { Product } from "@/types/product";

// 東京リージョン・1時間キャッシュ
export const preferredRegion = "hnd1";
export const revalidate = 3600;

type PopularResult = { products: Product[]; title: string };

const CACHE_KEY = "popular:products";

export async function GET() {
  // ① Redisキャッシュから即返す
  try {
    const cached = await redis.get<PopularResult>(CACHE_KEY);
    if (cached) {
      return Response.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }
  } catch {}

  // ② キャッシュなしのみ楽天を叩く
  const products = await searchRakuten({ keyword: "人気商品", hits: 12 });
  const result: PopularResult = {
    products: [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 12),
    title: "人気の商品",
  };

  try {
    await redis.set(CACHE_KEY, result, { ex: 3600 });
  } catch {}

  return Response.json(result, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
