import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/types/product";

// サーバーサイド専用（型なしクライアントで型エラーを回避）
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  products?: Product[];
  created_at: string;
};

/** 新規チャットセッションを作成して session_id を返す */
export async function createSession(clerkUserId: string): Promise<string> {
  const supabase = getSupabase();
  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userRow?.id ?? null })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`セッション作成失敗: ${error?.message}`);
  }
  return data.id as string;
}

/** メッセージをSupabaseに保存する */
export async function saveMessage(
  sessionId: string,
  role: ChatRole,
  content: string,
  products?: Product[]
): Promise<void> {
  const supabase = getSupabase();
  const row: Record<string, unknown> = { session_id: sessionId, role, content };
  if (products && products.length > 0) row.products = products;
  const { error } = await supabase.from("chat_messages").insert(row);
  if (error) {
    console.error("メッセージ保存失敗:", error.message);
  }
}

/** セッションの過去メッセージを取得する（最大50件） */
export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("メッセージ取得失敗:", error.message);
    return [];
  }
  return (data ?? []) as ChatMessage[];
}
