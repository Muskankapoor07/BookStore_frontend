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
  description?: string;
}

export interface FeedbackItem {
  id?: number;
  productId?: number;
  userEmail?: string;
  userName?: string;
  rating: number;
  comment: string;
}

export interface BookResponse {
  books: Book[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

