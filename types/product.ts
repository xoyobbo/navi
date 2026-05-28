export type ProductSource = "rakuten" | "yahoo" | "amazon";

export type ScoreDetails = {
  price: number;
  review: number;
  popularity: number;
};

export type Product = {
  id: string;
  source: ProductSource;
  name: string;
  price: number;
  image: string;
  images?: string[];
  affiliateUrl: string;
  rating: number;
  reviewCount: number;
  features: string[];
  category: string;
  availability: boolean;
  score?: number;
  scoreDetails?: ScoreDetails;
  scoreReason?: string;
  reason?: string;
  purchaseLinks?: {
    rakuten?: string;
    yahoo?: string;
    amazon?: string;
  };
};

export type SortOrder = "price_asc" | "price_desc" | "rating_desc";

export type SearchParams = {
  query: string;
  sort?: SortOrder;
  page?: number;
  perPage?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
};

export type SearchResult = {
  products: Product[];
  totalCount: number;
  sources: ProductSource[];
};
