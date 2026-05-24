/**
 * 動作確認スクリプト
 * 使い方: npx tsx scripts/test-search.ts
 * ※ 開発サーバー (npm run dev) を起動した状態で実行してください
 */

const BASE_URL = "http://localhost:3000";
const QUERY = "ロボット掃除機";

async function testApi(name: string, url: string) {
  console.log(`\n--- ${name} ---`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      console.error("エラー:", data.error);
      return;
    }
    console.log(`取得件数: ${data.products?.length ?? 0} 件 / 総件数: ${data.totalCount}`);
    const first = data.products?.[0];
    if (first) {
      console.log("先頭商品:");
      console.log(`  名前    : ${first.name.slice(0, 40)}...`);
      console.log(`  価格    : ¥${first.price.toLocaleString()}`);
      console.log(`  評価    : ${first.rating} (${first.reviewCount}件)`);
      console.log(`  カテゴリ: ${first.category}`);
      console.log(`  在庫    : ${first.availability ? "あり" : "なし"}`);
    }
  } catch (err) {
    console.error("通信エラー:", err instanceof Error ? err.message : err);
  }
}

async function testIntegrated() {
  console.log(`\n--- 統合検索（価格昇順） ---`);
  try {
    const res = await fetch(
      `${BASE_URL}/api/search?q=${encodeURIComponent(QUERY)}&sort=price_asc`
    );
    const data = await res.json();
    if (data.error) {
      console.error("エラー:", data.error);
      return;
    }
    console.log(`統合件数: ${data.products?.length ?? 0} 件`);
    console.log(`利用ソース: ${data.sources?.join(", ")}`);
    data.products?.slice(0, 3).forEach((p: { source: string; name: string; price: number }, i: number) => {
      console.log(`  [${i + 1}] [${p.source}] ¥${p.price.toLocaleString()} ${p.name.slice(0, 30)}...`);
    });
  } catch (err) {
    console.error("通信エラー:", err instanceof Error ? err.message : err);
  }
}

(async () => {
  console.log(`\n🔍 "${QUERY}" で検索テスト開始\n`);
  await Promise.all([
    testApi("楽天API", `${BASE_URL}/api/rakuten?q=${encodeURIComponent(QUERY)}`),
    testApi("Yahoo!API", `${BASE_URL}/api/yahoo?q=${encodeURIComponent(QUERY)}`),
  ]);
  await testIntegrated();
  console.log("\n✅ テスト完了");
})();
