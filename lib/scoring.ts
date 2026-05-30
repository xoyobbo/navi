import type { Product } from "@/types/product";

export const calcTrustLevel = (
  rating: number,
  reviewCount: number
): "high" | "medium" | "low" => {
  // ステマ疑惑（評価高すぎ×大量レビュー）
  if (rating >= 4.9 && reviewCount > 500) {
    return "low";
  }
  // 高信頼：評価4.0以上×レビュー100件以上
  if (rating >= 4.0 && reviewCount >= 100) {
    return "high";
  }
  // 低信頼：評価3.5未満またはレビュー10件未満
  if (rating < 3.5 || reviewCount < 10) {
    return "low";
  }
  return "medium";
};

function calcPriceScore(price: number, prices: number[]): number {
  if (prices.length === 0) return 15;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max === min) return 15;
  return Math.round(((max - price) / (max - min)) * 30);
}

function calcReviewScore(rating: number): number {
  return Math.round(Math.min(rating * 8, 40));
}

function calcPopularityScore(reviewCount: number): number {
  if (reviewCount >= 10000) return 30;
  if (reviewCount >= 5000)  return 26;
  if (reviewCount >= 1000)  return 22;
  if (reviewCount >= 500)   return 18;
  if (reviewCount >= 100)   return 13;
  if (reviewCount >= 50)    return 9;
  if (reviewCount >= 10)    return 5;
  return 2;
}

function getScoreReason(total: number): string {
  if (total >= 90) return "レビュー数・評価ともに最高水準";
  if (total >= 80) return "コスパが非常に優れています";
  if (total >= 70) return "評価が高く安心して購入できます";
  return "価格重視ならこちらもおすすめ";
}

export function scoreProduct(
  product: Product,
  conditions: { minPrice: number | null; maxPrice: number | null; keyword: string }
): number {
  let score = 0;

  // ① レビュースコア（最大40点）
  const ratingScore = Math.min(product.rating / 5, 1) * 25;
  const reviewScore = Math.min(Math.log10(product.reviewCount + 1) / 4, 1) * 15;
  score += ratingScore + reviewScore;

  // ② 価格スコア（最大30点）
  if (conditions.maxPrice) {
    const ratio = product.price / conditions.maxPrice;
    if (ratio >= 0.7 && ratio <= 1.0) score += 30;
    else if (ratio >= 0.5) score += 20;
    else if (ratio >= 0.3) score += 10;
  } else {
    score += 15;
  }

  // ③ キーワード一致スコア（最大30点）
  const name = product.name.toLowerCase();
  const keywords = conditions.keyword.toLowerCase().split(/\s+/).filter(Boolean);
  if (keywords.length > 0) {
    const matchCount = keywords.filter((kw) => name.includes(kw)).length;
    score += (matchCount / keywords.length) * 30;
  } else {
    score += 15;
  }

  return score;
}

export function scoreProducts(products: Product[]): Product[] {
  const prices = products.map((p) => p.price);
  return products.map((p) => {
    const priceScore = calcPriceScore(p.price, prices);
    const reviewScore = calcReviewScore(p.rating);
    const popularityScore = calcPopularityScore(p.reviewCount);
    const total = Math.min(priceScore + reviewScore + popularityScore, 100);
    return {
      ...p,
      score: total,
      scoreDetails: { price: priceScore, review: reviewScore, popularity: popularityScore },
      scoreReason: getScoreReason(total),
    };
  });
}
