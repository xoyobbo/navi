export const metadata = {
  title: "プライバシーポリシー | Navi",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-sm max-w-none">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">プライバシーポリシー</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">基本方針</h2>
        <p className="text-gray-600 leading-relaxed">
          Navi（navi-shop.jp）は、ユーザーの個人情報保護を重要な責務と考え、
          以下の方針に従って個人情報を取り扱います。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">収集する情報</h2>
        <p className="text-gray-600 mb-2">以下の情報を収集します：</p>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>氏名・メールアドレス（ログイン時）</li>
          <li>検索履歴・閲覧履歴</li>
          <li>お気に入り登録情報</li>
          <li>アクセスログ</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">利用目的</h2>
        <p className="text-gray-600 mb-2">収集した情報は以下の目的で使用します：</p>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>サービスの提供・改善</li>
          <li>パーソナライズされた商品レコメンド</li>
          <li>お問い合わせへの対応</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">第三者提供</h2>
        <p className="text-gray-600 mb-2">以下の場合を除き、第三者に個人情報を提供しません：</p>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>法令に基づく場合</li>
          <li>ユーザーの同意がある場合</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">アフィリエイトについて</h2>
        <p className="text-gray-600 mb-2">当サイトは以下のアフィリエイトプログラムに参加しています：</p>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>楽天アフィリエイト</li>
          <li>Amazonアソシエイト（準備中）</li>
          <li>Yahoo!ショッピングアフィリエイト</li>
        </ul>
        <p className="text-gray-600 mt-3">
          これらのリンクを経由して商品を購入された場合、当サイトに紹介料が支払われます。
          購入者様への追加費用は一切ありません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Cookieの使用</h2>
        <p className="text-gray-600">
          当サイトはCookieを使用します。ブラウザの設定で無効にすることができます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">個人情報の管理</h2>
        <p className="text-gray-600">
          収集した個人情報は適切なセキュリティ対策のもと管理します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">お問い合わせ</h2>
        <p className="text-gray-600">
          プライバシーに関するお問い合わせは以下までご連絡ください：<br />
          メール：<a href="mailto:liuchuanxiangliang@gmail.com" className="text-sky-600 underline">liuchuanxiangliang@gmail.com</a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">改定</h2>
        <p className="text-gray-600">本ポリシーは予告なく変更する場合があります。</p>
      </section>

      <p className="text-sm text-gray-400 mt-12">制定日：2026年1月1日</p>
    </article>
  );
}
