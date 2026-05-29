"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function useBackButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isProduct      = pathname.startsWith("/product/");
  const isSearchResult = pathname === "/search" && !!searchParams.get("q");
  const isMypage       = pathname === "/mypage";
  const isSettings     = pathname === "/settings";

  const isBack = isProduct || isSearchResult || isMypage || isSettings;

  const handleBack = () => {
    if (isSearchResult) {
      router.push("/search");
    } else if (isProduct) {
      router.back();
    } else if (isMypage || isSettings) {
      router.push("/search");
    }
  };

  return { isBack, handleBack };
}

function TopNavInner() {
  const pathname = usePathname();
  const { isBack, handleBack } = useBackButton();

  const isChat   = pathname === "/chat"   || pathname.startsWith("/chat/");
  const isSearch = pathname === "/search" || pathname.startsWith("/search/");
  const showToggle = isChat || isSearch;

  return (
    <header
      className="flex md:hidden"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "white",
        borderBottom: "1px solid var(--color-border)",
        height: "56px",
        alignItems: "center",
        padding: "0 12px",
        gap: "4px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* 戻るボタン or ロゴ */}
      {isBack ? (
        <button
          onClick={handleBack}
          aria-label="戻る"
          style={{
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "none",
            background: "none",
            color: "var(--color-text)",
            flexShrink: 0,
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      ) : (
        <Link
          href="/search"
          style={{
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            lineHeight: 1,
            textDecoration: "none",
            padding: "6px 4px",
            minHeight: "44px",
            justifyContent: "center",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--color-text)", fontSize: "22px", letterSpacing: "0.04em" }}>Navi</span>
          <span style={{ fontSize: "9px", color: "var(--color-text-sub)", fontWeight: 400, letterSpacing: "0.08em", marginTop: "1px" }}>AI Shopping</span>
        </Link>
      )}

      {/* トグル（中央） */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        {showToggle && (
          <div style={{
            display: "flex",
            background: "var(--color-bg)",
            borderRadius: "999px",
            padding: "3px",
            gap: "2px",
          }}>
            <Link
              href="/chat"
              style={{
                padding: "6px 20px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s",
                color: isChat ? "var(--color-text)" : "var(--color-text-sub)",
                background: isChat ? "white" : "transparent",
                boxShadow: isChat ? "var(--shadow-sm)" : "none",
                minHeight: "36px",
                display: "flex",
                alignItems: "center",
              }}
            >
              AI検索
            </Link>
            <Link
              href="/search"
              style={{
                padding: "6px 20px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s",
                color: isSearch ? "var(--color-text)" : "var(--color-text-sub)",
                background: isSearch ? "white" : "transparent",
                boxShadow: isSearch ? "var(--shadow-sm)" : "none",
                minHeight: "36px",
                display: "flex",
                alignItems: "center",
              }}
            >
              商品検索
            </Link>
          </div>
        )}
      </div>

      {/* 右側ボタン */}
      <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
        <Link
          href="/mypage"
          aria-label="お気に入り"
          style={{
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            color: pathname === "/mypage" ? "var(--color-accent)" : "var(--color-text-sub)",
            textDecoration: "none",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: "22px", height: "22px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </Link>

        <Link
          href="/settings"
          aria-label="設定"
          style={{
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            color: pathname === "/settings" ? "var(--color-accent)" : "var(--color-text-sub)",
            textDecoration: "none",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: "22px", height: "22px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

export default function TopNav() {
  return (
    <Suspense fallback={null}>
      <TopNavInner />
    </Suspense>
  );
}
