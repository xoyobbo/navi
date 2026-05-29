"use client";

import { SignInButton, SignOutButton, useAuth, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        {/* 左側：プラットフォームアイコン + ロゴ */}
        <div className="flex items-center gap-3">
          {/* 横断検索プラットフォームバッジ */}
          <div className="flex items-center gap-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">楽</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-600">Y!</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-700">A</span>
          </div>
          {/* ロゴ */}
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="h-5 w-5"
              >
                <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
                <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
              </svg>
            </span>
            <span className="text-lg font-bold text-gray-900">Navi</span>
          </Link>
        </div>

        {/* 右側：ログイン状態による切り替え */}
        {isSignedIn ? (
          <div className="flex items-center gap-3">
            {/* ユーザーアイコン */}
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName ?? "ユーザー"}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-sky-100"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-600">
                {user?.firstName?.[0] ?? "U"}
              </div>
            )}
            {/* ログアウト */}
            <SignOutButton>
              <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100">
                ログアウト
              </button>
            </SignOutButton>
          </div>
        ) : (
          <SignInButton mode="redirect">
            <button className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600">
              ログイン
            </button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
