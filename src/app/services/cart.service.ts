import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Book } from '../models/book.model';

export interface CartItem {
  book: Book;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  public cartItems$: Observable<CartItem[]> = this.cartItemsSubject.asObservable();

  private cartCountSubject = new BehaviorSubject<number>(0);
  public cartCount$: Observable<number> = this.cartCountSubject.asObservable();

  constructor() {}

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
