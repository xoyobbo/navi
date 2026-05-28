import { createClient } from "@supabase/supabase-js";
import { detectSituation } from "./situation-detector";

export interface Category {
  label: string;
  keyword: string;
  isPersonalized: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { label: "家電", keyword: "家電", isPersonalized: false },
  { label: "ファッション", keyword: "ファッション", isPersonalized: false },
  { label: "美容", keyword: "コスメ 美容", isPersonalized: false },
  { label: "食品", keyword: "食品 グルメ", isPersonalized: false },
  { label: "スポーツ", keyword: "スポーツ", isPersonalized: false },
];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getPersonalizedCategories(userId: string): Promise<Category[]> {
  const supabase = getSupabase();

  const { data: history } = await supabase
    .from("search_history")
    .select("query")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!history?.length) {
    return DEFAULT_CATEGORIES;
  }

  const situation = detectSituation(history.map((h) => h.query as string));

  const customCategories: Category[] = [];

  switch (situation.situation) {
    case "new_life":
      customCategories.push(
        { label: "🏠 新生活", keyword: "一人暮らし 家電", isPersonalized: true },
        { label: "🍳 キッチン", keyword: "キッチン 調理器具", isPersonalized: true }
      );
      break;
    case "hobby_reading":
      customCategories.push(
        { label: "📚 おすすめ本", keyword: "ベストセラー 小説", isPersonalized: true },
        { label: "📖 読書グッズ", keyword: "読書 ブックカバー", isPersonalized: true }
      );
      break;
    case "fitness":
      customCategories.push(
        { label: "💪 トレーニング", keyword: "筋トレ グッズ", isPersonalized: true },
        { label: "🥤 プロテイン", keyword: "プロテイン サプリ", isPersonalized: true }
      );
      break;
    case "tech_lover":
      customCategories.push(
        { label: "🎧 ガジェット", keyword: "最新 ガジェット", isPersonalized: true },
        { label: "💻 PC周辺", keyword: "テレワーク PC", isPersonalized: true }
      );
      break;
  }

  return [
    ...customCategories.slice(0, 2),
    ...DEFAULT_CATEGORIES.slice(0, 3),
  ];
}
