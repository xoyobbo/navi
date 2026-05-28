import type { Product } from "@/types/product";

export const KNOWN_BRANDS = [
  "Sony", "Bose", "Apple", "Samsung", "Panasonic", "Sharp",
  "Dyson", "Anker", "JBL", "YAMAHA", "Canon", "Nikon",
  "Nike", "Adidas", "Uniqlo", "無印良品", "Victor", "Shure",
  "Sennheiser", "Audio-Technica", "DENON", "Pioneer",
];

export function extractBrands(products: Product[]): string[] {
  const counts: Record<string, number> = {};
  products.forEach((p) => {
    KNOWN_BRANDS.forEach((brand) => {
      if (p.name.toLowerCase().includes(brand.toLowerCase())) {
        counts[brand] = (counts[brand] ?? 0) + 1;
      }
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([brand]) => brand);
}
