import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedKeyword {
  keyword: string;
  minPrice: number | null;
  maxPrice: number | null;
}

export async function extractSearchKeyword(
  message: string,
  anthropic: Anthropic
): Promise<ExtractedKeyword> {
  const simpleClean = message
    .replace(/[？?。、！!]/g, "")
    .replace(/\d+万円(以内|以上|くらい|程度)?/g, "")
    .replace(/(おすすめ|人気|安い|高い)(の|は|な)?/g, "")
    .replace(/(が|は|を|に)(欲しい|探している|ください|教えて)/g, "")
    .trim();

  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content:
            `「${message}」から商品検索キーワードと価格条件を抽出してJSONのみ返してください。\n` +
            `keywordは楽天で検索できるシンプルな商品名（10文字以内）。\n` +
            `{"keyword":"イヤホン","minPrice":20000,"maxPrice":30000}`,
        },
      ],
    });

    const text = res.content[0].type === "text" ? res.content[0].text : "";
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        keyword: parsed.keyword || simpleClean || message,
        minPrice: parsed.minPrice ?? null,
        maxPrice: parsed.maxPrice ?? null,
      };
    }
  } catch (e) {
    console.error("[extract-keyword] エラー:", e);
  }

  return { keyword: simpleClean || message, minPrice: null, maxPrice: null };
}
