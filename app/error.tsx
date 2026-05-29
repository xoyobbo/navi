"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-6 text-center">
      <p className="text-4xl">😅</p>
      <h2 className="text-xl font-semibold text-gray-900">エラーが発生しました</h2>
      <p className="text-sm text-gray-500 max-w-xs">
        {error.message || "予期せぬエラーが発生しました"}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition"
      >
        もう一度試す
      </button>
    </div>
  );
}
