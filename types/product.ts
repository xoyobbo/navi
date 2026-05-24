export type ProductSource = "rakuten" | "yahoo" | "amazon";

export type Product = {
  id: string;
  source: ProductSource;
  name: string;
  price: number;
  image: string;
  affiliateUrl: string;
  rating: number;
  reviewCount: number;
  features: string[];
  category: string;
  availability: boolean;
};

export type SortOrder = "price_asc" | "price_desc" | "rating_desc";

export type SearchParams = {
  query: string;
  sort?: SortOrder;
  page?: number;
  perPage?: number;
};

export type SearchResult = {
  products: Product[];
  totalCount: number;
  sources: ProductSource[];
};
