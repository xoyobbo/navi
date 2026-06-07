import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export const maxDuration = 30
import { createClient } from "@supabase/supabase-js";
import { searchMixed } from "@/lib/api/mix";
import { getPriceRanges } from "@/lib/category-price-ranges";
import { buildLearnedContext, updateUserProfile } from "@/lib/learning-engine";
import { withCache, cacheKey } from "@/lib/cache";
import { normalizeKeyword } from "@/lib/search-utils";
import type { Product } from "@/types/product";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });


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

  console.log("会話履歴件数:", conversationHistory?.length ?? 0)

  // ── !isFinal → Claude質問生成・JSON返却 ──────────────────
  if (!isFinal) {
    if (!message?.trim()) return Response.json({ message: "商品を教えてください", options: [] });
    // 後段で同名のローカル変数 message を再宣言するため、キャッシュキー用に退避
    const userMessage = message;

    // 最初の質問（予算）はカテゴリ別の価格帯を動的に注入する
    const isFirstQuestion = conversationHistory.length === 0;
    const priceRanges = isFirstQuestion ? getPriceRanges(message) : null;
    const priceRangeRule = priceRanges
      ? `予算を聞くときは必ずこの選択肢を使用：${JSON.stringify(priceRanges.map((r) => r.label))}`
      : `予算を聞くときは必ずこの選択肢を使用：["〜5,000円", "5,000〜15,000円", "15,000〜30,000円", "30,000円以上", "特に決めていない"]`;

    const systemPrompt = `
あなたはNaviというAIショッピングアシスタントです。

## 質問の流れ（最大6回）
Q1: 予算  Q2: 使用シーン  Q3: 重視する機能  Q4: ブランド  Q5: 使う人  Q6: その他

## ルール
- 前の回答を活かして次の質問をする（既に答えた内容は聞かない）
- 商品カテゴリに応じた質問にする（イヤホン→有線/ワイヤレス、服→サイズ感 等）
- questionStep=${questionStep}回目に対応した質問をする
- ${priceRangeRule}

### 現在の蓄積条件
${JSON.stringify(searchConditions)}
元のキーワード：${originalKeyword || "未設定"}

## 必須：以下のJSON形式のみで返答すること（マークダウン・説明文不要）
{
  "replyMessage": "共感＋次の質問（2〜3行）",
  "extractedConditions": {
    "keyword": "${originalKeyword || message}",
    "gender": null,
    "minPrice": null,
    "maxPrice": null,
    "features": [],
    "useCase": null
  },
  "nextQuestion": {
    "question": "質問テキスト",
    "options": ["選択肢1", "選択肢2", "選択肢3", "特に決めていない"]
  }
}
- extractedConditionsは会話全体から抽出した条件
- keywordは必ず「${originalKeyword || message}」のまま
- 選択肢は4〜6個、最後に「特に決めていない」
`

    // 学習済みコンテキストをシステムプロンプトに追加
    let finalSystemPrompt = systemPrompt;
    let hasLearnedContext = false;
    try {
      const { userId } = await auth();
      if (userId) {
        const supabase = getSupabase();
        const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
        if (user) {
          const learnedContext = await buildLearnedContext(user.id);
          if (learnedContext) {
            finalSystemPrompt = systemPrompt + "\n\n" + learnedContext;
            hasLearnedContext = true;
          }
        }
      }
    } catch {
      // 学習コンテキスト取得失敗は無視
    }

    const claudeMessages: { role: "user" | "assistant"; content: string }[] = [
      ...(conversationHistory || []).map(
        (m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })
      ),
    ]

    const lastMessage = claudeMessages[claudeMessages.length - 1]
    if (
      !lastMessage ||
      lastMessage.role !== "user" ||
      lastMessage.content !== message
    ) {
      claudeMessages.push({ role: "user", content: message })
    }

    console.log("Claudeに渡すメッセージ数:", claudeMessages.length)

    try {
      const generateQuestion = async () => {
        const res = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 700,
          system: finalSystemPrompt,
          messages: claudeMessages,
        })
        return res.content[0].type === "text" ? res.content[0].text : "{}"
      }

      // 学習コンテキストが付かない（＝ユーザー個別化されない）場合のみキャッシュ。
      // 同じ会話ステップ・条件・履歴なら質問は同一になるためClaude呼び出しを省ける。
      const rawText = hasLearnedContext
        ? await generateQuestion()
        : await withCache(
            cacheKey("ai-question", { questionStep, originalKeyword, searchConditions, conversationHistory, message: userMessage }),
            generateQuestion,
            60 * 60 * 24,
            (t) => t !== "{}" && t.length > 0
          )
      console.log("Claude呼び出し：1回 (!isFinal)", hasLearnedContext ? "" : "(cacheable)")

      // JSON パース（コードブロックも対応）
      const jsonStr =
        rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] ??
        rawText.match(/(\{[\s\S]*\})/)?.[1] ??
        "{}"

      let message = ""
      let options: string[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let newConditions: any = {
        keyword: originalKeyword || "",
        gender: null, minPrice: null, maxPrice: null, features: [], useCase: null,
      }

      try {
        const parsed = JSON.parse(jsonStr)
        message = parsed.replyMessage ?? ""
        options = parsed.nextQuestion?.options ?? []
        if (parsed.extractedConditions) {
          newConditions = { ...newConditions, ...parsed.extractedConditions }
        }
      } catch {
        // フォールバック：テキストをそのまま使用
        message = rawText.replace(/\{[\s\S]*\}/g, "").trim() || rawText
      }

      return Response.json({
        message: message || "次の質問をお答えください",
        options,
        newConditions,
        products: [],
        isQuestion: true,
        ...(priceRanges ? { priceRanges } : {}),
      })
    } catch (e) {
      console.error("[ai/question] error:", e);
      return Response.json({ message: "エラーが発生しました", options: [] }, { status: 500 });
    }
  }

  // ── isFinal: true → Claude条件抽出 → 商品検索 → JSON返却 ──
  if (isFinal) {
    if (!message?.trim()) return Response.json({ products: [], message: "キーワードがありません" });

    console.log("=== AI検索デバッグ ===")
    console.log("受信メッセージ:", message)
    console.log("元キーワード:", originalKeyword)
    console.log("蓄積条件:", JSON.stringify(searchConditions, null, 2))
    console.log("会話履歴件数:", conversationHistory?.length)
    console.log("isFinal:", isFinal)

    // ユーザーのショッピングサイト設定を取得
    let preferredSources = ["rakuten", "yahoo"];
    try {
      const prefsRes = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/user/preferences`,
        { headers: { cookie: req.headers.get("cookie") ?? "" } }
      );
      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        if (Array.isArray(prefsData.preferredSources) && prefsData.preferredSources.length > 0) {
          preferredSources = prefsData.preferredSources;
        }
      }
    } catch {
      // 設定取得失敗はデフォルト値を使用
    }

    // ① 会話履歴から条件・返答・次の質問を1回のClaudeで取得
    const conversationText = (conversationHistory || [])
      .map((m: ConversationMessage) =>
        `${m.role === "user" ? "ユーザー" : "Navi"}：${m.content}`
      )
      .join("\n")

    // 会話内容は決定的（ユーザー個別化なし）なのでキャッシュ可能。
    const extractConditions = async () => {
      const combinedRes = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content:
            `以下の会話から検索条件を抽出してJSONのみ返してください：\n\n` +
            `会話：\n${conversationText}\n\n` +
            `{"replyMessage":"返答メッセージ","conditions":{"keyword":"${originalKeyword || 'イヤホン'}","gender":null,"minPrice":null,"maxPrice":null,"features":[],"useCase":null}}\n\n` +
            `keywordは必ず「${originalKeyword}」を使うこと。`,
        }],
      })
      return combinedRes.content[0].type === "text" ? combinedRes.content[0].text : "{}"
    }
    const combinedText = await withCache(
      cacheKey("ai-extract", { conversationText, originalKeyword }),
      extractConditions,
      60 * 60 * 24,
      (t) => t !== "{}" && t.length > 0
    )
    console.log("Claude呼び出し：1回 (isFinal/Haiku, cacheable)")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extractedConditions: any = {
      keyword: originalKeyword || "",
      gender: null,
      minPrice: searchConditions?.minPrice,
      maxPrice: searchConditions?.maxPrice,
      features: [],
      useCase: null,
    }
    let claudeReplyMessage = ""
    let nextQuestion: FollowUpQuestion | null = null

    try {
      const text = combinedText
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (parsed.conditions) {
          extractedConditions = { ...extractedConditions, ...parsed.conditions }
        }
        if (parsed.replyMessage) claudeReplyMessage = parsed.replyMessage
        if (parsed.nextQuestion?.question) nextQuestion = parsed.nextQuestion
      }
    } catch (e) {
      console.error("条件抽出エラー:", e)
    }

    console.log("抽出された全条件:", extractedConditions)

    // ② 性別・特徴をキーワードに追加（originalKeywordを絶対に消さない）
    const searchKeyword = (() => {
      const base = originalKeyword || ""
      const extras: string[] = []
      if (extractedConditions.gender) {
        extras.push(extractedConditions.gender)
      }
      if (extractedConditions.features?.length > 0) {
        extras.push(...extractedConditions.features.slice(0, 2))
      }
      return [base, ...extras].filter(Boolean).join(" ").trim().slice(0, 30)
    })()

    console.log("最終キーワード:", searchKeyword)
    console.log("元キーワード:", originalKeyword)
    console.log("価格範囲:", extractedConditions.minPrice, "〜", extractedConditions.maxPrice)
    console.log("===================")

    // ③ 商品検索（4段階フォールバック）
    // 同一の「キーワード＋価格帯」での重複検索はスキップしてAPI呼び出しを削減。
    const searchWithFallback = async (): Promise<Product[]> => {
      const tried = new Set<string>()
      const attempt = async (
        kw: string,
        minPrice?: number | null,
        maxPrice?: number | null
      ): Promise<Product[]> => {
        const k = kw.trim()
        if (!k) return []
        const sig = `${normalizeKeyword(k)}|${minPrice ?? ""}|${maxPrice ?? ""}`
        if (tried.has(sig)) {
          console.log("重複検索スキップ:", sig)
          return []
        }
        tried.add(sig)
        return searchMixed(
          { keyword: k, minPrice: minPrice ?? undefined, maxPrice: maxPrice ?? undefined },
          30,
          preferredSources
        )
      }

      // ① フル条件で検索
      let products = await attempt(searchKeyword, extractedConditions.minPrice, extractedConditions.maxPrice)
      if (products.length > 0) {
        console.log("①成功:", products.length)
        return products
      }

      // ② 価格条件を外す
      console.log("②価格条件なしで再検索")
      products = await attempt(searchKeyword)
      if (products.length > 0) return products

      // ③ originalKeywordだけで検索
      console.log("③元キーワードのみ")
      products = await attempt(originalKeyword)
      if (products.length > 0) return products

      // ④ キーワードの最初の単語のみ
      const firstWord = originalKeyword.split(/\s+/)[0]
      console.log("④最初の単語:", firstWord)
      return await attempt(firstWord)
    }

    const rawProducts = await searchWithFallback()

    if (rawProducts.length === 0) {
      console.error("全フォールバック失敗:", originalKeyword)
      const fallbackProducts = await searchMixed({ keyword: "人気商品" }, 10, preferredSources)
      return Response.json({
        message: `「${originalKeyword}」での検索が難しかったため、関連する人気商品をご紹介します。`,
        products: fallbackProducts
      })
    }

    // 口コミ数・評価でソートして信頼性の高い商品を上位に
    const sortByTrust = (prods: Product[]) =>
      [...prods].sort((a, b) => {
        // 口コミ0件の商品は最後尾へ
        if (a.reviewCount === 0 && b.reviewCount > 0) return 1;
        if (b.reviewCount === 0 && a.reviewCount > 0) return -1;
        // 口コミ数 × 評価の重み付きスコアで降順
        const scoreA = a.rating * Math.log10(a.reviewCount + 10);
        const scoreB = b.rating * Math.log10(b.reviewCount + 10);
        return scoreB - scoreA;
      });

    const products = sortByTrust(rawProducts)

    // 価格条件を緩めた場合の注記
    const relaxedMessage =
      extractedConditions.maxPrice != null &&
      products.some((p) => p.price > extractedConditions.maxPrice)
        ? `\n※ご指定の予算内では見つからなかったため、条件を少し広げて表示しています。`
        : ""

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
            keyword: originalKeyword || searchKeyword,
            chosen_price_range: extractedConditions.maxPrice ? `〜${extractedConditions.maxPrice}` : null,
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
      message:
        claudeReplyMessage ||
        `「${originalKeyword}」の商品を${products.length}件見つけました！${relaxedMessage}`,
      products,
      followUp: nextQuestion,
      newConditions: extractedConditions,
    })
  }
}
