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
      catchError((err) => {
        console.warn('Backend cart fetch failed:', err);
        return of([]);
      })
    ).subscribe((res) => {
      if (Array.isArray(res)) {
        const currentLocalMap = new Map(
          this.cartItemsSubject.value.map((i) => [String(i.book.id), i.book])
        );

        const defaultImages = [
          'assets/images/dont-make-me-think.svg',
          'assets/images/everyday-things.svg',
          'assets/images/the-alchemist.svg',
          'assets/images/lean-ux.svg',
          'assets/images/react-mui.svg',
          'assets/images/ux-design-guide.svg',
          'assets/images/ux-dummies.svg',
        ];

        const backendItems: CartItem[] = res.map((item, index) => {
          const bookId = item.productId || item.product?.id || item.id;
          const existingBook = currentLocalMap.get(String(bookId));
          const fallbackImg = defaultImages[index % defaultImages.length];

          const book: Book = {
            id: bookId,
            title: item.productName || item.product?.name || item.product?.title || existingBook?.title || 'Book Item',
            author: existingBook?.author || item.product?.author || 'Author',
            rating: existingBook?.rating ?? item.product?.rating ?? 4.5,
            ratingCount: existingBook?.ratingCount ?? item.product?.ratingCount ?? 10,
            discountPrice: item.discountPrice ?? item.product?.discountPrice ?? item.price ?? existingBook?.discountPrice ?? 0,
            originalPrice: item.price ?? item.product?.price ?? existingBook?.originalPrice ?? 0,
            coverImage: existingBook?.coverImage || item.product?.imageUrl || fallbackImg,
            isOutOfStock: existingBook?.isOutOfStock ?? (item.product?.quantity !== undefined ? item.product.quantity <= 0 : false),
            quantity: existingBook?.quantity ?? item.product?.quantity ?? 10,
          };

          return {
            cartItemId: item.id || item.cartItemId,
            quantity: item.quantity || 1,
            book: book,
          };
        });

        // Merge local items that weren't in backend yet
        currentLocalMap.forEach((localBook, bId) => {
          const alreadyInBackend = backendItems.some((bi) => String(bi.book.id) === String(bId));
          if (!alreadyInBackend) {
            const localQty = this.getCartItemQuantity(bId) || 1;
            backendItems.push({ book: localBook, quantity: localQty });
            this.http.post(`${this.apiUrl}/add_cart_item/${localBook.id}`, {}).pipe(
              catchError(() => of(null))
            ).subscribe();
          }
        });

        this.cartItemsSubject.next(backendItems);
        this.updateTotalCount(backendItems);

        // Enrich items with full book details from backend /get/book/{id}
        backendItems.forEach((ci) => {
          this.http.get<any>(`${this.apiUrl}/get/book/${ci.book.id}`).pipe(
            catchError(() => of(null))
          ).subscribe((product) => {
            if (product) {
              ci.book.title = product.name || product.title || ci.book.title;
              ci.book.author = product.author || ci.book.author;
              ci.book.rating = product.rating ?? ci.book.rating;
              ci.book.ratingCount = product.ratingCount ?? ci.book.ratingCount;
              ci.book.discountPrice = product.discountPrice ?? product.price ?? ci.book.discountPrice;
              ci.book.originalPrice = product.price ?? ci.book.originalPrice;
              ci.book.coverImage = product.imageUrl || ci.book.coverImage;
              ci.book.quantity = product.quantity ?? ci.book.quantity;
              ci.book.isOutOfStock = product.quantity !== undefined ? product.quantity <= 0 : ci.book.isOutOfStock;
              this.cartItemsSubject.next([...this.cartItemsSubject.value]);
            }
          });
        });
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

  clearCart(): void {
    this.cartItemsSubject.next([]);
    this.cartCountSubject.next(0);
  }

  updateCustomerDetails(details: { addressType: string; fullAddress: string; city: string; state: string; mobileNumber?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/edit_user`, details);
  }

  placeOrder(): Observable<any> {
    const currentItems = this.cartItemsSubject.value;
    const orderPayload = {
      orders: currentItems.map((item) => ({
        product_id: String(item.book.id),
        product_name: item.book.title,
        product_quantity: item.quantity,
        product_price: item.book.discountPrice !== undefined ? item.book.discountPrice : item.book.originalPrice,
      })),
    };

    if (this.authService.isLoggedIn()) {
      return this.http.post<any>(`${this.apiUrl}/add/order`, orderPayload);
    } else {
      return of({ id: Math.floor(100000 + Math.random() * 900000) });
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


