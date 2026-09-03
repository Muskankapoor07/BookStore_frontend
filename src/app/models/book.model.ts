export interface Book {
  id: number | string;
  title: string;
  author: string;
  rating: number;
  ratingCount: number;
  discountPrice: number;
  originalPrice: number;
  coverImage?: string;
  isOutOfStock?: boolean;
  quantity?: number;
}

export interface BookResponse {
  books: Book[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
}
