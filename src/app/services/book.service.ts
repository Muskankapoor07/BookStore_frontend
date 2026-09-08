import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Book, FeedbackItem } from '../models/book.model';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  private readonly baseUrl = 'http://localhost:8080/bookstore_user';

  constructor(private http: HttpClient) {}

  /**
   * Fetch books exclusively from backend Spring Boot Database API
   */
  getBooks(
    searchQuery?: string,
    sortBy?: string,
    page: number = 0,
    size: number = 20
  ): Observable<Book[]> {
    let sortParam = 'id,asc';
    if (sortBy === 'low-to-high') {
      sortParam = 'discountPrice,asc';
    } else if (sortBy === 'high-to-low') {
      sortParam = 'discountPrice,desc';
    } else if (sortBy === 'newest') {
      sortParam = 'id,desc';
    } else if (sortBy === 'rating') {
      sortParam = 'id,desc';
    }

    let url = `${this.baseUrl}/get/book`;
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sortParam);

    if (searchQuery && searchQuery.trim()) {
      url = `${this.baseUrl}/search/book`;
      params = params.set('keyword', searchQuery.trim());
    }

    return this.http.get<any>(url, { params }).pipe(
      map((response) => {
        let rawList: any[] = [];
        if (response && Array.isArray(response.content)) {
          rawList = response.content;
        } else if (Array.isArray(response)) {
          rawList = response;
        }

        return rawList.map((item, index) => this.mapProductToBook(item, index));
      }),
      catchError((error) => {
        console.error('Error loading books from backend database:', error.message);
        return of([]); // Strictly return empty list if backend returns error or has 0 books
      })
    );
  }

  /**
   * Fetch single book by ID from backend database
   */
  getBookById(id: number | string): Observable<Book | undefined> {
    return this.http.get<any>(`${this.baseUrl}/get/book/${id}`).pipe(
      map((item) => (item ? this.mapProductToBook(item, 0) : undefined)),
      catchError(() => of(undefined))
    );
  }

  /**
   * Fetch customer feedback/reviews for a product from backend database
   */
  getFeedback(productId: number | string): Observable<FeedbackItem[]> {
    return this.http.get<any[]>(`${this.baseUrl}/get/feedback/${productId}`).pipe(
      map((list) =>
        (list || []).map((fb) => ({
          id: fb.id,
          productId: fb.productId,
          userEmail: fb.userEmail,
          userName: fb.userEmail ? fb.userEmail.split('@')[0] : 'Anonymous',
          rating: fb.rating ?? 5,
          comment: fb.comment || '',
        }))
      ),
      catchError(() => of([]))
    );
  }

  /**
   * Post customer feedback/review for a product to backend database
   */
  addFeedback(
    productId: number | string,
    rating: number,
    comment: string
  ): Observable<FeedbackItem> {
    return this.http.post<FeedbackItem>(
      `${this.baseUrl}/add/feedback/${productId}`,
      { rating, comment }
    );
  }

  private mapProductToBook(product: any, index: number = 0): Book {
    const defaultImages = [
      'assets/images/dont-make-me-think.svg',
      'assets/images/everyday-things.svg',
      'assets/images/the-alchemist.svg',
      'assets/images/lean-ux.svg',
      'assets/images/react-mui.svg',
      'assets/images/ux-design-guide.svg',
      'assets/images/ux-dummies.svg',
      'assets/images/group-discussion.svg',
      'assets/images/sharepoint.svg',
    ];

    const fallbackImg = defaultImages[index % defaultImages.length];
    const isOutOfStock =
      product.stockStatus === 'OUT_OF_STOCK' ||
      (product.quantity !== undefined && product.quantity <= 0);

    return {
      id: product.id,
      title: product.name || product.title || 'Untitled Book',
      author: product.author || 'Unknown Author',
      rating: product.rating ?? 4.5,
      ratingCount: product.ratingCount ?? 20,
      discountPrice: product.discountPrice ?? product.price ?? 0,
      originalPrice: product.price ?? product.discountPrice ?? 0,
      coverImage: product.imageUrl || fallbackImg,
      isOutOfStock: isOutOfStock,
      quantity: product.quantity ?? 0,
      description:
        product.description ||
        'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut',
    };
  }
}

