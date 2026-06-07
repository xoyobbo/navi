import Anthropic from "@anthropic-ai/sdk";
import { withCache, cacheKey } from "@/lib/cache";

const anthropic = new Anthropic();

const fallbackKeyword = (name: string) =>
  name
    .replace(/[【】「」『』★☆◆◇■□●○▲△▼▽♪♦]/g, "")
    .replace(/\d+%OFF/gi, "")
    .replace(/\d+円引き/g, "")
    .replace(/送料無料/g, "")
    .replace(/ポイント\d+倍/g, "")
    .replace(/(最新|新品|正規品|国内正規|保証付き)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);

export async function POST(request: Request) {
  try {
    const { productName } = await request.json();
    if (!productName) return Response.json({ keyword: "" });

    // 同じ商品名なら抽出結果は同一なので7日間キャッシュ。
    const keyword = await withCache(
      cacheKey("extract-kw", productName),
      async () => {
        const res = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 60,
          messages: [{
            role: "user",
            content:
              `以下の商品名からAmazonで検索するための最適なキーワードを抽出してください。\n\n` +
              `商品名：「${productName}」\n\n` +
              `ルール：\n` +
              `・ブランド名＋商品名のみ\n` +
              `・型番がある場合は含める\n` +
              `・装飾文字・セール情報は除去\n` +
              `・20文字以内\n` +
              `・キーワードのみ返す\n\n` +
              `例：\n` +
              `「【2024最新】SONY ワイヤレスイヤホン WF-1000XM5 ★86%OFF★」→「SONY WF-1000XM5 ワイヤレスイヤホン」\n` +
              `「Anker PowerCore 10000 モバイルバッテリー【PSE認証済み】」→「Anker PowerCore 10000」`,
          }],
        });
        return res.content[0].type === "text"
          ? res.content[0].text.trim()
          : fallbackKeyword(productName);
      },
      60 * 60 * 24 * 7,
      (k) => k.length > 0
    );

    return Response.json({ keyword });
  } catch (e) {
    console.error("[extract-keyword]", e);
    const { productName } = await request.clone().json().catch(() => ({ productName: "" }));
    return Response.json({ keyword: fallbackKeyword(productName ?? "") });
  }
}
