import { NextRequest, NextResponse } from "next/server";
import { searchMixed } from "@/lib/api/mix";
import { getPreferredSources } from "@/lib/preferences";
import type { Product, SortOrder } from "@/types/product";

function sortProducts(products: Product[], sort: SortOrder): Product[] {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "price_asc":  return a.price - b.price;
      case "price_desc": return b.price - a.price;
      case "rating_desc": {
        const scoreA = a.rating * Math.log10(a.reviewCount + 10);
        const scoreB = b.rating * Math.log10(b.reviewCount + 10);
        return scoreB - scoreA;
      }
      default: return 0;
    }
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "クエリパラメータ q が必要です" }, { status: 400 });
  }

  const sortParam = searchParams.get("sort");
  const sort = (["price_asc", "price_desc", "rating_desc"].includes(sortParam ?? "")
    ? sortParam
    : null) as SortOrder | null;
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;

  // ユーザーのショッピングサイト設定をサーバー側で直接取得（自己HTTP fetchは廃止）
  const preferredSources = await getPreferredSources();
  console.log("検索のpreferredSources:", preferredSources);

  const products = await searchMixed(
    { keyword: query, minPrice, maxPrice },
    30,
    preferredSources
  );

  const sorted = sort ? sortProducts(products, sort) : products;

  return NextResponse.json({
    products: sorted,
    total: sorted.length,
    totalPages: 1,
    sources: preferredSources,
  });
}
