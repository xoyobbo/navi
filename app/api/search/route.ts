import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/search";
import type { SortOrder } from "@/types/product";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "クエリパラメータ q が必要です" }, { status: 400 });
  }

  const sort = (searchParams.get("sort") ?? "price_asc") as SortOrder;
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("perPage") ?? 20);

  const result = await searchProducts({ query, sort, page, perPage });
  return NextResponse.json(result);
}
