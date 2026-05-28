export type PriceRange = {
  label: string;
  min: number | null;
  max: number | null;
};

type CategoryPriceConfig = {
  keywords: string[];
  ranges: PriceRange[];
};

export const CATEGORY_PRICE_CONFIG: CategoryPriceConfig[] = [
  {
    keywords: ["PC", "パソコン", "ノートPC", "MacBook", "laptop", "デスクトップ"],
    ranges: [
      { label: "〜5万円", min: null, max: 50000 },
      { label: "5〜10万円", min: 50000, max: 100000 },
      { label: "10〜15万円", min: 100000, max: 150000 },
      { label: "15万円以上", min: 150000, max: null },
      { label: "こだわりなし", min: null, max: null },
    ],
  },
  {
    keywords: ["スマホ", "iPhone", "Android", "タブレット", "iPad", "スマートフォン"],
    ranges: [
      { label: "〜3万円", min: null, max: 30000 },
      { label: "3〜6万円", min: 30000, max: 60000 },
      { label: "6〜10万円", min: 60000, max: 100000 },
      { label: "10万円以上", min: 100000, max: null },
      { label: "こだわりなし", min: null, max: null },
    ],
  },
  {
    keywords: ["イヤホン", "ヘッドホン", "ワイヤレスイヤホン", "AirPods"],
    ranges: [
      { label: "〜3,000円", min: null, max: 3000 },
      { label: "3,000〜1万円", min: 3000, max: 10000 },
      { label: "1〜3万円", min: 10000, max: 30000 },
      { label: "3万円以上", min: 30000, max: null },
      { label: "こだわりなし", min: null, max: null },
    ],
  },
  {
    keywords: ["冷蔵庫", "洗濯機", "エアコン", "テレビ", "掃除機", "電子レンジ"],
    ranges: [
      { label: "〜3万円", min: null, max: 30000 },
      { label: "3〜6万円", min: 30000, max: 60000 },
      { label: "6〜10万円", min: 60000, max: 100000 },
      { label: "10万円以上", min: 100000, max: null },
      { label: "こだわりなし", min: null, max: null },
    ],
  },
  {
    keywords: ["カメラ", "一眼", "ミラーレス", "レンズ", "デジカメ"],
    ranges: [
      { label: "〜5万円", min: null, max: 50000 },
      { label: "5〜10万円", min: 50000, max: 100000 },
      { label: "10〜20万円", min: 100000, max: 200000 },
      { label: "20万円以上", min: 200000, max: null },
      { label: "こだわりなし", min: null, max: null },
    ],
  },
  {
    keywords: ["服", "コート", "ジャケット", "パンツ", "シャツ", "ワンピース"],
    ranges: [
      { label: "〜3,000円", min: null, max: 3000 },
      { label: "3,000〜1万円", min: 3000, max: 10000 },
      { label: "1〜3万円", min: 10000, max: 30000 },
      { label: "3万円以上", min: 30000, max: null },
      { label: "こだわりなし", min: null, max: null },
    ],
  },
  {
    keywords: ["ソファ", "デスク", "椅子", "ベッド", "棚", "テーブル", "チェア", "家具"],
    ranges: [
      { label: "〜1万円", min: null, max: 10000 },
      { label: "1〜3万円", min: 10000, max: 30000 },
      { label: "3〜10万円", min: 30000, max: 100000 },
      { label: "10万円以上", min: 100000, max: null },
      { label: "こだわりなし", min: null, max: null },
    ],
  },
  {
    keywords: [],
    ranges: [
      { label: "〜1,000円", min: null, max: 1000 },
      { label: "1,000〜5,000円", min: 1000, max: 5000 },
      { label: "5,000〜1万円", min: 5000, max: 10000 },
      { label: "1万円以上", min: 10000, max: null },
      { label: "こだわりなし", min: null, max: null },
    ],
  },
];

export function getPriceRanges(keyword: string): PriceRange[] {
  const kw = keyword.toLowerCase();
  const config = CATEGORY_PRICE_CONFIG.find((c) =>
    c.keywords.some((k) => kw.includes(k.toLowerCase()))
  );
  return config?.ranges ?? CATEGORY_PRICE_CONFIG[CATEGORY_PRICE_CONFIG.length - 1].ranges;
}
