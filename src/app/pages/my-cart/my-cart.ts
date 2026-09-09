import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService, CartItem } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { NavbarComponent } from '../../components/navbar/navbar';

export interface AddressDetails {
  fullName: string;
  mobileNumber: string;
  address: string;
  city: string;
  state: string;
  type: string;
}

@Component({
  selector: 'app-my-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './my-cart.html',
  styleUrl: './my-cart.css',
})
export class MyCart implements OnInit {
  cartItems: CartItem[] = [];
  step: number = 1; // 1 = My Cart, 2 = Address Details, 3 = Order Summary, 4 = Order Success
  searchQuery: string = '';
  currentYear: number = new Date().getFullYear();

  selectedLocation: string = 'BridgeLabz Solutions LLP, No...';
  isOrderPlaced: boolean = false;
  isPlacingOrder: boolean = false;

  address: AddressDetails = {
    fullName: '',
    mobileNumber: '',
    address: '',
    city: '',
    state: '',
    type: 'Home',
  };

  constructor(
    private cartService: CartService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.address.fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }

    this.cartService.cartItems$.subscribe((items) => {
      this.cartItems = items || [];
      this.cdr.detectChanges();
    });

    if (this.authService.isLoggedIn()) {
      this.cartService.fetchBackendCart();
    }
  }

  increaseQuantity(item: CartItem): void {
    if (item.book.quantity !== undefined && item.book.quantity > 0 && item.quantity >= item.book.quantity) {
      this.notificationService.showError(`Only ${item.book.quantity} items available in stock!`, 2500);
      return;
    }
    this.cartService.incrementQuantity(item.book);
  }

  decreaseQuantity(item: CartItem): void {
    this.cartService.decrementQuantity(item.book.id);
  }

  removeItem(item: CartItem): void {
    this.cartService.removeFromCart(item.book.id);
    this.notificationService.showSuccess(`"${item.book.title}" removed from cart.`, 2000);
  }

  getTotalPrice(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.book.discountPrice * item.quantity), 0);
  }

  getOriginalTotalPrice(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.book.originalPrice * item.quantity), 0);
  }

  getTotalDiscount(): number {
    return this.getOriginalTotalPrice() - this.getTotalPrice();
  }

  goToAddressStep(): void {
    if (this.cartItems.length === 0) {
      this.notificationService.showError('Your cart is empty!', 2500);
      return;
    }
    this.step = 2;
  }

  goToOrderSummary(): void {
    if (!this.address.fullName.trim() || !this.address.mobileNumber.trim() || !this.address.address.trim() || !this.address.city.trim() || !this.address.state.trim()) {
      this.notificationService.showError('Please fill all address details before continuing.', 2500);
      return;
    }
    this.step = 3;
  }

  checkoutOrder(): void {
    if (this.cartItems.length === 0) {
      this.notificationService.showError('Your cart is empty!', 2500);
      return;
    }

    this.isPlacingOrder = true;
    this.cartService.placeOrder().subscribe({
      next: (res) => {
        this.isPlacingOrder = false;
        this.isOrderPlaced = true;
        this.step = 4;
        this.cartService.clearCart();
        this.notificationService.showSuccess('Order placed successfully!', 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isPlacingOrder = false;
        this.notificationService.showError('Failed to place order. Please try again.', 3000);
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(query: string): void {
    this.router.navigate(['/home'], { queryParams: { q: query } });
  }
}
