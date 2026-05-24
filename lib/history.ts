import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** 検索キーワードをSupabaseに保存する（失敗しても処理は続行） */
export async function saveSearchHistory(
  userId: string,
  query: string
): Promise<void> {
  if (!userId || !query.trim()) return;

  const supabase = getSupabase();

  // users テーブルから内部 id を取得
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user?.id) return;

  await supabase.from("search_history").insert({
    user_id: user.id,
    query: query.trim(),
  });
}
