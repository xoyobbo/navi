import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const DEFAULT_SOURCES = ["rakuten", "yahoo"];

/**
 * ログイン中ユーザーのショッピングサイト設定（user_profiles.preferred_sources）を返す。
 * サーバー側で auth() + Supabase を直接参照する。
 * ※ 以前は各APIから `${NEXT_PUBLIC_SITE_URL}/api/user/preferences` へ自己HTTP
 *    fetch していたが、apex→www の307リダイレクトと、保護ルートの auth.protect()
 *    が返す404で失敗し、常にデフォルト（楽天先頭）に落ちて Yahoo 選択が無視されていた。
 *    直接参照に変えて解消する。
 * 未ログイン・未設定・エラー時はデフォルト ["rakuten","yahoo"] を返す。
 */
export async function getPreferredSources(): Promise<string[]> {
  try {
    const { userId } = await auth();
    if (!userId) return DEFAULT_SOURCES;

    const supabase = getSupabase();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();
    if (!user) return DEFAULT_SOURCES;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("preferred_sources")
      .eq("user_id", user.id)
      .single();

    const sources = profile?.preferred_sources;
    return Array.isArray(sources) && sources.length > 0 ? sources : DEFAULT_SOURCES;
  } catch {
    return DEFAULT_SOURCES;
  }
}

export type UserPreferences = {
  favorite_categories: string[];
  price_range_min: number;
  price_range_max: number;
  favorite_sources: string[];
};

export async function getUserPreferences(clerkUserId: string): Promise<UserPreferences | null> {
  const supabase = getSupabase();

  const { data: userRow } = await supabase
    .from("users").select("id").eq("clerk_id", clerkUserId).single();
  if (!userRow) return null;

  const { data } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userRow.id)
    .single();

  if (!data) return null;

  return {
    favorite_categories: (data.favorite_categories as string[]) ?? [],
    price_range_min: (data.price_range_min as number) ?? 0,
    price_range_max: (data.price_range_max as number) ?? 100000,
    favorite_sources: (data.favorite_sources as string[]) ?? [],
  };
}

export function preferencesToPromptContext(prefs: UserPreferences): string {
  if (!prefs.favorite_categories.length) return "";
  return [
    "\n\n【このユーザーの過去の行動傾向】",
    `よく見るカテゴリ：${prefs.favorite_categories.join("、")}`,
    `よく購入する価格帯：¥${prefs.price_range_min.toLocaleString()}〜¥${prefs.price_range_max.toLocaleString()}`,
    prefs.favorite_sources.length ? `よく使う購入先：${prefs.favorite_sources.join("、")}` : null,
    "この情報を参考にして、ユーザーの好みに合った商品を優先的に推薦してください。",
  ]
    .filter(Boolean)
    .join("\n");
}
