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
    const nameKey = p.name.slice(0, 20).toLowerCase().replace(/\s/g, "");
    const key = `${nameKey}_${p.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchMixed(params: MixSearchParams, total = 30): Promise<Product[]> {
  try {
    const [rakuten, yahoo] = await Promise.allSettled([
      searchRakuten({ ...params, hits: 30 }),
      searchYahoo({ ...params, hits: 15 }),
    ])

    const rakutenProducts = rakuten.status === "fulfilled" ? rakuten.value : []
    const yahooProducts   = yahoo.status  === "fulfilled" ? yahoo.value  : []

    console.log("楽天:", rakuten.status, rakutenProducts.length, "件")
    console.log("Yahoo!:", yahoo.status, yahooProducts.length, "件")

    if (rakutenProducts.length === 0 && yahooProducts.length === 0) {
      console.error("全APIが失敗しました")
      return []
    }

    const mixed: Product[] = []
    let ri = 0
    let yi = 0

    while (mixed.length < total && (ri < rakutenProducts.length || yi < yahooProducts.length)) {
      for (let i = 0; i < 2; i++) {
        if (ri < rakutenProducts.length && mixed.length < total) mixed.push(rakutenProducts[ri++])
      }
      if (yi < yahooProducts.length && mixed.length < total) mixed.push(yahooProducts[yi++])
    }

    return deduplicateProducts(mixed)
  } catch (e) {
    console.error("searchMixedエラー:", e)
    return []
  }
}
