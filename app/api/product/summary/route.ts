import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type SummaryData = {
  features: string[];
  recommended_for: string[];
  caution: string;
  review_summary: {
    good: string[];
    bad: string[];
    overall: string;
  };
};

// 24時間キャッシュ（商品名+カテゴリ+価格をキーに）
const generateSummary = unstable_cache(
  async (
    name: string,
    category: string,
    price: number,
    rating: number,
    reviewCount: number
  ): Promise<SummaryData> => {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `以下の商品について、購入を検討しているユーザーに向けて簡潔にまとめてください。

商品名：${name}
カテゴリ：${category}
価格：${price}円
評価：${rating}（${reviewCount}件）

必ず以下のJSON形式のみで返してください（説明文不要）：
{
  "features": ["特徴1（30文字以内）", "特徴2（30文字以内）", "特徴3（30文字以内）"],
  "recommended_for": ["こんな人におすすめ1（25文字以内）", "こんな人におすすめ2（25文字以内）"],
  "caution": "注意点（30文字以内）",
  "review_summary": {
    "good": ["良い点1（25文字以内）", "良い点2（25文字以内）", "良い点3（25文字以内）"],
    "bad": ["気になる点1（25文字以内）", "気になる点2（25文字以内）"],
    "overall": "総評（40文字以内）"
  }
}`,
        },
      ],
    });

    const text = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    const cleaned = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as SummaryData;
  },
  ["product-summary-v1"],
  { revalidate: 86400 }
);

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
  }

  let body: { name: string; category: string; price: number; rating: number; reviewCount: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const { name, category, price, rating, reviewCount } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "商品名が必要です" }, { status: 400 });
  }

  try {
    const summary = await generateSummary(name, category, price, rating, reviewCount);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[product/summary]", err);
    return NextResponse.json({ error: "AIまとめの生成に失敗しました" }, { status: 500 });
  }
}
