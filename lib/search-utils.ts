export function normalizeKeyword(keyword: string): string {
  return keyword
    .trim()
    .replace(/　/g, " ")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    );
}
