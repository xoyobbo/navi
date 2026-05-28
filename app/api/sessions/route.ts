import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type SessionItem = {
  id: string;
  created_at: string;
  title: string;
};

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userRow?.id ?? null })
    .select("id")
    .single();

  if (error || !data) return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!userRow) return NextResponse.json({ sessions: [] });

  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("id, created_at")
    .eq("user_id", userRow.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!sessions?.length) return NextResponse.json({ sessions: [] });

  const sessionIds = sessions.map((s) => s.id);

  const { data: firstMessages } = await supabase
    .from("chat_messages")
    .select("session_id, content")
    .in("session_id", sessionIds)
    .eq("role", "user")
    .order("created_at", { ascending: true });

  const titleMap = new Map<string, string>();
  for (const msg of firstMessages ?? []) {
    if (!titleMap.has(msg.session_id)) {
      titleMap.set(msg.session_id, msg.content);
    }
  }

  const result: SessionItem[] = sessions
    .map((s) => ({
      id: s.id,
      created_at: s.created_at,
      title: titleMap.get(s.id) ?? "新しいチャット",
    }))
    .filter((s) => titleMap.has(s.id)); // メッセージなしのセッションは除外

  return NextResponse.json({ sessions: result });
}
