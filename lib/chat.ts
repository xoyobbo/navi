import { createClient } from "@supabase/supabase-js";

// サーバーサイド専用（型なしクライアントで型エラーを回避）
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

/** 新規チャットセッションを作成して session_id を返す */
export async function createSession(userId: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId })
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
  content: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role,
    content,
  });
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
