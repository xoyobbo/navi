import Header from "@/components/Header";
import UserSync from "@/components/UserSync";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <UserSync />
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-500 shadow-xl">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="h-11 w-11"
          >
            <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
            <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Navi</h1>
        <p className="mt-3 text-lg text-gray-500">あなたの買い物、AIが一緒に選ぶ</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/home"
            className="rounded-2xl bg-sky-500 px-8 py-3 text-base font-semibold text-white shadow-md transition hover:bg-sky-600"
          >
            はじめる
          </Link>
          <Link
            href="/sign-in"
            className="rounded-2xl border border-gray-200 px-8 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            ログイン
          </Link>
        </div>
      </main>
    </>
  );
}
