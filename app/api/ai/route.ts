import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchRakuten } from "@/lib/api/rakuten";
import { deduplicateProducts } from "@/lib/api/mix";
import { scoreProduct } from "@/lib/scoring";
import { extractSearchKeyword } from "@/lib/extract-keyword";
import { saveSearchHistory } from "@/lib/history";
import { createSession, saveMessage } from "@/lib/chat";
import { getPriceRanges } from "@/lib/category-price-ranges";
import { buildLearnedContext, updateUserProfile } from "@/lib/learning-engine";
import type { Product } from "@/types/product";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `あなたは「Navi」という名前の、ECサイトのAIコンシェルジュです。
おしゃれなセレクトショップの経験豊富なスタッフのように、ユーザーが理想の商品を見つけられるよう自然にサポートします。

## 絶対に守るルール

### ❌ やってはいけないこと
- オウム返し禁止（「〇〇をお探しですね！」のように繰り返さない）
- 複数質問禁止（1ターンに質問は必ず1つだけ）
- 過剰な敬語禁止（「〜でございます」「〜でしょうか」などは使わない）
- 機械的な返答禁止（テンプレ感のある返し方をしない）

### ✅ 必ずやること
- まず共感・プロの一言を添える（例：「いい選択ですね！」「それは迷いますよね」）
- 質問は1ターンに1つだけ
- 選択肢は必ず <options> タグで返す

## 会話の流れ（STEP 1〜5）

STEP 1（最初のメッセージ後）：共感を示してから予算を聞く
STEP 2（予算確認後）：使い方・使用シーンを聞く
STEP 3（使い方確認後）：重視する機能・ポイントを聞く
STEP 4（機能確認後）：その他のこだわり（ブランド・カラーなど）を聞く
STEP 5（全条件確認後）：「では最適な商品を探してきますね！」と伝えて終了

## 選択肢の形式

質問とともに、必ず以下の形式で選択肢を含めてください：

<options>["選択肢1", "選択肢2", "選択肢3", "選択肢4"]</options>

ルール：
- 予算を聞くときは必ずこの選択肢を使用：["〜5,000円", "5,000〜15,000円", "15,000〜30,000円", "30,000円以上", "特に決めていない"]
- 商品カテゴリに合わせた自然な選択肢を4〜6個用意する
- 最後に「こだわらない」または「特に決めていない」を必ず含める
- 選択肢はJSONの文字列配列形式のみ（番号リストは不可）`;

type SearchConditions = {
  maxPrice?: number | null;
  minPrice?: number | null;
  minRating?: number | null;
  features?: string[];
};
type ConversationMessage = { role: "user" | "assistant"; content: string };
type FollowUpQuestion = { question: string; options: string[] };

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });
  }

  let body: {
    message: string;
    sessionId?: string;
    questionStep?: number;
    originalKeyword?: string;
    searchConditions?: SearchConditions;
    isFinal?: boolean;
    isQuestion?: boolean;
    conversationHistory?: ConversationMessage[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const {
    message,
    sessionId: existingSessionId,
    questionStep = 0,
    originalKeyword = "",
    searchConditions = {},
    isFinal = false,
    isQuestion = false,
    conversationHistory = [],
  } = body;

  // ── isQuestion: true → Claude質問生成・JSON返却 ──────────
  if (isQuestion) {
    if (!message?.trim()) return Response.json({ message: "商品を教えてください", options: [] });

    // 最初の質問（予算）はカテゴリ別の価格帯を動的に注入する
    const isFirstQuestion = conversationHistory.length === 0;
    const priceRanges = isFirstQuestion ? getPriceRanges(message) : null;

    let systemPrompt = SYSTEM_PROMPT;
    if (priceRanges) {
      const priceLabels = priceRanges.map((r) => r.label);
      systemPrompt = SYSTEM_PROMPT.replace(
        /- 予算を聞くときは必ずこの選択肢を使用：\[.*?\]/,
        `- 予算を聞くときは必ずこの選択肢を使用：${JSON.stringify(priceLabels)}`
      );
    }

    // 学習済みコンテキストをシステムプロンプトに追加
    try {
      const { userId } = await auth();
      if (userId) {
        const supabase = getSupabase();
        const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
        if (user) {
          const learnedContext = await buildLearnedContext(user.id);
          if (learnedContext) systemPrompt = systemPrompt + "\n\n" + learnedContext;
        }
      }
    } catch {
      // 学習コンテキスト取得失敗は無視
    }

    try {
      const messages: { role: "user" | "assistant"; content: string }[] = [
        ...conversationHistory,
        { role: "user", content: message },
      ];

      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: systemPrompt,
        messages,
      });

      const rawText = res.content[0].type === "text" ? res.content[0].text : "";
      const optionsMatch = rawText.match(/<options>([\s\S]*?)<\/options>/);
      let options: string[] = [];
      if (optionsMatch) {
        try {
          options = JSON.parse(optionsMatch[1]);
        } catch {
          options = [];
        }
      }
      const displayMessage = rawText.replace(/<options>[\s\S]*?<\/options>/g, "").trim();

      return Response.json({
        message: displayMessage,
        options,
        isQuestion: true,
        ...(priceRanges ? { priceRanges } : {}),
      });
    } catch (e) {
      console.error("[ai/isQuestion] error:", e);
      return Response.json({ message: "エラーが発生しました", options: [] }, { status: 500 });
    }
  }

  // ── isFinal: true → SSE なし・JSON 返却 ──────────────────
  if (isFinal) {
    if (!message?.trim()) return Response.json({ products: [], message: "キーワードがありません" });

    // Claude でキーワードを整形（「イヤホンが欲しい ノイズキャンセリング」→「ノイズキャンセリング イヤホン」）
    let cleanKeyword = message.trim();
    try {
      const extracted = await extractSearchKeyword(cleanKeyword, anthropic);
      if (extracted.keyword) cleanKeyword = extracted.keyword;
    } catch (e) {
      console.error("[ai/isFinal] keyword extraction failed:", e);
    }

    let raw: Product[] = await searchRakuten({
      keyword: cleanKeyword,
      minPrice: searchConditions.minPrice,
      maxPrice: searchConditions.maxPrice,
      hits: 30,
    });

    if (raw.length === 0 && (searchConditions.minPrice || searchConditions.maxPrice)) {
      raw = await searchRakuten({ keyword: cleanKeyword, hits: 30 });
    }

    // 重複除去 → スコアリング → 上位30件
    const conditions = {
      keyword: cleanKeyword,
      minPrice: searchConditions.minPrice ?? null,
      maxPrice: searchConditions.maxPrice ?? null,
    };
    const products = deduplicateProducts(raw)
      .map((p) => ({ ...p, score: Math.round(scoreProduct(p, conditions)) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 30);

    // 会話から学んだ内容をバックグラウンドで保存（fire-and-forget）
    if (products.length > 0) {
      void (async () => {
        try {
          const { userId } = await auth();
          if (!userId) return;
          const supabase = getSupabase();
          const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
          if (!user) return;
          await supabase.from("conversation_insights").insert({
            user_id: user.id,
            keyword: originalKeyword || cleanKeyword,
            chosen_price_range: searchConditions.maxPrice ? `〜${searchConditions.maxPrice}` : null,
            liked_product_id: products[0]?.id ?? null,
            liked_product_price: products[0]?.price ?? null,
            liked_product_category: products[0]?.category ?? null,
          });
          const { count } = await supabase
            .from("conversation_insights")
            .select("id", { count: "exact" })
            .eq("user_id", user.id);
          if ((count ?? 0) > 0 && (count ?? 0) % 5 === 0) {
            await updateUserProfile(user.id);
          }
        } catch {
          // バックグラウンド保存の失敗は無視
        }
      })();
    }

    return Response.json({
      products,
      message: products.length > 0 ? `${products.length}件見つかりました` : "条件に合う商品が見つかりませんでした",
    });
  }

  if (!message?.trim()) {
    return Response.json({ error: "メッセージが空です" }, { status: 400 });
  }

  const { userId } = await auth();

  const encoder = new TextEncoder();
  const transformStream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = transformStream.writable.getWriter();

  const sendEvent = async (data: object) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // writer already closed
    }
  };

  (async () => {
    let sessionId = existingSessionId ?? null;

    try {
      // ── ① セッション管理 ──────────────────────────────────
      if (userId) {
        if (!sessionId) {
          sessionId = await createSession(userId);
        }
        await saveMessage(sessionId, "user", message);
      }

      await sendEvent({ type: "session", sessionId: sessionId ?? "guest" });

      // ── ② キーワード抽出 ──────────────────────────────────
      const extracted = originalKeyword.trim()
        ? { keyword: originalKeyword.trim(), minPrice: null, maxPrice: null }
        : await extractSearchKeyword(message, anthropic);

      const conditions = {
        keyword: extracted.keyword,
        minPrice: extracted.minPrice ?? searchConditions.minPrice ?? null,
        maxPrice: extracted.maxPrice ?? searchConditions.maxPrice ?? null,
      };

      if (userId) saveSearchHistory(userId, conditions.keyword).catch(() => {});

      // ── ③ 商品検索（フォールバック付き） ─────────────────────
      let products: Product[] = await searchRakuten({
        keyword: conditions.keyword,
        minPrice: conditions.minPrice,
        maxPrice: conditions.maxPrice,
        hits: 30,
      });
      let wasRelaxed = false;

      if (products.length === 0 && (conditions.minPrice || conditions.maxPrice)) {
        products = await searchRakuten({ keyword: conditions.keyword, hits: 30 });
        if (products.length > 0) wasRelaxed = true;
      }

      // ── ④ Claude でフォローアップ生成 ─────────────────────
      let followUp: FollowUpQuestion | null = null;

      if (questionStep < 3 && products.length > 0) {
        try {
          const fuRes = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 200,
            messages: [
              {
                role: "user",
                content:
                  `「${conditions.keyword}」を探しています。` +
                  `ステップ${questionStep}の絞り込み質問を1つ生成してJSONのみ返してください。\n` +
                  `ステップ0:予算 ステップ1:使用シーン ステップ2:重視する機能\n` +
                  `{"question":"予算は？","options":["1万円以内","1〜3万円","3万円以上","決めていない"]}`,
              },
            ],
          });
          const text = fuRes.content[0].type === "text" ? fuRes.content[0].text : "";
          const match = text.match(/\{[\s\S]*?\}/);
          if (match) followUp = JSON.parse(match[0]);
        } catch (e) {
          console.error("[ai] フォローアップ生成エラー:", e);
        }
      }

      // ── ⑤ 固定メッセージ ──────────────────────────────────
      const replyMessage =
        products.length > 0
          ? `「${conditions.keyword}」の商品を${products.length}件見つけました！${wasRelaxed ? "（価格条件を外して検索しました）" : ""}`
          : `「${conditions.keyword}」の商品が見つかりませんでした。別のキーワードをお試しください。`;

      // ── ⑥ 保存・SSE 送信 ──────────────────────────────────
      if (userId && sessionId) {
        await saveMessage(sessionId, "assistant", replyMessage, products).catch(() => {});
      }

      await sendEvent({ type: "message", content: replyMessage });
      await sendEvent({ type: "products", products });
      if (followUp) await sendEvent({ type: "followUp", followUp });
      await sendEvent({
        type: "conditions",
        conditions: {
          maxPrice: conditions.maxPrice ?? searchConditions.maxPrice,
          minPrice: conditions.minPrice ?? searchConditions.minPrice,
          minRating: searchConditions.minRating,
          features: searchConditions.features ?? [],
        },
        keyword: conditions.keyword,
      });
      await sendEvent({ type: "done" });
    } catch (e) {
      const error = e instanceof Error ? e.message : "不明なエラー";
      console.error("[ai] エラー:", error);
      await sendEvent({ type: "error", error });
      await sendEvent({ type: "done" });
    } finally {
      writer.close();
    }
  })();

  return new Response(transformStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
