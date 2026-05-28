import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未認証" }, { status: 401 });

  let subscription: unknown;
  try {
    const body = await req.json();
    subscription = body.subscription;
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }
  if (!subscription) return NextResponse.json({ error: "subscription が必要です" }, { status: 400 });

  const supabase = getSupabase();
  const { data: userRow } = await supabase
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!userRow) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  // 同じendpointのサブスクリプションがあれば更新、なければ挿入
  const endpoint = (subscription as { endpoint: string }).endpoint;
  const { data: rows } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", userRow.id);

  const existing = (rows ?? []).find(
    (r) => (r.subscription as { endpoint: string }).endpoint === endpoint
  );

  if (existing) {
    await supabase.from("push_subscriptions")
      .update({ subscription })
      .eq("id", existing.id);
  } else {
    await supabase.from("push_subscriptions")
      .insert({ user_id: userRow.id, subscription });
  }

  return NextResponse.json({ ok: true });
}
