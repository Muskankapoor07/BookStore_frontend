import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of } from 'rxjs';
import { Book } from '../models/book.model';
import { AuthService } from './auth.service';

export interface WishlistItem {
  id?: number;
  book: Book;
}

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private readonly apiUrl = 'http://localhost:8080/bookstore_user';

  private wishlistItemsSubject = new BehaviorSubject<WishlistItem[]>([]);
  public wishlistItems$: Observable<WishlistItem[]> = this.wishlistItemsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.fetchWishlist();
      } else {
        this.wishlistItemsSubject.next([]);
      }
    });
  }

  fetchWishlist(): void {
    if (!this.authService.isLoggedIn()) return;

    this.http.get<any[]>(`${this.apiUrl}/get_wishlist_items`).pipe(
      catchError(() => of([]))
    ).subscribe((res) => {
      if (Array.isArray(res)) {
        const items: WishlistItem[] = res.map((item) => ({
          id: item.id,
          book: {
            id: item.productId || item.product?.id || item.id,
            title: item.productName || item.product?.name || item.product?.title || 'Book Item',
            author: item.product?.author || 'Author',
            rating: item.product?.rating ?? 4.5,
            ratingCount: item.product?.ratingCount ?? 10,
            discountPrice: item.discountPrice ?? item.product?.discountPrice ?? item.price ?? 0,
            originalPrice: item.price ?? item.product?.price ?? 0,
            coverImage: item.product?.imageUrl || 'assets/images/dont-make-me-think.svg',
            isOutOfStock: false,
          },
        }));

        this.wishlistItemsSubject.next(items);

        // Enrich book details
        items.forEach((wi) => {
          this.http.get<any>(`${this.apiUrl}/get/book/${wi.book.id}`).pipe(
            catchError(() => of(null))
          ).subscribe((product) => {
            if (product) {
              wi.book.title = product.name || product.title || wi.book.title;
              wi.book.author = product.author || wi.book.author;
              wi.book.rating = product.rating ?? wi.book.rating;
              wi.book.ratingCount = product.ratingCount ?? wi.book.ratingCount;
              wi.book.discountPrice = product.discountPrice ?? product.price ?? wi.book.discountPrice;
              wi.book.originalPrice = product.price ?? wi.book.originalPrice;
              wi.book.coverImage = product.imageUrl || wi.book.coverImage;
              wi.book.quantity = product.quantity ?? wi.book.quantity;
              wi.book.isOutOfStock = product.quantity !== undefined ? product.quantity <= 0 : wi.book.isOutOfStock;
              this.wishlistItemsSubject.next([...this.wishlistItemsSubject.value]);
            }
          });
        });
      }
    });
  }

  addToWishlist(book: Book): Observable<any> {
    const current = [...this.wishlistItemsSubject.value];
    if (!current.some((i) => String(i.book.id) === String(book.id))) {
      current.push({ book });
      this.wishlistItemsSubject.next(current);
    }

    if (this.authService.isLoggedIn()) {
      return this.http.post(`${this.apiUrl}/add_wish_list/${book.id}`, {}).pipe(
        catchError((err) => {
          console.warn('Backend wishlist add failed:', err);
          return of(null);
        })
      );
    }
    return of(null);
  }

  removeFromWishlist(bookId: number | string): Observable<any> {
    const updated = this.wishlistItemsSubject.value.filter(
      (i) => String(i.book.id) !== String(bookId)
    );
    this.wishlistItemsSubject.next(updated);

    if (this.authService.isLoggedIn()) {
      return this.http.delete(`${this.apiUrl}/remove_wishlist_item/${bookId}`, { responseType: 'text' as 'json' }).pipe(
        catchError((err) => {
          console.warn('Backend wishlist remove failed:', err);
          return of(null);
        })
      );
    }
    return of(null);
  }

  isInWishlist(bookId: number | string): boolean {
    return this.wishlistItemsSubject.value.some(
      (i) => String(i.book.id) === String(bookId)
    );
  }
}
