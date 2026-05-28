"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const pathname = usePathname();
  const isChat = pathname === "/chat" || pathname.startsWith("/chat/");
  const isSearch = pathname === "/search" || pathname.startsWith("/search/");
  const showToggle = isChat || isSearch;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 h-14 flex items-center px-4">
      {/* ロゴ */}
      <Link href="/chat" className="flex flex-col shrink-0 mr-4 leading-none">
        <span className="font-bold text-gray-900 text-xl tracking-tight">Navi</span>
        <span className="text-[9px] text-gray-400 font-normal tracking-wide mt-0.5">AI Shopping</span>
      </Link>

      {/* トグル（中央） */}
      <div className="flex-1 flex justify-center">
        {showToggle && (
          <div className="flex bg-gray-100 rounded-full p-1 gap-0.5">
            <Link
              href="/chat"
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                isChat
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              AI検索
            </Link>
            <Link
              href="/search"
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                isSearch
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              商品検索
            </Link>
          </div>
        )}
      </div>

      {/* 右側ボタンエリア */}
      <div className="flex items-center gap-1 shrink-0 ml-4">
        <Link
          href="/mypage"
          className={`flex items-center gap-1 h-9 px-2 rounded-full transition ${
            pathname === "/mypage" ? "bg-pink-50 text-pink-500" : "hover:bg-gray-100 text-gray-500"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span className="hidden md:inline text-sm font-medium">お気に入り</span>
        </Link>

        <Link
          href="/settings"
          className={`w-9 h-9 flex items-center justify-center rounded-full transition ${
            pathname === "/settings" ? "bg-sky-50 text-sky-500" : "hover:bg-gray-100 text-gray-500"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
