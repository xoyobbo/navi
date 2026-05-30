import type { Product } from "@/types/product";
import { searchRakuten } from "./rakuten";
import { searchYahoo } from "./yahoo";

interface MixSearchParams {
  keyword: string;
  minPrice?: number | null;
  maxPrice?: number | null;
}

export function deduplicateProducts(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    if (p.name.includes("ふるさと納税")) return false;
    // 口コミも評価も全くない商品は信頼度ゼロなので除外
    if (p.reviewCount === 0 && p.rating === 0) return false;
    const nameKey = p.name.slice(0, 20).toLowerCase().replace(/\s/g, "");
    const key = `${nameKey}_${p.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchMixed(
  params: MixSearchParams,
  total = 30,
  preferredSources = ["rakuten", "yahoo"]
): Promise<Product[]> {
  try {
    // 優先順位に基づいて取得件数の比率を決定
    const rakutenRatio =
      preferredSources[0] === "rakuten"
        ? 0.8
        : preferredSources.includes("rakuten")
        ? 0.3
        : 0;

    const yahooRatio =
      preferredSources[0] === "yahoo"
        ? 0.8
        : preferredSources.includes("yahoo")
        ? 0.3
        : 0;

    const rakutenHits = Math.floor(total * rakutenRatio) || 0;
    const yahooHits = Math.floor(total * yahooRatio) || 0;

    const fetchTasks: Promise<Product[]>[] = [];

    if (rakutenHits > 0) {
      fetchTasks.push(searchRakuten({ ...params, hits: rakutenHits }));
    }
    if (yahooHits > 0) {
      fetchTasks.push(searchYahoo({ ...params, hits: yahooHits }));
    }

    // 両方0になる場合はデフォルトにフォールバック
    if (fetchTasks.length === 0) {
      fetchTasks.push(searchRakuten({ ...params, hits: Math.floor(total * 0.8) }));
      fetchTasks.push(searchYahoo({ ...params, hits: Math.floor(total * 0.3) }));
    }

    const results = await Promise.allSettled(fetchTasks);

    const allProducts = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    console.log("searchMixed:", allProducts.length, "件", "preferredSources:", preferredSources);

    if (allProducts.length === 0) {
      console.error("全APIが失敗しました");
      return [];
    }

    return deduplicateProducts(allProducts);
  } catch (e) {
    console.error("searchMixedエラー:", e);
    return [];
  }
}
