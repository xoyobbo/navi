import { createClient } from "@supabase/supabase-js";
import { redis } from "@/lib/redis";

export const maxDuration = 15

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      rakuten: false,
      yahoo: false,
      claude: false,
      supabase: false,
      redis: false,
    },
  }

  await Promise.allSettled([
    // 楽天 API
    fetch(
      `https://app.rakutenws.com/services/api/IchibaItem/Search/20220601` +
      `?applicationId=${process.env.RAKUTEN_APP_ID}&keyword=test&hits=1`
    ).then((r) => {
      if (r.ok) checks.services.rakuten = true
    }),

    // Yahoo! ショッピング API
    fetch(
      `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch` +
      `?appid=${process.env.YAHOO_CLIENT_ID}&query=test&results=1`
    ).then((r) => {
      if (r.ok) checks.services.yahoo = true
    }),

    // Claude（APIキーの存在のみ確認）
    Promise.resolve().then(() => {
      if (process.env.ANTHROPIC_API_KEY) checks.services.claude = true
    }),

    // Supabase
    getSupabase()
      .from("users")
      .select("id")
      .limit(1)
      .then(({ error }) => {
        if (!error) checks.services.supabase = true
      }),

    // Redis
    redis.ping().then((res) => {
      if (res === "PONG") checks.services.redis = true
    }),
  ])

  const allHealthy = Object.values(checks.services).every((v) => v)

  return Response.json(
    { ...checks, status: allHealthy ? "ok" : "degraded" },
    { status: allHealthy ? 200 : 503 }
  )
}
