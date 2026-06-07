import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { searchRakuten } from "@/lib/api/rakuten";
import { withCache, cacheKey } from "@/lib/cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productName = searchParams.get("name") ?? "";
  const productPrice = Number(searchParams.get("price") ?? 0);

  if (!productName) {
    return Response.json({ products: [], keyword: "" });
  }

  let keyword = productName.split(/[\s　]/)[0].slice(0, 20);

  try {
    // 同じ商品名ならキーワード抽出結果は同一なので7日間キャッシュ。
    const extracted = await withCache(
      cacheKey("similar-kw", productName),
      async () => {
        const keywordRes = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content:
                `「${productName}」という商品名から、楽天で似た商品を検索するためのシンプルなキーワードを1つだけ答えてください。` +
                `（例：「SONYワイヤレスイヤホン」→「ワイヤレスイヤホン」）キーワードだけ返してください。`,
            },
          ],
        });
        return keywordRes.content[0].type === "text"
          ? keywordRes.content[0].text.trim().slice(0, 20)
          : "";
      },
      60 * 60 * 24 * 7,
      (k) => k.length > 0
    );
    if (extracted) keyword = extracted;
  } catch (e) {
    console.error("[similar] keyword extraction failed:", e);
  }

  const minPrice = productPrice ? Math.floor(productPrice * 0.5) : null;
  const maxPrice = productPrice ? Math.ceil(productPrice * 1.5) : null;

  const products = await searchRakuten({
    keyword,
    minPrice,
    maxPrice,
    hits: 10,
  });

  const similar = products
    .filter((p) => !p.name.includes(productName.slice(0, 10)))
    .slice(0, 6);

  return Response.json({ products: similar, keyword });
}
