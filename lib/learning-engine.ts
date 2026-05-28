import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const KNOWN_BRANDS = [
  "Sony", "Bose", "Apple", "Samsung", "Panasonic",
  "Dyson", "Anker", "JBL", "Nike", "Adidas", "Uniqlo",
  "Sharp", "Toshiba", "Hitachi", "Yamaha", "Canon", "Nikon",
];

export async function updateUserProfile(userId: string) {
  const supabase = getSupabase();

  const [{ data: insights }, { data: actions }, { data: favorites }, { data: feedback }] =
    await Promise.all([
      supabase
        .from("conversation_insights")
        .select("liked_product_price, liked_product_category")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("user_actions")
        .select("action_type, product_name, product_category")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("favorites")
        .select("product_price, product_category, product_name")
        .eq("user_id", userId)
        .limit(50),
      supabase
        .from("product_feedback")
        .select("feedback_type, product_category")
        .eq("user_id", userId)
        .limit(50),
    ]);

  // 価格帯を分析
  const allPrices = [
    ...(insights ?? []).map((i) => i.liked_product_price).filter(Boolean),
    ...(favorites ?? []).map((f) => f.product_price).filter(Boolean),
  ] as number[];

  const avgPrice = allPrices.length
    ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length
    : 50000;

  const preferred_price_min = Math.floor(avgPrice * 0.5);
  const preferred_price_max = Math.ceil(avgPrice * 1.5);

  // よく見るカテゴリ
  const categoryCount: Record<string, number> = {};
  [
    ...(insights ?? []).map((i) => i.liked_product_category),
    ...(actions ?? []).map((a) => a.product_category),
    ...(favorites ?? []).map((f) => f.product_category),
  ]
    .filter(Boolean)
    .forEach((cat) => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

  const preferred_categories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  // よく選ぶブランド
  const brandCount: Record<string, number> = {};
  [
    ...(favorites ?? []).map((f) => f.product_name),
    ...(actions ?? [])
      .filter((a) => a.action_type === "purchase_click")
      .map((a) => a.product_name),
  ]
    .filter(Boolean)
    .forEach((name) => {
      KNOWN_BRANDS.forEach((brand) => {
        if (name.toLowerCase().includes(brand.toLowerCase())) {
          brandCount[brand] = (brandCount[brand] || 0) + 1;
        }
      });
    });

  const preferred_brands = Object.entries(brandCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([brand]) => brand);

  // 「これじゃない」カテゴリ
  const disliked_features = (feedback ?? [])
    .filter((f) => f.feedback_type === "not_for_me")
    .map((f) => f.product_category)
    .filter(Boolean)
    .slice(0, 5) as string[];

  await supabase.from("user_profiles").upsert({
    user_id: userId,
    preferred_price_min,
    preferred_price_max,
    preferred_categories,
    preferred_brands,
    disliked_features,
    total_searches: insights?.length ?? 0,
    total_clicks: actions?.length ?? 0,
    total_favorites: favorites?.length ?? 0,
    learning_version: Date.now(),
    updated_at: new Date().toISOString(),
  });

  return { preferred_price_min, preferred_price_max, preferred_categories, preferred_brands };
}

export async function buildLearnedContext(userId: string): Promise<string> {
  const supabase = getSupabase();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!profile) return "";

  // 3回未満の検索では学習データが少ないので使わない
  if ((profile.total_searches ?? 0) < 3) return "";

  return `
## このユーザーについて学習した情報

【購買傾向】
- よく買う価格帯：${profile.preferred_price_min?.toLocaleString()}円〜${profile.preferred_price_max?.toLocaleString()}円
- 好きなカテゴリ：${(profile.preferred_categories as string[])?.join("・") || "まだ不明"}
- よく選ぶブランド：${(profile.preferred_brands as string[])?.join("・") || "こだわりなし"}

【注意点】
- 以下のカテゴリは過去に「これじゃない」と言っていた：${(profile.disliked_features as string[])?.join("・") || "なし"}

【接客のヒント】
- ${profile.total_searches}回検索経験あり・${profile.total_favorites}件お気に入り登録済みのリピーター
- 基本的な質問（予算など）は前回の傾向を参考に提案してOK

この情報を自然に活かして、まるで「常連客を知っているショップスタッフ」のように接客してください。「あなたのデータによると」のような言い方はしない。`.trim();
}
