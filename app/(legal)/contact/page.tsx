export const metadata = {
  title: "お問い合わせ | Navi",
};

export default function ContactPage() {
  return (
    <article className="prose prose-sm max-w-none">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">お問い合わせ</h1>

      <p className="text-gray-600 leading-relaxed mb-6">
        ご意見・ご要望・不具合報告など、お気軽にお問い合わせください。
      </p>

      <div className="bg-sky-50 rounded-2xl p-6">
        <p className="text-gray-600 text-sm">
          お問い合わせはサービス内のフィードバック機能よりお送りください。
        </p>
      </div>

      <p className="text-sm text-gray-400 mt-8">
        通常2〜3営業日以内にご返信いたします。
      </p>
    </article>
  );
}
