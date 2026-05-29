export const buildAmazonAffiliateUrl = (asin: string): string => {
  const associateId = process.env.AMAZON_ASSOCIATE_ID;
  if (!associateId) return "";
  return `https://www.amazon.co.jp/dp/${asin}?tag=${associateId}`;
};
