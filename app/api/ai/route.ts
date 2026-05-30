import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export const maxDuration = 30
import { createClient } from "@supabase/supabase-js";
import { searchRakuten } from "@/lib/api/rakuten";
import { deduplicateProducts, searchMixed } from "@/lib/api/mix";
import { withCache } from "@/lib/cache";
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

    // 最初の質問（予算）はカテゴリ別の価格帯を動的に注入する
    const isFirstQuestion = conversationHistory.length === 0;
    const priceRanges = isFirstQuestion ? getPriceRanges(message) : null;
    const priceRangeRule = priceRanges
      ? `予算を聞くときは必ずこの選択肢を使用：${JSON.stringify(priceRanges.map((r) => r.label))}`
      : `予算を聞くときは必ずこの選択肢を使用：["〜5,000円", "5,000〜15,000円", "15,000〜30,000円", "30,000円以上", "特に決めていない"]`;

    const systemPrompt = `
あなたはNaviというAIショッピングアシスタントです。

## 質問の流れ（最大6回）

Q1: 予算
Q2: 使用シーン・用途
Q3: 重視する機能（最重要）
Q4: ブランドのこだわり
Q5: 使う人（自分・家族・プレゼント等）
Q6: 他に気になる条件はあるか

## 各質問のルール
- 前の回答を必ず活かして次の質問をする
- 既に答えた内容は絶対に聞かない
- 商品カテゴリに応じて質問内容を変える
  例：イヤホンなら「有線/ワイヤレス」を聞く
      家電なら「設置場所」を聞く
      服なら「サイズ感」を聞く
- 質問は1つずつ・選択肢付きで

## 絶対に守るルール
- 会話履歴を全て参照する
- 条件は会話が終わるまで保持する
- 「メンズ」と言ったら以降ずっとメンズ
- 最後まで必ず商品を表示する
- 商品が見つからなくても「条件を広げて探しました」と伝えて必ず商品を返す

### 現在の蓄積条件
${JSON.stringify(searchConditions)}
元のキーワード：${originalKeyword || "未設定"}

## 選択肢の形式
質問とともに、必ず以下の形式で選択肢を含めてください：
<options>["選択肢1", "選択肢2", "選択肢3", "選択肢4"]</options>

ルール：
- ${priceRangeRule}
- 商品カテゴリに合わせた自然な選択肢を4〜6個用意する
- 最後に「こだわらない」または「特に決めていない」を必ず含める
- 選択肢はJSONの文字列配列形式のみ（番号リストは不可）
`

    // 学習済みコンテキストをシステムプロンプトに追加
    let finalSystemPrompt = systemPrompt;
    try {
      const { userId } = await auth();
      if (userId) {
        const supabase = getSupabase();
        const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
        if (user) {
          const learnedContext = await buildLearnedContext(user.id);
          if (learnedContext) finalSystemPrompt = systemPrompt + "\n\n" + learnedContext;
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
      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: finalSystemPrompt,
        messages: claudeMessages,
      })

      const naviMessage =
        res.content[0].type === "text" ? res.content[0].text : ""

      const optionsMatch =
        naviMessage.match(/<options>([\s\S]*?)<\/options>/)
      let options: string[] = []
      if (optionsMatch) {
        try {
          options = JSON.parse(optionsMatch[1])
        } catch {}
      }

      const displayMessage = naviMessage
        .replace(/<options>[\s\S]*?<\/options>/g, "")
        .trim()

      return Response.json({
        message: displayMessage,
        options,
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

    // ① 会話履歴から条件・返答・次の質問を1回のClaudeで取得
    const conversationText = (conversationHistory || [])
      .map((m: ConversationMessage) =>
        `${m.role === "user" ? "ユーザー" : "Navi"}：${m.content}`
      )
      .join("\n")

    const combinedRes = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{
        role: "user",
        content:
          `ユーザーとの会話：\n${conversationText}\n\n` +
          `以下を全て含むJSONのみ返してください：\n` +
          `{"replyMessage":"返答メッセージ","conditions":{"keyword":"イヤホン","gender":"メンズ","minPrice":20000,"maxPrice":30000,"features":["ノイキャン"],"useCase":"通勤"},"nextQuestion":{"question":"次の質問","options":["選択肢1","選択肢2","選択肢3","特に決めていない"]}}`,
      }],
    })

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
      const text =
        combinedRes.content[0].type === "text"
          ? combinedRes.content[0].text
          : "{}"
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

    // ② 性別・特徴をキーワードに追加
    let searchKeyword = extractedConditions.keyword || originalKeyword || ""

    if (extractedConditions.gender) {
      searchKeyword = `${searchKeyword} ${extractedConditions.gender}`
    }

    if (extractedConditions.features?.length > 0) {
      searchKeyword = `${searchKeyword} ${extractedConditions.features.join(" ")}`
    }

    console.log("最終検索キーワード:", searchKeyword)

    // ③ 商品検索（4段階フォールバック）
    const searchWithFallback = async (): Promise<Product[]> => {
      // ① 全条件で検索
      let products = await searchMixed(
        {
          keyword: searchKeyword,
          minPrice: extractedConditions.minPrice,
          maxPrice: extractedConditions.maxPrice,
        },
        30
      )
      if (products.length > 0) return products

      console.log("①失敗 → 価格条件を外す")
      // ② 価格条件を外して再検索
      products = await searchMixed({ keyword: searchKeyword }, 30)
      if (products.length > 0) return products

      console.log("②失敗 → キーワードを短縮")
      // ③ キーワードを最初の単語だけにする
      const shortKeyword = searchKeyword.split(/\s+/)[0]
      products = await searchMixed({ keyword: shortKeyword }, 30)
      if (products.length > 0) return products

      console.log("③失敗 → 元キーワードで検索")
      // ④ 最終手段：元のキーワードのみ
      return await searchMixed({ keyword: originalKeyword || shortKeyword }, 30)
    }

    const products = await searchWithFallback()

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
