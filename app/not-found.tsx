import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-6">
      <p className="text-4xl">🔍</p>
      <h2 className="text-xl font-semibold text-gray-900">ページが見つかりません</h2>
      <p className="text-sm text-gray-500">お探しのページは存在しないか、移動した可能性があります。</p>
      <Link
        href="/search"
        className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition"
      >
        トップに戻る
      </Link>
    </div>
  );
}
