"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SOURCES = [
  {
    id: "rakuten",
    name: "楽天市場",
    icon: "🛒",
    color: "#BF0000",
    available: true,
  },
  {
    id: "yahoo",
    name: "Yahoo!ショッピング",
    icon: "🛍️",
    color: "#FF0033",
    available: true,
  },
  {
    id: "amazon",
    name: "Amazon",
    icon: "📦",
    color: "#FF9900",
    available: false,
  },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [ranking, setRanking] = useState<string[]>([]);

  const handleSelect = (id: string) => {
    if (ranking.includes(id)) {
      setRanking((prev) => prev.filter((r) => r !== id));
    } else {
      setRanking((prev) => [...prev, id]);
    }
  };

  const getRank = (id: string) => {
    const index = ranking.indexOf(id);
    return index === -1 ? null : index + 1;
  };

  const handleSubmit = async () => {
    if (ranking.length === 0) return;

    try {
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredSources: ranking }),
      });
    } catch (e) {
      console.error(e);
    }

    router.push("/search");
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: "#fafaf8",
      }}
    >
      {/* ロゴ */}
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1a1a1a, #333)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
          marginBottom: "24px",
        }}
      >
        ✨
      </div>

      {/* タイトル */}
      <h1
        style={{
          fontSize: "22px",
          fontWeight: "800",
          color: "#1a1a1a",
          marginBottom: "8px",
          textAlign: "center",
        }}
      >
        Naviへようこそ！
      </h1>

      <p
        style={{
          fontSize: "14px",
          color: "#888",
          textAlign: "center",
          lineHeight: "1.6",
          marginBottom: "32px",
        }}
      >
        よく使うショッピングサイトを
        好きな順番に選んでください。
        検索結果に反映されます。
      </p>

      {/* 選択肢 */}
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginBottom: "32px",
        }}
      >
        {SOURCES.map((source) => {
          const rank = getRank(source.id);
          const isSelected = rank !== null;

          return (
            <button
              key={source.id}
              onClick={() => source.available && handleSelect(source.id)}
              disabled={!source.available}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px",
                background: isSelected ? "white" : "#f5f5f5",
                border: isSelected
                  ? `2px solid ${source.color}`
                  : "2px solid transparent",
                borderRadius: "12px",
                cursor: source.available ? "pointer" : "not-allowed",
                opacity: source.available ? 1 : 0.5,
                transition: "all 0.2s",
                textAlign: "left",
                boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {/* 順位バッジ */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: isSelected ? source.color : "#e8e8e4",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "700",
                  flexShrink: 0,
                }}
              >
                {isSelected ? rank : "　"}
              </div>

              {/* アイコン＋名前 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <span style={{ fontSize: "24px" }}>{source.icon}</span>
                <div>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#1a1a1a",
                    }}
                  >
                    {source.name}
                  </p>
                  {!source.available && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#FF9900",
                        fontWeight: "500",
                      }}
                    >
                      準備中
                    </p>
                  )}
                </div>
              </div>

              {/* チェックマーク */}
              {isSelected && (
                <span style={{ color: source.color, fontSize: "20px" }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 説明文 */}
      <p
        style={{
          fontSize: "12px",
          color: "#aaa",
          textAlign: "center",
          marginBottom: "24px",
        }}
      >
        タップした順番が優先順位になります
        <br />
        マイページからいつでも変更できます
      </p>

      {/* 次へボタン */}
      <button
        onClick={handleSubmit}
        disabled={ranking.length === 0}
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "16px",
          background: ranking.length > 0 ? "#1a1a1a" : "#e8e8e4",
          color: "white",
          border: "none",
          borderRadius: "12px",
          fontSize: "16px",
          fontWeight: "700",
          cursor: ranking.length > 0 ? "pointer" : "not-allowed",
          transition: "background 0.2s",
        }}
      >
        {ranking.length > 0 ? "Naviをはじめる →" : "1つ以上選んでください"}
      </button>
    </div>
  );
}
