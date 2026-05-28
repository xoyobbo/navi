import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchRakuten } from "@/lib/api/rakuten";
import { detectSituation } from "@/lib/situation-detector";
import type { Product } from "@/types/product";

export type PersonalizedSection = {
  keyword: string;
  products: Product[];
};

export type TopData = {
  products: Product[];
  popular: Product[];
  electronics: Product[];
  fashion: Product[];
  beauty: Product[];
  title: string;
  description: string;
  isPersonalized: boolean;
  topCategories: string[];
  situation: string;
  personalizedSections: PersonalizedSection[];
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 検索履歴から使えるキーワードに絞り込む
function extractTopKeywords(queries: string[]): string[] {
  return [...new Set(queries)]
    .filter((kw) => {
      if (!kw || kw.length < 2 || kw.length > 25) return false;
      // 助詞・文章っぽいもの・価格表記は除外
      if (/[？?。、！!]/.test(kw)) return false;
      if (/(が|は|を|に|で|の)(欲しい|ほしい|探して|教えて|ください)/.test(kw)) return false;
      if (/\d+(円|万)/.test(kw)) return false;
      return true;
    })
    .slice(0, 3);
}

export async function GET(): Promise<NextResponse<TopData>> {
  try {
    const { userId } = await auth();

    // 429 回避のため直列取得（Next.js が 60 秒キャッシュするので 2 回目以降は高速）
    const popular     = await searchRakuten({ keyword: "人気商品 おすすめ", hits: 10 });
    const electronics = await searchRakuten({ keyword: "家電", hits: 10 });
    const fashion     = await searchRakuten({ keyword: "ファッション", hits: 10 });
    const beauty      = await searchRakuten({ keyword: "美容 コスメ", hits: 10 });

    let title = "今日のおすすめ";
    let description = "";
    let situationKey = "unknown";
    let isPersonalized = false;
    let personalizedSections: PersonalizedSection[] = [];

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
          .limit(30);

        const historyQueries = (history ?? []).map((h) => h.query as string);
        const situation = detectSituation(historyQueries);

        console.log("=== レコメンド確認 ===");
        console.log("userId:", userId);
        console.log("履歴件数:", historyQueries.length);
        console.log("シチュエーション:", situation.situation, `(confidence: ${situation.confidence})`);

        situationKey = situation.situation;
        title = situation.sectionTitle;
        description = situation.sectionDescription;

        // 実際の検索履歴からキーワードを抽出してセクションを作る
        const topKeywords = extractTopKeywords(historyQueries);
        console.log("使用キーワード:", topKeywords);

        if (topKeywords.length > 0) {
          // キーワードごとに並列検索
          const sectionResults = await Promise.all(
            topKeywords.map(async (kw) => {
              const products = await searchRakuten({ keyword: kw, hits: 10 });
              return { keyword: kw, products };
            })
          );

          personalizedSections = sectionResults.filter((s) => s.products.length > 0);
          if (personalizedSections.length > 0) isPersonalized = true;
        }
      }
    }

    const allProducts =
      personalizedSections.length > 0
        ? personalizedSections.flatMap((s) => s.products).slice(0, 30)
        : popular;

    return NextResponse.json({
      products: allProducts,
      popular,
      electronics,
      fashion,
      beauty,
      title,
      description,
      isPersonalized,
      topCategories: [],
      situation: situationKey,
      personalizedSections,
    });
  } catch (e) {
    console.error("[top] エラー:", e);
    const empty: Product[] = [];
    return NextResponse.json({
      products: empty,
      popular: empty,
      electronics: empty,
      fashion: empty,
      beauty: empty,
      title: "今日のおすすめ",
      description: "",
      isPersonalized: false,
      topCategories: [],
      situation: "unknown",
      personalizedSections: [],
    });
  }
}
