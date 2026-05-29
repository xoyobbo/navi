// Clerk に依存しない純粋な静的ランディングページ
// ボタンは <a> タグで確実に遷移する
export default function RootPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white flex flex-col">
      {/* ヘッダー */}
      <header className="px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
              <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">Navi</span>
        </div>
        <a
          href="/sign-in"
          className="text-sm font-medium text-sky-600 hover:text-sky-700 transition"
        >
          ログイン
        </a>

      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8">
        <div className="space-y-4 max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sky-500 rounded-3xl shadow-lg mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-10 h-10">
              <path d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            AIが一緒に<br />選んでくれる
          </h1>
          <p className="text-gray-500 text-base leading-relaxed">
            話しかけるだけで、楽天・Yahoo!の商品から
            あなたにぴったりのものを提案します。
          </p>
        </div>

        {/* 特徴リスト */}
        <div className="w-full max-w-sm space-y-3">
          {[
            { icon: "🤖", text: "AIが予算・用途・好みをヒアリング" },
            { icon: "🛍️", text: "楽天・Yahoo!から最適な商品を厳選" },
            { icon: "📈", text: "使うほど好みを学習してパーソナライズ" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
              <span className="text-xl shrink-0">{icon}</span>
              <p className="text-sm text-gray-700 text-left">{text}</p>
            </div>
          ))}
        </div>

        {/* CTAボタン */}
        <div className="w-full max-w-sm space-y-3">
          <a
            href="/sign-up"
            className="block w-full text-center text-base font-bold text-white bg-sky-500 hover:bg-sky-600 transition rounded-2xl py-4 shadow-md"
          >
            はじめる（無料）
          </a>
          <a
            href="/sign-in"
            className="block w-full text-center text-base font-medium text-gray-600 bg-white hover:bg-gray-50 transition rounded-2xl py-4 border border-gray-200 shadow-sm"
          >
            ログイン
          </a>
        </div>
      </main>

      <footer className="pb-8 text-center text-xs text-gray-400">
        © 2025 Navi. All rights reserved.
      </footer>
    </div>
  );
}
