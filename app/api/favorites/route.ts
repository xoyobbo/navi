import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user?.id) return NextResponse.json({ favorites: [] });

  const { data } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ favorites: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const { product_id, product_name, product_price, product_image, product_url, source } = body;

  const supabase = getSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user?.id) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", product_id)
    .single();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  }

  await supabase.from("favorites").insert({
    user_id: user.id,
    product_id,
    product_name,
    product_price,
    product_image,
    product_url,
    source,
  });
  return NextResponse.json({ action: "added" });
}
