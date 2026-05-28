import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const supabase = getSupabase();
  const { data: userRow } = await supabase
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!userRow) return NextResponse.json({ alerts: [] });

  const { data: alerts } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("user_id", userRow.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ alerts: alerts ?? [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未認証" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }

  const { product_id, product_name, product_url, source, target_price, current_price } = body;
  if (!product_id || !product_name || !target_price) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: userRow } = await supabase
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!userRow) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const { data, error } = await supabase
    .from("price_alerts")
    .insert({
      user_id: userRow.id,
      product_id,
      product_name,
      product_url: product_url ?? "",
      source: source ?? "rakuten",
      target_price: Number(target_price),
      current_price: Number(current_price ?? 0),
      is_triggered: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alert: data });
}
