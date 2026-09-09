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
      if (Array.isArray(res)) {
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
            isOutOfStock: item.product?.quantity !== undefined ? item.product.quantity <= 0 : false,
            quantity: item.product?.quantity ?? 0,
          },
        }));
        this.cartItemsSubject.next(items);
        this.updateTotalCount(items);
      }
    });
  }

  getCartItemQuantity(bookId: number | string): number {
    const item = this.cartItemsSubject.value.find((i) => i.book.id === bookId || String(i.book.id) === String(bookId));
    return item ? item.quantity : 0;
  }

  getCartItem(bookId: number | string): CartItem | undefined {
    return this.cartItemsSubject.value.find((i) => i.book.id === bookId || String(i.book.id) === String(bookId));
  }

  addToCart(book: Book): void {
    this.incrementQuantity(book);
  }

  incrementQuantity(book: Book): void {
    const currentItems = [...this.cartItemsSubject.value];
    const existingIndex = currentItems.findIndex(
      (item) => item.book.id === book.id || String(item.book.id) === String(book.id)
    );

    if (existingIndex > -1) {
      currentItems[existingIndex].quantity += 1;
      const cartItemId = currentItems[existingIndex].cartItemId;
      this.cartItemsSubject.next(currentItems);
      this.updateTotalCount(currentItems);

      if (this.authService.isLoggedIn()) {
        if (cartItemId) {
          this.http.put(`${this.apiUrl}/cart_item_quantity/${cartItemId}?quantity=${currentItems[existingIndex].quantity}`, {}).pipe(
            catchError((err) => {
              console.warn('Backend cart update quantity failed:', err.message);
              return of(null);
            })
          ).subscribe();
        } else {
          this.http.post(`${this.apiUrl}/add_cart_item/${book.id}`, {}).pipe(
            catchError((err) => {
              console.warn('Backend cart sync failed:', err.message);
              return of(null);
            })
          ).subscribe(() => this.fetchBackendCart());
        }
      }
    } else {
      currentItems.push({ book, quantity: 1 });
      this.cartItemsSubject.next(currentItems);
      this.updateTotalCount(currentItems);

      if (this.authService.isLoggedIn()) {
        this.http.post(`${this.apiUrl}/add_cart_item/${book.id}`, {}).pipe(
          catchError((err) => {
            console.warn('Backend cart sync failed:', err.message);
            return of(null);
          })
        ).subscribe(() => this.fetchBackendCart());
      }
    }
  }

  decrementQuantity(bookId: number | string): void {
    const currentItems = [...this.cartItemsSubject.value];
    const existingIndex = currentItems.findIndex(
      (item) => item.book.id === bookId || String(item.book.id) === String(bookId)
    );

    if (existingIndex > -1) {
      const item = currentItems[existingIndex];
      if (item.quantity > 1) {
        item.quantity -= 1;
        this.cartItemsSubject.next(currentItems);
        this.updateTotalCount(currentItems);

        if (this.authService.isLoggedIn()) {
          if (item.cartItemId) {
            this.http.put(`${this.apiUrl}/cart_item_quantity/${item.cartItemId}?quantity=${item.quantity}`, {}).pipe(
              catchError((err) => {
                console.warn('Backend cart update failed:', err.message);
                return of(null);
              })
            ).subscribe();
          } else {
            this.fetchBackendCart();
          }
        }
      } else {
        this.removeFromCart(bookId);
      }
    }
  }

  removeFromCart(bookId: number | string): void {
    const item = this.getCartItem(bookId);
    const cartItemId = item?.cartItemId;

    const currentItems = this.cartItemsSubject.value.filter(
      (i) => i.book.id !== bookId && String(i.book.id) !== String(bookId)
    );
    this.cartItemsSubject.next(currentItems);
    this.updateTotalCount(currentItems);

    if (this.authService.isLoggedIn() && cartItemId) {
      this.http.delete(`${this.apiUrl}/remove_cart_item/${cartItemId}`, { responseType: 'text' as 'json' }).pipe(
        catchError((err) => {
          console.warn('Backend cart remove failed:', err.message);
          return of(null);
        })
      ).subscribe();
    }
  }

  private updateTotalCount(items: CartItem[]): void {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    this.cartCountSubject.next(count);
  }

  getCartCount(): number {
    return this.cartCountSubject.value;
  }
}

