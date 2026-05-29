export const validateKeyword = (
  keyword: string
): {
  isValid: boolean;
  cleaned: string;
  error?: string;
} => {
  if (!keyword || !keyword.trim()) {
    return { isValid: false, cleaned: "", error: "キーワードが空です" };
  }

  if (keyword.length > 100) {
    return { isValid: false, cleaned: "", error: "キーワードが長すぎます" };
  }

  const dangerous = /<script|javascript:|on\w+=/i;
  if (dangerous.test(keyword)) {
    return { isValid: false, cleaned: "", error: "不正な文字が含まれています" };
  }

  const cleaned = keyword.trim().slice(0, 50);
  return { isValid: true, cleaned };
};

export const validatePrice = (
  price: number | null | undefined
): number | null => {
  if (price === null || price === undefined) return null;
  if (isNaN(price) || price < 0) return null;
  if (price > 10000000) return 10000000;
  return Math.floor(price);
};
