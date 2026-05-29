import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 mt-12 py-8 px-4">
      <div className="max-w-xl mx-auto flex flex-col items-center gap-4">
        <div className="flex gap-6 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-gray-800 transition">
            プライバシーポリシー
          </Link>
          <Link href="/about" className="hover:text-gray-800 transition">
            運営者情報
          </Link>
          <Link href="/contact" className="hover:text-gray-800 transition">
            お問い合わせ
          </Link>
        </div>
        <p className="text-xs text-gray-400 text-center">
          当サイトは楽天アフィリエイト・Amazonアソシエイトプログラムの参加者です。
        </p>
        <p className="text-xs text-gray-400">© 2026 Navi All Rights Reserved.</p>
      </div>
    </footer>
  );
}
