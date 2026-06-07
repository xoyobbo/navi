import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { getPreferredSources } from "@/lib/preferences";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { preferredSources } = await request.json();

    const supabase = getSupabase();

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!user) {
      return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    await supabase.from("user_profiles").upsert({
      user_id: user.id,
      preferred_sources: preferredSources,
      updated_at: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  // 取得ロジックは lib/preferences.ts に集約（検索API等と共通）
  const preferredSources = await getPreferredSources();
  return Response.json({ preferredSources });
}
