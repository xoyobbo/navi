import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** 検索キーワードをSupabaseに保存する（失敗しても処理は続行） */
export async function saveSearchHistory(
  clerkUserId: string,
  query: string
): Promise<void> {
  if (!clerkUserId || !query.trim()) return;

  const supabase = getSupabase();

  // users テーブルから内部 id を取得
  let { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  // ユーザーが存在しない場合は作成する
  if (!user?.id) {
    const { data: newUser } = await supabase
      .from("users")
      .insert({ clerk_id: clerkUserId })
      .select("id")
      .single();
    user = newUser;
  }

  if (!user?.id) {
    console.warn("[history] ユーザー取得/作成失敗 clerk_id:", clerkUserId);
    return;
  }

  const { error } = await supabase.from("search_history").insert({
    user_id: user.id,
    query: query.trim(),
  });

  if (error) {
    console.error("[history] 保存失敗:", error.message);
  }
}
