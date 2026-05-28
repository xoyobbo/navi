import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateUserProfile } from "@/lib/learning-engine";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ ok: false });

    const supabase = getSupabase();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!user) return Response.json({ ok: false });

    // お気に入り件数を確認して 10 の倍数のときだけ更新（購入クリックは常に更新）
    const { count: favCount } = await supabase
      .from("favorites")
      .select("id", { count: "exact" })
      .eq("user_id", user.id);

    const { count: purchaseCount } = await supabase
      .from("user_actions")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .eq("action_type", "purchase_click");

    const shouldUpdate =
      (purchaseCount ?? 0) > 0 ||          // 購入クリックがあれば常に更新
      ((favCount ?? 0) > 0 && (favCount ?? 0) % 10 === 0); // お気に入り10件ごと

    if (shouldUpdate) {
      await updateUserProfile(user.id);
    }

    return Response.json({ ok: true, updated: shouldUpdate });
  } catch (e) {
    console.error("[profile/update] error:", e);
    return Response.json({ ok: false });
  }
}
