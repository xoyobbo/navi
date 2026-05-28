import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ profile: null });

  const supabase = getSupabase();
  const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json({ profile: null });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "total_searches, total_clicks, total_favorites, preferred_categories, preferred_brands, preferred_price_min, preferred_price_max"
    )
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ profile: profile ?? null });
}
