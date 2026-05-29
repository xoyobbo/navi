// NEXT_PUBLIC_ prefix でクライアント・サーバー両対応
const getAssociateId = () =>
  process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_ID ??
  process.env.AMAZON_ASSOCIATE_ID ?? "";

// 個別商品（ASIN）へのアフィリエイトリンク
export const buildAmazonAffiliateUrl = (asin: string): string => {
  const id = getAssociateId();
  if (!id) return "";
  return `https://www.amazon.co.jp/dp/${asin}?tag=${id}`;
};

// キーワードをそのまま使う同期版（フォールバック用）
export const buildAmazonSearchUrlSync = (keyword: string): string => {
  const id = getAssociateId();
  if (!id) return "";
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${id}`;
};

// Claude API でキーワード最適化して検索URL生成（非同期）
export const buildAmazonSearchUrl = async (productName: string): Promise<string> => {
  const id = getAssociateId();
  if (!id) return "";

  try {
    const res = await fetch("/api/extract-keyword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName }),
    });
    const data = await res.json();
    const keyword = data.keyword || fallbackKeyword(productName);
    return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${id}`;
  } catch {
    return `https://www.amazon.co.jp/s?k=${encodeURIComponent(fallbackKeyword(productName))}&tag=${id}`;
  }
};

const fallbackKeyword = (name: string): string =>
  name
    .replace(/[【】「」『』★☆◆◇■□●○▲△▼▽♪♦]/g, "")
    .replace(/\d+%OFF/gi, "")
    .replace(/\d+円引き/g, "")
    .replace(/送料無料/g, "")
    .replace(/ポイント\d+倍/g, "")
    .replace(/(最新|新品|正規品|国内正規|保証付き)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);

// 任意の Amazon URL にアフィリエイトタグを付与
export const addAmazonAffiliateTag = (url: string): string => {
  const id = getAssociateId();
  if (!id || !url.includes("amazon.co.jp")) return url;
  const u = new URL(url);
  u.searchParams.set("tag", id);
  return u.toString();
};
