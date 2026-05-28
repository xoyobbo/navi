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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ ok: false });

    const body = await request.json();
    const { productId, productName, productPrice, productCategory, feedbackType } = body;

    const supabase = getSupabase();
    const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
    if (!user) return Response.json({ ok: false });

    await supabase.from("product_feedback").insert({
      user_id: user.id,
      product_id: productId,
      product_name: productName,
      product_price: productPrice,
      product_category: productCategory,
      feedback_type: feedbackType,
    });

    // 「違う」が3回の倍数になったらプロファイルを即時更新
    if (feedbackType === "not_for_me") {
      const { count } = await supabase
        .from("product_feedback")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("feedback_type", "not_for_me");

      if ((count ?? 0) > 0 && (count ?? 0) % 3 === 0) {
        updateUserProfile(user.id).catch(() => {});
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("[feedback] error:", e);
    return Response.json({ ok: false });
  }
}
