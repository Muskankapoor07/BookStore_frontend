import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of } from 'rxjs';
import { Book } from '../models/book.model';
import { AuthService } from './auth.service';

export interface CartItem {
  book: Book;
  quantity: number;
  cartItemId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly apiUrl = 'http://localhost:8080/bookstore_user';

  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  public cartItems$: Observable<CartItem[]> = this.cartItemsSubject.asObservable();

  private cartCountSubject = new BehaviorSubject<number>(0);
  public cartCount$: Observable<number> = this.cartCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.fetchBackendCart();
      }
    });
  }

  fetchBackendCart(): void {
    if (!this.authService.isLoggedIn()) return;

    this.http.get<any[]>(`${this.apiUrl}/get_cart_items`).pipe(
      catchError(() => of([]))
    ).subscribe((res) => {
      if (Array.isArray(res) && res.length > 0) {
        const items: CartItem[] = res.map((item) => ({
          cartItemId: item.cartItemId || item.id,
          quantity: item.quantity || 1,
          book: {
            id: item.product?.id || item.productId || 1,
            title: item.product?.name || item.product?.title || 'Book Item',
            author: item.product?.author || 'Author',
            rating: item.product?.rating ?? 0,
            ratingCount: item.product?.ratingCount ?? 0,
            discountPrice: item.product?.discountPrice ?? item.product?.price ?? 0,
            originalPrice: item.product?.price ?? 0,
            coverImage: item.product?.imageUrl || 'assets/images/dont-make-me-think.svg',
            isOutOfStock: false,
          },
        }));
        this.cartItemsSubject.next(items);
        this.updateTotalCount(items);
      }
    });
  }

  addToCart(book: Book): void {
    const currentItems = [...this.cartItemsSubject.value];
    const existingIndex = currentItems.findIndex((item) => item.book.id === book.id);

    if (existingIndex > -1) {
      currentItems[existingIndex].quantity += 1;
    } else {
      currentItems.push({ book, quantity: 1 });
    }

    this.cartItemsSubject.next(currentItems);
    this.updateTotalCount(currentItems);

    // Sync with Spring Boot backend if logged in
    if (this.authService.isLoggedIn()) {
      this.http.post(`${this.apiUrl}/add_cart_item/${book.id}`, {}).pipe(
        catchError((err) => {
          console.warn('Backend cart sync failed:', err.message);
          return of(null);
        })
      ).subscribe();
    }
  }

  removeFromCart(bookId: number | string): void {
    const currentItems = this.cartItemsSubject.value.filter(
      (item) => item.book.id !== bookId
    );
    this.cartItemsSubject.next(currentItems);
    this.updateTotalCount(currentItems);
  }

  private updateTotalCount(items: CartItem[]): void {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    this.cartCountSubject.next(count);
  }

  getCartCount(): number {
    return this.cartCountSubject.value;
  }
}
