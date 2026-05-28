"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SearchToggle() {
  const pathname = usePathname();
  const isChat = pathname === "/chat" || pathname.startsWith("/chat/");

  return (
    <div className="flex items-center bg-gray-100 rounded-2xl p-1 w-fit mx-auto">
      <Link
        href="/chat"
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
          isChat
            ? "bg-white text-sky-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <span>🤖</span>
        <span>AI検索</span>
      </Link>
      <Link
        href="/search"
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
          !isChat
            ? "bg-white text-sky-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <span>🔍</span>
        <span>商品検索</span>
      </Link>
    </div>
  );
}
