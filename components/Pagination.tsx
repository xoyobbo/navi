type Props = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

const ITEMS_PER_PAGE = 30;

export default function Pagination({ currentPage, totalPages, totalCount, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  return (
    <div className="px-4 pb-6">
      {/* 件数表示 */}
      <p className="text-sm text-gray-500 text-center mb-4">
        {totalCount.toLocaleString()}件中{" "}
        {startItem.toLocaleString()}〜{endItem.toLocaleString()}件を表示
      </p>

      {/* ページネーション */}
      <nav className="flex justify-center items-center gap-1 flex-wrap">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-4 py-2 text-sm border rounded transition ${
            currentPage === 1
              ? "border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
          }`}
        >
          ← 前へ
        </button>

        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`e${i}`} className="px-2 text-gray-400 text-sm select-none">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`min-w-[36px] px-3 py-2 text-sm border rounded transition ${
                currentPage === page
                  ? "bg-[#1a1a1a] text-white border-[#1a1a1a] font-bold"
                  : "border-gray-300 text-[#1a1a1a] bg-white hover:bg-gray-50"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-4 py-2 text-sm border rounded transition ${
            currentPage === totalPages
              ? "border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
          }`}
        >
          次へ →
        </button>
      </nav>
    </div>
  );
}
