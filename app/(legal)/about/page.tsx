export const metadata = {
  title: "運営者情報 | Navi",
};

export default function AboutPage() {
  return (
    <article className="prose prose-sm max-w-none">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">運営者情報</h1>

      <section className="mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ["サービス名", "Navi"],
                ["サイトURL", "https://navi-shop.jp"],
                ["運営者", "柳川翔亮"],
                ["所在地", "千葉県柏市"],
                ["メール", "liuchuanxiangliang@gmail.com"],
                ["事業内容", "AIショッピングアシスタント事業"],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-3 pr-6 text-gray-500 font-medium whitespace-nowrap w-32">{label}</td>
                  <td className="py-3 text-gray-800">
                    {label === "メール" ? (
                      <a href={`mailto:${value}`} className="text-sky-600 underline">{value}</a>
                    ) : label === "サイトURL" ? (
                      <a href={value} className="text-sky-600 underline">{value}</a>
                    ) : value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">サービス概要</h2>
        <p className="text-gray-600 leading-relaxed">
          NaviはAIを活用したショッピングアシスタントです。
          ユーザーとの会話を通じて最適な商品を提案します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">アフィリエイト表記</h2>
        <p className="text-gray-600 leading-relaxed">
          当サイトは楽天アフィリエイト・Amazonアソシエイト等の
          アフィリエイトプログラムの参加者です。
        </p>
      </section>
    </article>
  );
}
