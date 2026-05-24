/**
 * AI推薦エンジン 動作確認スクリプト
 * 使い方: npx tsx scripts/test-ai.ts
 * ※ ANTHROPIC_API_KEY を .env.local に設定してから実行
 */

import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import Anthropic from "@anthropic-ai/sdk";
import { searchProducts } from "../lib/search";
import {
  SYSTEM_PROMPT,
  INTENT_EXTRACTION_PROMPT,
  PRODUCT_SELECTION_PROMPT,
} from "../lib/prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function askClaude<T>(prompt: string): Promise<T> {
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "";
  const cleaned = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

async function main() {
  const testMessage = "3万円以内で評価の高いイヤホンが欲しい";
  console.log(`\n🤖 テストメッセージ: 「${testMessage}」\n`);

  // ① 意図解析
  console.log("── ① 意図解析 ──────────────────");
  const intent = await askClaude<{
    keyword: string; maxPrice: number | null; minRating: number | null;
    features: string[]; category: string;
  }>(INTENT_EXTRACTION_PROMPT(testMessage));
  console.log(JSON.stringify(intent, null, 2));

  // ② 商品検索
  console.log("\n── ② 商品検索 ──────────────────");
  const result = await searchProducts({ query: intent.keyword, sort: "rating_desc", perPage: 20 });
  const filtered = intent.maxPrice
    ? result.products.filter((p) => p.price <= intent.maxPrice!)
    : result.products;
  console.log(`楽天+Yahoo! から ${filtered.length}件（価格フィルタ後）`);

  // ③ 商品選定
  console.log("\n── ③ AI商品選定 ─────────────────");
  const productText = filtered
    .slice(0, 20)
    .map((p) => `id:${p.id} | ${p.name.slice(0, 40)} | ¥${p.price.toLocaleString()} | 評価:${p.rating}(${p.reviewCount}件)`)
    .join("\n");

  const selections = await askClaude<{ productId: string; reason: string }[]>(
    PRODUCT_SELECTION_PROMPT(testMessage, productText)
  );

  const productMap = new Map(filtered.map((p) => [p.id, p]));
  const recommended = selections
    .filter((s) => productMap.has(s.productId))
    .map((s) => ({ ...productMap.get(s.productId)!, reason: s.reason }))
    .slice(0, 5);

  // ④ 結果表示
  console.log(`\n── ④ 推薦結果（${recommended.length}件）────────`);
  recommended.forEach((p, i) => {
    console.log(`\n[${i + 1}] ${p.name.slice(0, 45)}`);
    console.log(`    ¥${p.price.toLocaleString()} | 評価:${p.rating}(${p.reviewCount}件) | ${p.source}`);
    console.log(`    💡 ${p.reason}`);
  });

  console.log("\n✅ テスト完了");
}

main().catch(console.error);
