import type { Product } from "@/types/product";

export function normalizeKeyword(keyword: string): string {
  return keyword
    .trim()
    // 全角スペース→半角スペース
    .replace(/　/g, " ")
    // 全角英数字→半角
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    )
    // 連続スペースを1つに
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * スペース区切りの複数キーワードを全て商品名に含む商品だけを返す（AND検索）
 * キーワードが1つだけの場合はそのまま返す
 */
export function filterByAllKeywords(
  products: Product[],
  keyword: string
): Product[] {
  const normalized = normalizeKeyword(keyword);
  const keywords = normalized.split(" ").filter((k) => k.length > 0);

  if (keywords.length <= 1) return products;

  return products.filter((product) => {
    const name = product.name.toLowerCase();
    return keywords.every((kw) => name.includes(kw.toLowerCase()));
  });
}
