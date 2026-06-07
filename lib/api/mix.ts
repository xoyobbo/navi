import type { Product } from "@/types/product";
import { searchRakuten } from "./rakuten";
import { searchYahoo } from "./yahoo";
import { filterByAllKeywords } from "@/lib/search-utils";

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
    const firstSource = preferredSources[0]
    const hasRakuten = preferredSources.includes("rakuten")
    const hasYahoo = preferredSources.includes("yahoo")

    const rakutenHits = (() => {
      if (!hasRakuten) return 0
      return Math.floor(total * (firstSource === "rakuten" ? 0.8 : 0.3))
    })()

    const yahooHits = (() => {
      if (!hasYahoo) return 0
      return Math.floor(total * (firstSource === "yahoo" ? 0.8 : 0.3))
    })()

    console.log(`楽天:${rakutenHits}件`, `Yahoo:${yahooHits}件`)

    const tasks: Promise<{ source: string; products: Product[] }>[] = []

    if (rakutenHits > 0) {
      tasks.push(
        searchRakuten({ ...params, hits: rakutenHits })
          .then((products) => ({ source: "rakuten", products }))
      )
    }
    if (yahooHits > 0) {
      tasks.push(
        searchYahoo({ ...params, hits: yahooHits })
          .then((products) => ({ source: "yahoo", products }))
      )
    }

    // 両方0になる場合はデフォルトにフォールバック
    if (tasks.length === 0) {
      tasks.push(
        searchRakuten({ ...params, hits: Math.floor(total * 0.8) })
          .then((products) => ({ source: "rakuten", products }))
      )
      tasks.push(
        searchYahoo({ ...params, hits: Math.floor(total * 0.3) })
          .then((products) => ({ source: "yahoo", products }))
      )
    }

    const results = await Promise.allSettled(tasks)

    // 優先ソースを先頭に配置してから結合
    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<{ source: string; products: Product[] }> =>
        r.status === "fulfilled"
      )
      .map((r) => r.value)
      .sort((a, b) => {
        if (a.source === firstSource) return -1
        if (b.source === firstSource) return 1
        return 0
      })

    const allProducts = fulfilled.flatMap((r) => r.products);


    console.log("searchMixed:", allProducts.length, "件", "preferredSources:", preferredSources)

    if (allProducts.length === 0) {
      console.error("全APIが失敗しました")
      return []
    }

    const deduped = deduplicateProducts(allProducts);

    // 複数キーワードのANDフィルタ
    const andFiltered = filterByAllKeywords(deduped, params.keyword);
    if (andFiltered.length < 5 && deduped.length > 0) {
      console.log(`[mix] AND補完: ${andFiltered.length}件 → 全${deduped.length}件`);
      const others = deduped.filter((p) => !andFiltered.find((f) => f.id === p.id));
      return [...andFiltered, ...others].slice(0, total);
    }
    return andFiltered.length > 0 ? andFiltered : deduped;
  } catch (e) {
    console.error("searchMixedエラー:", e)
    return []
  }
}
