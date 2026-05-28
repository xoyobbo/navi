import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false });

    let body: {
      actionType: string;
      productId: string;
      productName?: string;
      productCategory: string;
      productPrice: number;
      source: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
    }
    const supabase = getSupabase();

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    let dbUserId = userRow?.id as string | undefined;

    if (!dbUserId) {
      const { data: newUser } = await supabase
        .from("users")
        .insert({ clerk_id: userId })
        .select("id")
        .single();
      dbUserId = newUser?.id as string | undefined;
    }

    if (!dbUserId) {
      console.error("[track] ユーザー作成失敗");
      return NextResponse.json({ ok: false, error: "ユーザー作成失敗" });
    }

    const { error } = await supabase
      .from("user_actions")
      .insert({
        user_id: dbUserId,
        action_type: body.actionType,
        product_id: body.productId,
        product_name: body.productName ?? "",
        product_category: body.productCategory,
        product_price: body.productPrice,
        source: body.source,
      });

    if (error) {
      console.error("[track] 挿入エラー:", error.message);
      return NextResponse.json({ ok: false, error: error.message });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[track] エラー:", e);
    return NextResponse.json({ ok: false });
  }
}
