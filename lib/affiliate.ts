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

// キーワード検索結果へのアフィリエイトリンク
export const buildAmazonSearchUrl = (keyword: string): string => {
  const id = getAssociateId();
  if (!id) return "";
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${id}`;
};

// 任意の Amazon URL にアフィリエイトタグを付与
export const addAmazonAffiliateTag = (url: string): string => {
  const id = getAssociateId();
  if (!id || !url.includes("amazon.co.jp")) return url;
  const u = new URL(url);
  u.searchParams.set("tag", id);
  return u.toString();
};
