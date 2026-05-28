"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductCarousel from "@/components/ProductCarousel";
import ChatSidebar from "@/components/ChatSidebar";
import type { Product } from "@/types/product";
import type { PriceRange } from "@/lib/category-price-ranges";

const SUGGESTED_PROMPTS = [
  "イヤホンが欲しい",
  "コスパの良いスマートウォッチ",
  "初心者向けのカメラ",
  "プレゼントに喜ばれる美容グッズ",
];

// ── 型定義 ────────────────────────────────────────────────

type ChatPhase = "idle" | "questioning" | "finalizing" | "result" | "refining";
type ChatMsg =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string };
type ConversationMessage = { role: "user" | "assistant"; content: string };
type Conditions = {
  keyword: string;
  minPrice: number | null;
  maxPrice: number | null;
  useCase: string | null;
  features: string[];
  other: string | null;
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

function applyConditionAnswer(
  answer: string,
  step: number,
  current: Conditions,
  priceRanges: PriceRange[]
): Conditions {
  const updated = { ...current };
  if (step === 0) {
    const range = priceRanges.find((r) => r.label === answer);
    if (range) {
      updated.minPrice = range.min;
      updated.maxPrice = range.max;
    }
  } else if (step === 1) {
    updated.useCase = answer;
  } else if (step === 2) {
    updated.features = [answer];
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

  const [messages, setMessages] = useState<ChatMsg[]>([]);

  // フロー管理
  const [chatPhase, setChatPhase] = useState<ChatPhase>("idle");
  const [questionStep, setQuestionStep] = useState(0);
  const [originalKeyword, setOriginalKeyword] = useState("");
  const [conditions, setConditions] = useState<Conditions>(INITIAL_CONDITIONS);

  // Claude会話履歴・選択肢・価格帯
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function addMsg(role: "user" | "assistant", text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text }]);
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
    setConversationHistory([]);
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

      const msgs: ChatMsg[] = (data.messages ?? []).map(
        (m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          text: m.content,
        })
      );
      setMessages(msgs);

      // 最初のユーザーメッセージをキーワードとして復元
      const firstUser = (data.messages ?? []).find(
        (m: { role: string }) => m.role === "user"
      );
      if (firstUser) setOriginalKeyword(firstUser.content);

      // 最後に商品データがあるメッセージから商品を復元
      const lastWithProducts = [...(data.messages ?? [])]
        .reverse()
        .find((m: { products?: Product[] }) => (m.products?.length ?? 0) > 0);

      if (lastWithProducts?.products) {
        const restored = getBalancedProducts(lastWithProducts.products);
        setFinalProducts(restored);
        setCarouselKey((k) => k + 1);
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
    history: ConversationMessage[]
  ): Promise<{ message: string; options: string[]; priceRanges?: PriceRange[] }> {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversationHistory: history,
        isQuestion: true,
      }),
    });
    const data = await res.json();
    return {
      message: data.message ?? "",
      options: data.options ?? [],
      priceRanges: data.priceRanges,
    };
  }

  async function startFlow(keyword: string) {
    // 新規検索：セッションをリセットして新規作成
    sessionIdRef.current = null;
    setSessionId(null);

    setOriginalKeyword(keyword);
    setConditions({ ...INITIAL_CONDITIONS, keyword });
    setChatPhase("questioning");
    setQuestionStep(0);
    setFinalProducts([]);
    setConversationHistory([]);
    setCurrentOptions([]);

    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: keyword }),
    }).catch(() => {});

    // セッション作成（非同期、完了前にClaudeを呼び出してもOK）
    ensureSession();

    // Claude に最初の質問を生成させる
    const { message: naviMsg, options, priceRanges } = await callQuestionAPI(keyword, []);
    if (priceRanges) setDynamicPriceRanges(priceRanges);
    const newHistory: ConversationMessage[] = [
      { role: "user", content: keyword },
      { role: "assistant", content: naviMsg },
    ];
    setConversationHistory(newHistory);
    addMsg("assistant", naviMsg);
    setCurrentOptions(options);

    // キーワードと最初のClaudeメッセージを保存
    saveMsg("user", keyword);
    saveMsg("assistant", naviMsg);
  }

  async function fetchProducts(keyword: string, cond: Conditions) {
    addMsg("assistant", "条件に合う商品を探しています...");
    scrollToBottom();

    const searchKeyword = [keyword, cond.features[0] ?? "", cond.other ?? ""]
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
          searchConditions: { minPrice: cond.minPrice, maxPrice: cond.maxPrice },
          isFinal: true,
        }),
      });

      const data = await res.json();

      if (data.products?.length > 0) {
        const balanced = getBalancedProducts(data.products);
        setFinalProducts(balanced);
        setCarouselKey((k) => k + 1);
        setChatPhase("result");

        const summary = buildSummary(cond);
        const resultMsg =
          (summary ? summary + "\n" : "") + `${data.products.length}件見つかりました！`;
        addMsg("assistant", resultMsg);
        saveMsg("assistant", resultMsg, balanced);
      } else {
        addMsg("assistant", "条件に合う商品が見つかりませんでした。条件を変えてもう一度お試しください。");
        doResetFlow();
      }
    } catch {
      addMsg("assistant", "エラーが発生しました。もう一度お試しください。");
      doResetFlow();
    }
  }

  // ── メイン送信ハンドラ ────────────────────────────────

  async function handleSubmit(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    addMsg("user", msg);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);
    setCurrentOptions([]);
    scrollToBottom();

    try {
      switch (chatPhase) {
        case "idle":
        case "result": {
          await startFlow(msg);
          break;
        }

        case "questioning": {
          const newCond = applyConditionAnswer(msg, questionStep, conditions, dynamicPriceRanges);
          setConditions(newCond);
          const nextStep = questionStep + 1;
          setQuestionStep(nextStep);

          saveMsg("user", msg);

          const { message: naviMsg, options } = await callQuestionAPI(msg, conversationHistory);
          const nextHistory: ConversationMessage[] = [
            ...conversationHistory,
            { role: "user", content: msg },
            { role: "assistant", content: naviMsg },
          ];
          setConversationHistory(nextHistory);
          addMsg("assistant", naviMsg);
          setCurrentOptions(options);
          saveMsg("assistant", naviMsg);

          if (nextStep >= 3) {
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
          await fetchProducts(originalKeyword, finalCond);
          break;
        }

        case "refining": {
          const refinedCond: Conditions = {
            ...conditions,
            other: conditions.other ? `${conditions.other} ${msg}` : msg,
          };
          setConditions(refinedCond);
          saveMsg("user", msg);
          setChatPhase("questioning"); // fetchProductsがresultに戻す
          await fetchProducts(originalKeyword, refinedCond);
          break;
        }
      }
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  const name = user?.firstName ?? user?.username ?? null;

  return (
    <div className="flex h-[calc(100vh-96px)]">
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
        <div className="flex-1 overflow-y-auto">
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
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shrink-0 mt-0.5">
                      <NaviIcon size={16} />
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap pt-1">
                      {msg.text}
                    </p>
                  </div>
                )
              )}

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
                        className="px-3 py-2 text-sm bg-white border border-sky-300 text-sky-700 rounded-xl hover:bg-sky-50 disabled:opacity-40 transition font-medium"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 検索結果：カルーセル表示 */}
              {(chatPhase === "result" || chatPhase === "refining") && finalProducts.length > 0 && (
                <div className="space-y-4">
                  <ProductCarousel
                    key={carouselKey}
                    products={finalProducts}
                    getBadge={(p, i) => getBadge(p, i, finalProducts)}
                  />

                  {/* 条件追加 / やり直しボタン */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => {
                        setChatPhase("refining");
                        setCurrentOptions([]);
                        addMsg(
                          "assistant",
                          "もちろんです！どんな条件を追加しますか？（例：ホワイトがいい、Sony製がいい、など）"
                        );
                        scrollToBottom();
                      }}
                      disabled={loading}
                      className="w-full py-3 border border-gray-900 rounded-xl bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 transition disabled:opacity-40"
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
                      className="w-full py-3 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
                    >
                      🔄 別の商品を探す
                    </button>
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
            <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 transition">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSubmit();
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
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none resize-none leading-relaxed"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-sky-500 disabled:opacity-30 transition shrink-0"
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
