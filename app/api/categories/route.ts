import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_CATEGORIES, getPersonalizedCategories } from "@/lib/personalized-categories";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ categories: DEFAULT_CATEGORIES });
  }

  const supabase = getSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) {
    return NextResponse.json({ categories: DEFAULT_CATEGORIES });
  }

  const categories = await getPersonalizedCategories(user.id);
  return NextResponse.json({ categories });
}
