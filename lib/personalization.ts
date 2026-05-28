import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type UserBehavior = {
  topKeywords: string[];
  topCategories: string[];
  priceStats: { median: number; min: number; max: number } | null;
  favoriteCategories: string[];
};

export async function aggregateUserBehavior(clerkUserId: string): Promise<UserBehavior> {
  const supabase = getSupabase();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  if (!userRow) {
    return { topKeywords: [], topCategories: [], priceStats: null, favoriteCategories: [] };
  }

  const userId = userRow.id as string;

  const [searchRes, clickRes, priceRes, favRes] = await Promise.allSettled([
    // ① よく検索するキーワード（search_historyから）
    supabase
      .from("search_history")
      .select("query")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    // ② よくクリックするカテゴリ
    supabase
      .from("user_actions")
      .select("product_category")
      .eq("user_id", userId)
      .eq("action_type", "click")
      .limit(200),
    // ③ よく見る価格帯
    supabase
      .from("user_actions")
      .select("product_price")
      .eq("user_id", userId)
      .gt("product_price", 0)
      .limit(200),
    // ④ お気に入りのカテゴリ
    supabase
      .from("user_actions")
      .select("product_category")
      .eq("user_id", userId)
      .eq("action_type", "favorite")
      .limit(100),
  ]);

  // ① キーワード集計 Top5
  const searchRows = searchRes.status === "fulfilled" ? (searchRes.value.data ?? []) : [];
  const queryCount: Record<string, number> = {};
  for (const row of searchRows) {
    if (row.query) queryCount[row.query] = (queryCount[row.query] ?? 0) + 1;
  }
  const topKeywords = Object.entries(queryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([q]) => q);

  // ② クリックカテゴリ集計 Top3
  const clickRows = clickRes.status === "fulfilled" ? (clickRes.value.data ?? []) : [];
  const catCount: Record<string, number> = {};
  for (const row of clickRows) {
    if (row.product_category) catCount[row.product_category] = (catCount[row.product_category] ?? 0) + 1;
  }
  const topCategories = Object.entries(catCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([c]) => c);

  // ③ 価格帯（中央値・最小・最大）
  const priceRows = priceRes.status === "fulfilled" ? (priceRes.value.data ?? []) : [];
  let priceStats: { median: number; min: number; max: number } | null = null;
  if (priceRows.length > 0) {
    const prices = priceRows.map((a) => a.product_price as number).sort((a, b) => a - b);
    priceStats = {
      median: prices[Math.floor(prices.length / 2)],
      min: prices[0],
      max: prices[prices.length - 1],
    };
  }

  // ④ お気に入りカテゴリ Top3
  const favRows = favRes.status === "fulfilled" ? (favRes.value.data ?? []) : [];
  const favCatCount: Record<string, number> = {};
  for (const row of favRows) {
    if (row.product_category) favCatCount[row.product_category] = (favCatCount[row.product_category] ?? 0) + 1;
  }
  const favoriteCategories = Object.entries(favCatCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([c]) => c);

  return { topKeywords, topCategories, priceStats, favoriteCategories };
}

export async function getUserProfile(clerkUserId: string): Promise<string | null> {
  const behavior = await aggregateUserBehavior(clerkUserId);

  const hasData =
    behavior.topKeywords.length > 0 ||
    behavior.topCategories.length > 0 ||
    behavior.favoriteCategories.length > 0;

  if (!hasData) return null;

  const keywords = behavior.topKeywords.length ? behavior.topKeywords.join("、") : "なし";
  const categories = behavior.topCategories.length ? behavior.topCategories.join("、") : "なし";
  const priceRange = behavior.priceStats
    ? `${behavior.priceStats.median.toLocaleString()}円前後（${behavior.priceStats.min.toLocaleString()}〜${behavior.priceStats.max.toLocaleString()}円）`
    : "不明";
  const favorites = behavior.favoriteCategories.length ? behavior.favoriteCategories.join("、") : "なし";

  return `このユーザーの傾向：
- よく検索するもの：${keywords}
- 興味のあるカテゴリ：${categories}
- よく見る価格帯：${priceRange}
- お気に入りのカテゴリ：${favorites}`;
}
