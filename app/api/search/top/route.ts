import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchRakuten } from "@/lib/api/rakuten";
import type { Product } from "@/types/product";

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

// 直近の検索履歴から重複を除いた最新5件を取得
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

export async function GET(): Promise<NextResponse<TopData>> {
  try {
    const { userId } = await auth();

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

        console.log("直近キーワード:", recentKeywords);

        if (recentKeywords.length > 0) {
          const results = await Promise.all(
            recentKeywords.map(async (kw) => {
              // sort=standard で毎回同じ順序を保つ
              const products = await searchRakuten({ keyword: kw, hits: 10 });
              // 上位10件を固定（ランダム性を排除）
              return { keyword: kw, products: products.slice(0, 10) };
            })
          );

          personalizedSections = results.filter((s) => s.products.length > 0);
          if (personalizedSections.length > 0) isPersonalized = true;
        }
      }
    }

    return NextResponse.json(
      { personalizedSections, isPersonalized },
      { headers: { "Cache-Control": "private, max-age=300" } } // 5分キャッシュ
    );
  } catch (e) {
    console.error("[top] エラー:", e);
    return NextResponse.json({ personalizedSections: [], isPersonalized: false });
  }
}
