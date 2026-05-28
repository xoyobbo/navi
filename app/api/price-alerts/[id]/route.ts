import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const supabase = getSupabase();
  const { data: userRow } = await supabase
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!userRow) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const { error } = await supabase
    .from("price_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", userRow.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
