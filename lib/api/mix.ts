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
  const [rakuten, yahoo] = await Promise.all([
    searchRakuten({ ...params, hits: 30 }),
    searchYahoo({ ...params, hits: 15 }),
  ]);

  const mixed: Product[] = [];
  let ri = 0;
  let yi = 0;

  while (mixed.length < total && (ri < rakuten.length || yi < yahoo.length)) {
    for (let i = 0; i < 2; i++) {
      if (ri < rakuten.length && mixed.length < total) mixed.push(rakuten[ri++]);
    }
    if (yi < yahoo.length && mixed.length < total) mixed.push(yahoo[yi++]);
  }

  return deduplicateProducts(mixed);
}
