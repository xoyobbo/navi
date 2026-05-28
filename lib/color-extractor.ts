export const COLOR_MAP: Record<string, string> = {
  "ブラック": "#1a1a1a",
  "ホワイト": "#f5f5f5",
  "シルバー": "#C0C0C0",
  "ゴールド": "#FFD700",
  "レッド": "#DC143C",
  "ブルー": "#1E90FF",
  "グリーン": "#228B22",
  "ピンク": "#FF69B4",
  "ネイビー": "#000080",
  "グレー": "#808080",
  "ベージュ": "#F5F5DC",
  "ブラウン": "#8B4513",
  "オレンジ": "#FF8C00",
  "パープル": "#800080",
  "イエロー": "#FFD700",
};

export function extractColors(productName: string): string[] {
  return Object.keys(COLOR_MAP).filter((color) =>
    productName.includes(color)
  );
}
