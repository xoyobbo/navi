"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductCarousel from "@/components/ProductCarousel";
import ChatSidebar from "@/components/ChatSidebar";
import type { Product } from "@/types/product";
import type { PriceRange } from "@/lib/category-price-ranges";

const MAX_QUESTIONS = 6

const SUGGESTED_PROMPTS = [
  "イヤホンが欲しい",
  "コスパの良いスマートウォッチ",
  "初心者向けのカメラ",
  "プレゼントに喜ばれる美容グッズ",
];

// ── 型定義 ────────────────────────────────────────────────

type ChatPhase = "idle" | "questioning" | "finalizing" | "result" | "refining";

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  products?: Product[]
  options?: string[]
}

type ConversationMessage = { role: "user" | "assistant"; content: string };
type Conditions = {
  keyword: string;
  minPrice: number | null;
  maxPrice: number | null;
  useCase: string | null;
  features: string[];
  other: string | null;
  gender: string | null;
};

// ── 商品選定ユーティリティ ────────────────────────────────

function deduplicateByName(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    const key = `${p.name.slice(0, 20).toLowerCase().replace(/\s/g, "")}_${p.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getBalancedProducts(products: Product[]): Product[] {
  return deduplicateByName(products);
}

function getBadge(product: Product, absoluteIndex: number, allProducts: Product[]): string {
  if (absoluteIndex < 5) return "⭐ 高評価";
  const minPrice = allProducts.length > 0 ? Math.min(...allProducts.map((p) => p.price)) : 0;
  if (product.price === minPrice) return "💰 最安値";
  return "💬 人気";
}

// ── 条件管理ユーティリティ ────────────────────────────────

function detectGender(text: string): string | null {
  if (/メンズ|男性|男の子|男用|紳士/.test(text)) return "メンズ";
  if (/レディース|女性|女の子|女用|婦人/.test(text)) return "レディース";
  if (/キッズ|子供|子ども|ジュニア/.test(text)) return "キッズ";
  return null;
}

function applyConditionAnswer(
  answer: string,
  step: number,
  current: Conditions,
  priceRanges: PriceRange[]
): Conditions {
  const updated = { ...current };

  // どのステップでも性別を検出
  const gender = detectGender(answer);
  if (gender) updated.gender = gender;

  if (step === 0) {
    const range = priceRanges.find((r) => r.label === answer);
    if (range) {
      updated.minPrice = range.min;
      updated.maxPrice = range.max;
    }
  } else if (step === 1) {
    updated.useCase = answer;
  } else if (step === 2) {
    if (answer !== "こだわらない" && answer !== "特に決めていない") {
      updated.features = [answer];
    }
  } else if (step === 3 || step === 4) {
    // Q4: ブランド / Q5: 使う人 → other に蓄積
    if (answer !== "こだわらない" && answer !== "特に決めていない") {
      updated.other = updated.other ? `${updated.other} ${answer}` : answer;
    }
  }
  return updated;
}

function buildSummary(cond: Conditions): string {
  const parts: string[] = [];
  if (cond.maxPrice) parts.push(`予算〜${cond.maxPrice.toLocaleString()}円`);
  else if (cond.minPrice) parts.push(`予算${cond.minPrice.toLocaleString()}円〜`);
  if (cond.useCase && cond.useCase !== "こだわらない" && cond.useCase !== "特に決めていない") parts.push(cond.useCase);
  if (cond.features.length > 0) parts.push(cond.features.join("・"));
  if (cond.other && cond.other !== "特になし" && cond.other !== "こだわらない") parts.push(cond.other);
  return parts.length > 0 ? `この条件で探しました：${parts.join(" / ")}` : "";
}

const INITIAL_CONDITIONS: Conditions = {
  keyword: "",
  minPrice: null,
  maxPrice: null,
  gender: null,
  useCase: null,
  features: [],
  other: null,
};

// ── アイコン・UI部品 ──────────────────────────────────────

function NaviIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width={size} height={size}>
      <path d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────

export default function ChatPage() {
  const { user } = useUser();

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // フロー管理
  const [chatPhase, setChatPhase] = useState<ChatPhase>("idle");
  const [questionStep, setQuestionStep] = useState(0);
  const [originalKeyword, setOriginalKeyword] = useState("");
  const [conditions, setConditions] = useState<Conditions>(INITIAL_CONDITIONS);

  // Claude会話履歴・選択肢・価格帯
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [dynamicPriceRanges, setDynamicPriceRanges] = useState<PriceRange[]>([]);

  // 結果
  const [finalProducts, setFinalProducts] = useState<Product[]>([]);
  const [carouselKey, setCarouselKey] = useState(0);

  // セッション管理（refで非同期に安全にアクセス）
  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    }, 50);
  }

  function adjustHeight() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 24;
    const padding = 20;
    const maxLines = 4;
    el.style.height = `${Math.min(el.scrollHeight, lineHeight * maxLines + padding)}px`;
  }

  function addMsg(role: "user" | "assistant", content: string) {
    setMessages((prev) => [...prev, { role, content }]);
  }

  // ── セッション管理ヘルパー ─────────────────────────────

  async function ensureSession(): Promise<string | null> {
    if (!user) return null;
    if (sessionIdRef.current) return sessionIdRef.current;
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      if (!res.ok) return null;
      const { id } = await res.json();
      sessionIdRef.current = id;
      setSessionId(id);
      return id;
    } catch {
      return null;
    }
  }

  function saveMsg(role: "user" | "assistant", content: string, products?: Product[]) {
    const sid = sessionIdRef.current;
    if (!sid) return;
    fetch(`/api/sessions/${sid}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, products }),
    }).catch(() => {});
  }

  // ── フローリセット ────────────────────────────────────

  function doResetFlow() {
    setChatPhase("idle");
    setQuestionStep(0);
    setOriginalKeyword("");
    setConditions(INITIAL_CONDITIONS);
    setCurrentOptions([]);
    setFinalProducts([]);
    setDynamicPriceRanges([]);
  }

  function handleNewChat() {
    setMessages([]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    sessionIdRef.current = null;
    setSessionId(null);
    doResetFlow();
  }

  // ── 履歴から復元 ──────────────────────────────────────

  const handleSelectSession = useCallback(async (sid: string) => {
    setLoading(true);
    doResetFlow();
    setMessages([]);
    sessionIdRef.current = sid;
    setSessionId(sid);

    try {
      const res = await fetch(`/api/sessions/${sid}`);
      const data = await res.json();

      const msgs: ChatMessage[] = (data.messages ?? []).map(
        (m: { role: string; content: string; products?: Product[] }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          // 商品もメッセージに復元（カルーセルが再表示される）
          products: m.products?.length ? m.products : undefined,
        })
      );
      setMessages(msgs);

      // 最初のユーザーメッセージをキーワードとして復元
      const firstUser = (data.messages ?? []).find(
        (m: { role: string }) => m.role === "user"
      );
      if (firstUser) setOriginalKeyword(firstUser.content);

      // 商品が含まれているメッセージがあれば result フェーズに戻す
      if (msgs.some(m => (m.products?.length ?? 0) > 0)) {
        setChatPhase("result");
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── API呼び出し ───────────────────────────────────────

  async function callQuestionAPI(
    message: string,
    history: ConversationMessage[],
    keyword = "",
    cond?: Partial<Conditions>
  ): Promise<{ message: string; options: string[]; priceRanges?: PriceRange[]; newConditions?: Partial<Conditions> }> {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversationHistory: history,
        originalKeyword: keyword,
        searchConditions: cond ? { minPrice: cond.minPrice, maxPrice: cond.maxPrice } : {},
        questionStep: cond ? undefined : 0,
        isQuestion: true,
      }),
    });
    const data = await res.json();
    return {
      message: data.message ?? "",
      options: data.options ?? [],
      priceRanges: data.priceRanges,
      newConditions: data.newConditions,
    };
  }

  async function startFlow(keyword: string, prevMessages: ChatMessage[]) {
    // 新規検索：セッションをリセットして新規作成
    sessionIdRef.current = null;
    setSessionId(null);

    // 「〜が欲しい」「おすすめの〜」などの文章から商品名だけを抽出
    const cleanedKeyword = keyword
      .replace(/[？?。、！!「」【】]/g, "")
      .replace(/\d+万円(以内|以上|くらい|程度)?/g, "")
      .replace(/(おすすめ|人気|が欲しい|を探している|教えてください?|を探して)(の|は|な|よ)?/g, "")
      .replace(/(が|は|を|に|で)(欲しい|探している|ください|教えて)/g, "")
      .trim()
      .slice(0, 30) || keyword;

    setOriginalKeyword(cleanedKeyword);
    setConditions({ ...INITIAL_CONDITIONS, keyword: cleanedKeyword });
    setChatPhase("questioning");
    setQuestionStep(0);
    setFinalProducts([]);
    setCurrentOptions([]);

    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: keyword }),
    }).catch(() => {});

    // セッション作成（非同期、完了前にClaudeを呼び出してもOK）
    ensureSession();

    // Claude に最初の質問を生成させる（messages由来の履歴を渡す）
    const initHistory = prevMessages.map(m => ({ role: m.role, content: m.content }));
    const { message: naviMsg, options, priceRanges } = await callQuestionAPI(keyword, initHistory, cleanedKeyword);
    if (priceRanges) setDynamicPriceRanges(priceRanges);
    addMsg("assistant", naviMsg);
    setCurrentOptions(options);

    // キーワードと最初のClaudeメッセージを保存
    saveMsg("user", keyword);
    saveMsg("assistant", naviMsg);
  }

  async function fetchProducts(keyword: string, cond: Conditions, history: ConversationMessage[]) {
    addMsg("assistant", "条件に合う商品を探しています...");
    scrollToBottom();

    // 性別・features・other を全てキーワードに含める
    const searchKeyword = [
      keyword,
      cond.gender ?? "",
      cond.useCase && cond.useCase !== "こだわらない" && cond.useCase !== "特に決めていない" ? cond.useCase : "",
      ...(cond.features ?? []),
      cond.other && cond.other !== "特になし" && cond.other !== "こだわらない" ? cond.other : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: searchKeyword,
          originalKeyword: keyword,
          searchConditions: { minPrice: cond.minPrice, maxPrice: cond.maxPrice, gender: cond.gender },
          conversationHistory: history,
          isFinal: true,
        }),
      });

      const data = await res.json();

      if (data.products?.length > 0) {
        const balanced = getBalancedProducts(data.products);
        setChatPhase("result");

        const summary = buildSummary(cond);
        const resultMsg =
          (summary ? summary + "\n" : "") + `${data.products.length}件見つかりました！`;

        // ローディングメッセージを商品入りメッセージに置き換える
        setMessages(prev => {
          const withoutLoading = prev.slice(0, -1);
          return [...withoutLoading, { role: "assistant" as const, content: resultMsg, products: balanced }];
        });

        saveMsg("assistant", resultMsg, balanced);
      } else {
        addMsg("assistant", "申し訳ありません、商品を取得できませんでした。もう一度お試しください。");
        doResetFlow();
      }
    } catch {
      addMsg("assistant", "エラーが発生しました。もう一度お試しください。");
      doResetFlow();
    }
  }

  // ── 条件蓄積ユーティリティ ────────────────────────────

  const updateConditionsFromAnswer = (answer: string) => {
    setConditions(prev => {
      const updated = { ...prev }

      if (
        answer.includes("メンズ") ||
        answer.includes("男性") ||
        answer.includes("男")
      ) {
        updated.gender = "メンズ"
      }
      if (
        answer.includes("レディース") ||
        answer.includes("女性") ||
        answer.includes("女")
      ) {
        updated.gender = "レディース"
      }

      const priceMatch = answer.match(/(\d+)万円/)
      if (priceMatch) {
        const price = parseInt(priceMatch[1]) * 10000
        updated.maxPrice = price
        updated.minPrice = Math.floor(price * 0.7)
      }

      return updated
    })
  }

  // ── メイン送信ハンドラ ────────────────────────────────

  async function handleSubmit(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    // updatedMessages を同期的に構築してから state を更新する
    const newUserMessage: ChatMessage = { role: "user", content: msg }
    const updatedMessages: ChatMessage[] = [...messages, newUserMessage]

    setMessages(updatedMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "44px";
    setLoading(true);
    setCurrentOptions([]);
    scrollToBottom();

    updateConditionsFromAnswer(msg);

    try {
      switch (chatPhase) {
        case "idle":
        case "result": {
          await startFlow(msg, updatedMessages);
          break;
        }

        case "questioning": {
          const newCond = applyConditionAnswer(msg, questionStep, conditions, dynamicPriceRanges);
          setConditions(newCond);
          const nextStep = questionStep + 1;
          setQuestionStep(nextStep);

          saveMsg("user", msg);

          // updatedMessages を使って最新のユーザー回答も履歴に含める
          const questionHistory = updatedMessages.map(m => ({ role: m.role, content: m.content }));
          const { message: naviMsg, options, newConditions } = await callQuestionAPI(msg, questionHistory, originalKeyword, newCond);
          // Claude が抽出した条件を非破壊的にマージ
          if (newConditions) {
            setConditions(prev => ({
              ...prev,
              gender: newConditions.gender ?? prev.gender,
              minPrice: newConditions.minPrice ?? prev.minPrice,
              maxPrice: newConditions.maxPrice ?? prev.maxPrice,
              features: (newConditions.features as string[] | undefined)?.length ? newConditions.features as string[] : prev.features,
              useCase: newConditions.useCase ?? prev.useCase,
            }));
          }
          addMsg("assistant", naviMsg);
          setCurrentOptions(options);
          saveMsg("assistant", naviMsg);

          if (nextStep >= MAX_QUESTIONS - 1) {
            setChatPhase("finalizing");
          }
          break;
        }

        case "finalizing": {
          const finalCond: Conditions = {
            ...conditions,
            other: msg !== "特になし" && msg !== "こだわらない" ? msg : null,
          };
          setConditions(finalCond);
          saveMsg("user", msg);
          const finalHistory = updatedMessages.map(m => ({ role: m.role, content: m.content }));
          await fetchProducts(originalKeyword, finalCond, finalHistory);
          break;
        }

        case "refining": {
          const refinedCond: Conditions = {
            ...conditions,
            other: conditions.other ? `${conditions.other} ${msg}` : msg,
          };
          setConditions(refinedCond);
          saveMsg("user", msg);
          // fetchProducts が result フェーズに戻すので setChatPhase は不要
          const refineHistory = updatedMessages.map(m => ({ role: m.role, content: m.content }));
          await fetchProducts(originalKeyword, refinedCond, refineHistory);
          break;
        }
      }
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const name = user?.firstName ?? user?.username ?? null;

  return (
    <div
      style={{
        position: "fixed",
        top: "var(--nav-top-h)",
        bottom: "calc(var(--nav-bottom-h) + env(safe-area-inset-bottom))",
        left: 0,
        right: 0,
        display: "flex",
        overflow: "hidden",
        background: "var(--color-bg)",
      }}
    >
      {/* サイドバー */}
      <ChatSidebar
        currentSessionId={sessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* チャットエリア */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* スマホ用ヘッダー */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="履歴を開く"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 text-gray-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-700 truncate">
            {messages.length > 0 ? "チャット" : "Navi AI検索"}
          </span>
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 transition"
              aria-label="新しいチャット"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
        </div>

        {/* メッセージエリア */}
        <div
          ref={messagesRef}
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
        >
          {messages.length === 0 && chatPhase === "idle" ? (
            /* ウェルカム画面 */
            <div className="flex flex-col items-center justify-center h-full px-4 gap-8">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500 shadow-lg mx-auto">
                  <NaviIcon size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {name ? `こんにちは、${name}さん` : "Naviへようこそ"}
                </h1>
                <p className="text-gray-400 text-sm">商品名・カテゴリを教えてください！</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSubmit(prompt)}
                    className="text-left p-4 rounded-2xl border border-gray-200 bg-white hover:border-sky-300 hover:bg-sky-50 transition text-sm text-gray-600 leading-snug shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto w-full">
              {/* メッセージ一覧 */}
              {(() => {
                // 最後に商品があるメッセージのインデックスを計算
                const lastProductIdx = messages.reduce(
                  (last, m, i) => ((m.products?.length ?? 0) > 0 ? i : last),
                  -1
                );
                return messages.map((msg, index) =>
                  msg.role === "user" ? (
                    <div key={index} className="flex justify-end">
                      <div className="bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={index}>
                      {/* テキストメッセージ */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shrink-0 mt-0.5">
                          <NaviIcon size={16} />
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap pt-1">
                          {msg.content}
                        </p>
                      </div>

                      {/* 商品カルーセル（メッセージに永続化・全幅） */}
                      {(msg.products?.length ?? 0) > 0 && (
                        <div className="mt-3 space-y-2">
                          <ProductCarousel
                            key={`carousel-${index}`}
                            products={msg.products!}
                            getBadge={(p, i) => getBadge(p, i, msg.products!)}
                          />

                          {/* アクションボタンは最後の商品メッセージのみ */}
                          {index === lastProductIdx && chatPhase === "result" && (
                            <div className="space-y-2 pt-2">
                              <button
                                onClick={() => {
                                  setChatPhase("refining");
                                  setCurrentOptions([]);
                                  addMsg("assistant", "どんな条件を変えますか？（例：予算を上げる、別のブランドにする、など）");
                                  scrollToBottom();
                                }}
                                disabled={loading}
                                className="w-full rounded-xl bg-white text-sm font-medium hover:bg-gray-50 transition disabled:opacity-40"
                                style={{
                                  border: "1.5px solid var(--color-primary)",
                                  color: "var(--color-text)",
                                  padding: "14px",
                                  minHeight: "52px",
                                }}
                              >
                                🔍 条件を追加して絞り込む
                              </button>
                              <button
                                onClick={() => {
                                  doResetFlow();
                                  setMessages([]);
                                  sessionIdRef.current = null;
                                  setSessionId(null);
                                }}
                                className="w-full rounded-xl bg-white text-sm font-medium hover:bg-gray-50 transition"
                                style={{
                                  border: "1.5px solid var(--color-border)",
                                  color: "var(--color-text-sub)",
                                  padding: "14px",
                                  minHeight: "52px",
                                }}
                              >
                                🔄 別の商品を探す
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                );
              })()}

              {/* Claudeが生成した選択肢ボタン */}
              {currentOptions.length > 0 && !loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shrink-0 mt-0.5">
                    <NaviIcon size={16} />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {currentOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSubmit(opt)}
                        disabled={loading}
                        className="px-4 text-sm bg-white border rounded-2xl disabled:opacity-40 transition font-medium"
                        style={{
                          borderColor: "var(--color-primary)",
                          color: "var(--color-primary)",
                          minHeight: "44px",
                          padding: "10px 16px",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}


              {/* ローディング */}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
                    <NaviIcon size={16} />
                  </div>
                  <TypingDots />
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* 入力バー */}
        <div className="border-t border-gray-100 bg-white px-4 py-3 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setTimeout(adjustHeight, 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if (input.trim() && !loading) handleSubmit();
                  }
                }}
                placeholder={
                  chatPhase === "questioning" || chatPhase === "finalizing"
                    ? "またはここに入力して回答…"
                    : chatPhase === "refining"
                    ? "追加条件を入力（例：白がいい、軽量タイプ）…"
                    : chatPhase === "result"
                    ? "新しい商品を探す…"
                    : "商品名やカテゴリを入力…"
                }
                rows={1}
                style={{
                  flex: 1,
                  height: "44px",
                  minHeight: "44px",
                  maxHeight: "116px",
                  padding: "10px 16px",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: "24px",
                  fontSize: "16px",
                  lineHeight: "24px",
                  resize: "none",
                  outline: "none",
                  overflowY: "auto",
                  background: "var(--color-bg)",
                  fontFamily: "inherit",
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  transition: "height 0.1s ease",
                  color: "var(--color-text)",
                }}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || loading}
                className="w-11 h-11 flex items-center justify-center rounded-full disabled:opacity-30 transition shrink-0"
                style={{ background: input.trim() ? "var(--color-primary)" : "var(--color-border)" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              Enter で送信 / Shift+Enter で改行
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
