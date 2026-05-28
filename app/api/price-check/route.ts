import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { searchProducts } from "@/lib/search";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function initWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:navi@example.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  return true;
}

export async function GET(req: NextRequest) {
  // Vercel Cron は Authorization: Bearer <CRON_SECRET> を付与する
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getSupabase();
  const pushEnabled = initWebPush();

  // 未通知のアラートを全取得
  const { data: alerts, error } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("is_triggered", false);

  if (error || !alerts?.length) {
    return NextResponse.json({ checked: 0, notified: 0 });
  }

  // product_id ごとに現在価格を取得（重複検索を避けるため一度だけ）
  const uniqueIds = [...new Set(alerts.map((a) => a.product_id as string))];
  const priceMap = new Map<string, number>();

  for (const productId of uniqueIds) {
    const sample = alerts.find((a) => a.product_id === productId)!;
    try {
      const { products } = await searchProducts({
        query: sample.product_name as string,
        sort: "price_asc",
        perPage: 20,
      });
      const match = products.find((p) => p.id === productId);
      if (match) priceMap.set(productId, match.price);
    } catch {
      // 検索失敗はスキップ
    }
  }

  let notified = 0;

  for (const alert of alerts) {
    const currentPrice = priceMap.get(alert.product_id as string);
    if (currentPrice === undefined) continue;

    // 現在価格を更新
    await supabase.from("price_alerts")
      .update({ current_price: currentPrice })
      .eq("id", alert.id);

    // 価格履歴に記録
    await supabase.from("price_history").insert({
      product_id: alert.product_id,
      price: currentPrice,
    });

    // 目標価格以下なら通知
    if (currentPrice <= (alert.target_price as number)) {
      if (pushEnabled) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("subscription")
          .eq("user_id", alert.user_id);

        for (const sub of subs ?? []) {
          try {
            await webpush.sendNotification(
              sub.subscription as webpush.PushSubscription,
              JSON.stringify({
                title: "【Navi】価格アラート",
                body: `${String(alert.product_name).slice(0, 30)} が ¥${currentPrice.toLocaleString()} になりました！`,
                url: alert.product_url ?? "/mypage",
              })
            );
          } catch {
            // サブスクリプション期限切れなどは無視
          }
        }
      }

      await supabase.from("price_alerts")
        .update({ is_triggered: true })
        .eq("id", alert.id);

      notified++;
    }
  }

  return NextResponse.json({ checked: alerts.length, notified });
}
