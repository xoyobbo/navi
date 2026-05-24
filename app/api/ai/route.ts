import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/search";
import { saveSearchHistory } from "@/lib/history";
import { createSession, saveMessage, getMessages } from "@/lib/chat";
import {
  SYSTEM_PROMPT,
  INTENT_EXTRACTION_PROMPT,
  PRODUCT_SELECTION_PROMPT,
} from "@/lib/prompts";
import type { Product } from "@/types/product";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── 型定義 ────────────────────────────────────────────────────

type Intent = {
  keyword: string;
  maxPrice: number | null;
  minRating: number | null;
  features: string[];
  category: string;
};

type RecommendedProduct = Product & { reason: string };

type AiResponse = {
  message: string;
  sessionId: string;
  recommendations: RecommendedProduct[];
  intent: Intent;
};

// ── ヘルパー関数 ──────────────────────────────────────────────

/** Claude に JSON を要求し、パース結果を返す */
async function askClaude<T>(prompt: string): Promise<T> {
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    res.content[0].type === "text" ? res.content[0].text.trim() : "";

  // コードブロックを除去してパース
  const cleaned = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

/** 価格・評価でフィルタリング */
function filterProducts(products: Product[], intent: Intent): Product[] {
  return products.filter((p) => {
    if (intent.maxPrice && p.price > intent.maxPrice) return false;
    if (intent.minRating && p.rating < intent.minRating) return false;
    return true;
  });
}

/** 商品を Claude に渡せるコンパクトな文字列に変換 */
function productsToText(products: Product[]): string {
  return products
    .slice(0, 30) // トークン削減のため最大30件
    .map(
      (p) =>
        `id:${p.id} | ${p.name.slice(0, 40)} | ¥${p.price.toLocaleString()} | 評価:${p.rating}(${p.reviewCount}件) | ${p.source}`
    )
    .join("\n");
}

/** 推薦コメント付きの返答メッセージを生成 */
async function generateReplyMessage(
  userMessage: string,
  recommended: RecommendedProduct[],
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const productSummary = recommended
    .map(
      (p, i) =>
        `${i + 1}. ${p.name.slice(0, 30)}（¥${p.price.toLocaleString()}）— ${p.reason}`
    )
    .join("\n");

  const conversationHistory = history
    .slice(-6) // 直近3往復
    .map((m) => ({ role: m.role, content: m.content }));

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      ...conversationHistory,
      {
        role: "user",
        content: `${userMessage}\n\n以下の商品を見つけました。自然な一言コメントを添えて紹介してください（商品詳細は別表示されるので、リスト形式にしなくてOKです）:\n${productSummary}`,
      },
    ],
  });

  return res.content[0].type === "text" ? res.content[0].text : "";
}

// ── メインハンドラ ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  const { userId } = await auth();

  let body: { message: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const { message, sessionId: existingSessionId } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "メッセージが空です" }, { status: 400 });
  }

  // ── ① セッション管理 ──────────────────────────────────────
  let sessionId = existingSessionId ?? null;
  let history: { role: "user" | "assistant"; content: string }[] = [];

  if (userId) {
    if (!sessionId) {
      sessionId = await createSession(userId);
    } else {
      const msgs = await getMessages(sessionId);
      history = msgs.map((m) => ({ role: m.role, content: m.content }));
    }
    await saveMessage(sessionId, "user", message);
  }

  // ── ② 意図解析 ────────────────────────────────────────────
  let intent: Intent;
  try {
    intent = await askClaude<Intent>(INTENT_EXTRACTION_PROMPT(message));
  } catch (e) {
    console.error("意図解析失敗:", e);
    intent = { keyword: message, maxPrice: null, minRating: null, features: [], category: "" };
  }

  // ── ③ 商品検索 ────────────────────────────────────────────
  const searchResult = await searchProducts({
    query: intent.keyword,
    sort: intent.minRating ? "rating_desc" : "price_asc",
    perPage: 30,
  });

  const filtered = filterProducts(searchResult.products, intent);
  const candidates = filtered.length >= 5 ? filtered : searchResult.products;

  // 検索履歴を保存（非同期・失敗無視）
  if (userId) {
    saveSearchHistory(userId, intent.keyword).catch(() => {});
  }

  // ── ④⑤ 商品選定 + 推薦理由生成 ──────────────────────────
  let recommendations: RecommendedProduct[] = [];

  if (candidates.length > 0) {
    try {
      type Selection = { productId: string; reason: string };
      const selections = await askClaude<Selection[]>(
        PRODUCT_SELECTION_PROMPT(message, productsToText(candidates))
      );

      const productMap = new Map(candidates.map((p) => [p.id, p]));
      recommendations = selections
        .filter((s) => productMap.has(s.productId))
        .map((s) => ({ ...productMap.get(s.productId)!, reason: s.reason }))
        .slice(0, 5);
    } catch (e) {
      console.error("商品選定失敗:", e);
      // フォールバック：上位5件をそのまま使用
      recommendations = candidates
        .slice(0, 5)
        .map((p) => ({ ...p, reason: "条件に合う商品です。" }));
    }
  }

  // ── ⑥ 返答メッセージ生成 ─────────────────────────────────
  const replyMessage =
    recommendations.length > 0
      ? await generateReplyMessage(message, recommendations, history)
      : "申し訳ありません、条件に合う商品が見つかりませんでした。別のキーワードや条件で試してみてください。";

  // チャット履歴に保存
  if (userId && sessionId) {
    await saveMessage(sessionId, "assistant", replyMessage);
  }

  const response: AiResponse = {
    message: replyMessage,
    sessionId: sessionId ?? "guest",
    recommendations,
    intent,
  };

  return NextResponse.json(response);
}
