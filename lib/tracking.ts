import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type ActionType = "click" | "favorite" | "purchase_click";

export type ActionPayload = {
  action_type: ActionType;
  product_id: string;
  product_name: string;
  product_category: string;
  product_price: number;
  source: string;
};

export async function logAction(clerkUserId: string, payload: ActionPayload): Promise<void> {
  const supabase = getSupabase();

  const { data: userRow } = await supabase
    .from("users").select("id").eq("clerk_id", clerkUserId).single();
  if (!userRow) return;

  await supabase.from("user_actions").insert({ user_id: userRow.id, ...payload });

  // 10回ごとに好みを再分析
  const { count } = await supabase
    .from("user_actions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userRow.id);

  if (count && count % 5 === 0) {
    await analyzeAndUpdatePreferences(userRow.id);
  }
}

async function analyzeAndUpdatePreferences(userId: string): Promise<void> {
  const supabase = getSupabase();

  const { data: actions } = await supabase
    .from("user_actions")
    .select("product_category, product_price, source")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!actions?.length) return;

  // カテゴリTop3
  const catCount: Record<string, number> = {};
  for (const a of actions) {
    if (a.product_category) catCount[a.product_category] = (catCount[a.product_category] ?? 0) + 1;
  }
  const favoriteCategories = Object.entries(catCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([c]) => c);

  // 価格帯（10〜90パーセンタイル）
  const prices = actions.map((a) => a.product_price as number).filter((p) => p > 0).sort((a, b) => a - b);
  const priceMin = prices[Math.floor(prices.length * 0.1)] ?? 0;
  const priceMax = prices[Math.floor(prices.length * 0.9)] ?? 100000;

  // 購入先Top2
  const srcCount: Record<string, number> = {};
  for (const a of actions) {
    if (a.source) srcCount[a.source] = (srcCount[a.source] ?? 0) + 1;
  }
  const favoriteSources = Object.entries(srcCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([s]) => s);

  await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      favorite_categories: favoriteCategories,
      price_range_min: priceMin,
      price_range_max: priceMax,
      favorite_sources: favoriteSources,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}
