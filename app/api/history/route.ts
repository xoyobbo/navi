import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizeQueryKeyword(q: string): string {
  return q
    .replace(/[？?。、！!]/g, "")
    .replace(/\d+万円(以内|以上|くらい|程度)?/g, "")
    .replace(/\d+(円|万)(以内|以上|くらい|程度)?/g, "")
    .replace(/(おすすめ|人気|安い|高い|最高|良い)(の|は|な)?/g, "")
    .replace(/(が|は|を|に)(欲しい|探している|ください|教えて)/g, "")
    .replace(/(で|の)$/, "")
    .trim()
    .slice(0, 20);
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ history: [] });

  const supabase = getSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user?.id) return NextResponse.json({ history: [] });

  const { data } = await supabase
    .from("search_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ history: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false });

    const { query } = await req.json().catch(() => ({}));
    if (!query?.trim()) return NextResponse.json({ ok: false });

    const normalized = normalizeQueryKeyword(query.trim());
    if (!normalized) return NextResponse.json({ ok: false });

    const supabase = getSupabase();

    let { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!user?.id) {
      const { data: newUser } = await supabase
        .from("users")
        .insert({ clerk_id: userId })
        .select("id")
        .single();
      user = newUser;
    }

    if (!user?.id) return NextResponse.json({ ok: false });

    const { error } = await supabase.from("search_history").insert({
      user_id: user.id,
      query: normalized,
    });

    if (error) {
      console.error("[history] POST 保存失敗:", error.message);
      return NextResponse.json({ ok: false });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[history] POST エラー:", e);
    return NextResponse.json({ ok: false });
  }
}
