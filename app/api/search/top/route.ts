import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchRakuten } from "@/lib/api/rakuten";
import { redis } from "@/lib/redis";
import type { Product } from "@/types/product";

// 東京リージョンで実行（楽天APIのレイテンシを削減）
export const preferredRegion = "hnd1";

export type PersonalizedSection = {
  keyword: string;
  products: Product[];
};

export type TopData = {
  personalizedSections: PersonalizedSection[];
  isPersonalized: boolean;
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function extractRecentKeywords(queries: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const kw of queries) {
    if (!kw || kw.length < 2 || kw.length > 25) continue;
    if (/[？?。、！!]/.test(kw)) continue;
    if (/(が|は|を|に|で|の)(欲しい|ほしい|探して|教えて|ください)/.test(kw)) continue;
    if (/\d+(円|万)/.test(kw)) continue;
    if (seen.has(kw)) continue;
    seen.add(kw);
    result.push(kw);
    if (result.length === 5) break;
  }
  return result;
}

// 商品取得のコア処理を関数化
async function buildRecommendations(userId: string | null): Promise<TopData> {
  let personalizedSections: PersonalizedSection[] = [];
  let isPersonalized = false;

  if (userId) {
    const supabase = getSupabase();

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (user) {
      const { data: history } = await supabase
        .from("search_history")
        .select("query")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const historyQueries = (history ?? []).map((h) => h.query as string);
      const recentKeywords = extractRecentKeywords(historyQueries);

      if (recentKeywords.length > 0) {
        const results = await Promise.all(
          recentKeywords.map(async (kw) => {
            const kwKey = `kw:${kw.toLowerCase()}`;
            try {
              const hit = await redis.get<{ keyword: string; products: Product[] }>(kwKey);
              if (hit) return hit;
            } catch {}

            // 取得件数を20→12に削減（高速化）
            const products = await searchRakuten({ keyword: kw, hits: 12 });
            const stable = [...products]
              .sort((a, b) => b.reviewCount - a.reviewCount)
              .slice(0, 10);
            const section = { keyword: kw, products: stable };

            try {
              await redis.set(kwKey, section, { ex: 7200 });
            } catch {}

            return section;
          })
        );

        personalizedSections = results.filter((s) => s.products.length > 0);
        if (personalizedSections.length > 0) isPersonalized = true;
      }
    }
  }

  return { personalizedSections, isPersonalized };
}

// バックグラウンドでキャッシュを更新（レスポンスを遅らせない）
function refreshCacheInBackground(cacheKey: string, userId: string | null): void {
  buildRecommendations(userId)
    .then((data) => redis.set(cacheKey, data, { ex: 21600 }))
    .catch((e) => console.error("[top] バックグラウンド更新失敗:", e));
}

export async function GET(): Promise<NextResponse<TopData>> {
  try {
    const { userId } = await auth();
    const cacheKey = `recommend:${userId || "guest"}`;

    // ① キャッシュHIT → 即座に返してバックグラウンドで更新
    try {
      const cached = await redis.get<TopData>(cacheKey);
      if (cached) {
        refreshCacheInBackground(cacheKey, userId);
        return NextResponse.json(cached, {
          headers: {
            "Cache-Control": "public, max-age=60, stale-while-revalidate=3600",
          },
        });
      }
    } catch (e) {
      console.error("[top] キャッシュ取得エラー:", e);
    }

    // ② キャッシュMISS → 取得してキャッシュ保存
    const result = await buildRecommendations(userId);

    try {
      await redis.set(cacheKey, result, { ex: 21600 });
    } catch (e) {
      console.error("[top] キャッシュ保存エラー:", e);
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[top] エラー:", e);
    return NextResponse.json({ personalizedSections: [], isPersonalized: false });
  }
}
