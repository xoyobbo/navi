import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, COMPARE_PROMPT } from "@/lib/prompts";
import { withCache, cacheKey } from "@/lib/cache";
import type { Product } from "@/types/product";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });
  }

  let products: Product[];
  try {
    const body = await req.json();
    products = body.products;
    if (!Array.isArray(products) || products.length < 2) {
      return NextResponse.json({ error: "2商品以上必要です" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const productText = products
    .map(
      (p, i) =>
        `商品${String.fromCharCode(65 + i)}: ${p.name} | ¥${p.price.toLocaleString()} | 評価:${p.rating}(${p.reviewCount}件) | スコア:${p.score ?? "N/A"}`
    )
    .join("\n");

  // 同じ商品の組み合わせ（id＋価格）なら比較結果は同一なので24時間キャッシュ。
  const result = await withCache(
    cacheKey("compare", products.map((p) => `${p.id}:${p.price}`)),
    async () => {
      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: COMPARE_PROMPT(productText) }],
      });

      const text = res.content[0].type === "text" ? res.content[0].text.trim() : "";
      const cleaned = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        return { summary: text, recommendation: "" };
      }
    },
    60 * 60 * 24
  );

  return NextResponse.json(result);
}
