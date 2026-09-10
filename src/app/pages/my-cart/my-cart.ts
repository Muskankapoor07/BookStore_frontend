import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, NavbarComponent],
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

  // Login Modal
  showLoginModal: boolean = false;
  loginModalTab: 'login' | 'signup' = 'login';
  showLoginPassword: boolean = false;
  showSignupPassword: boolean = false;
  isLoginLoading: boolean = false;
  loginForm: FormGroup;
  signupForm: FormGroup;

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
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    });
  }

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
    if (!this.authService.isLoggedIn()) {
      this.showLoginModal = true;
      return;
    }
    this.step = 2;
  }

  // ================= LOGIN MODAL =================

  closeLoginModal(): void {
    this.showLoginModal = false;
    this.loginForm.reset();
    this.signupForm.reset();
    this.loginModalTab = 'login';
  }

  onModalOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('login-modal-overlay')) {
      this.closeLoginModal();
    }
  }

  switchModalTab(tab: 'login' | 'signup'): void {
    this.loginModalTab = tab;
    this.cdr.detectChanges();
  }

  toggleLoginPassword(): void {
    this.showLoginPassword = !this.showLoginPassword;
  }

  toggleSignupPassword(): void {
    this.showSignupPassword = !this.showSignupPassword;
  }

  onModalLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.notificationService.showError('Please enter a valid email and password.', 3000);
      return;
    }

    this.isLoginLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password, rememberMe: false }).subscribe({
      next: () => {
        this.isLoginLoading = false;
        this.showLoginModal = false;
        this.notificationService.showSuccess('Login Successful! You can now place your order.', 3500);
        this.cartService.fetchBackendCart();

        // Pre-fill address name from user
        const user = this.authService.getCurrentUser();
        if (user) {
          this.address.fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        }

        this.step = 2;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoginLoading = false;
        let msg = 'Invalid email or password.';
        if (err.status === 0) {
          msg = 'Backend server is not running. Please start Spring Boot.';
        } else if (err.error) {
          msg = typeof err.error === 'string' ? err.error : (err.error.message || msg);
        }
        this.notificationService.showError(msg, 3500);
        this.cdr.detectChanges();
      },
    });
  }

  onModalSignup(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.notificationService.showError('Please fill in all required fields correctly.', 3000);
      return;
    }

    this.isLoginLoading = true;
    const { fullName, email, password } = this.signupForm.value;
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

    this.authService.register({ firstName, lastName, email, password }).subscribe({
      next: () => {
        this.isLoginLoading = false;
        this.signupForm.reset();
        this.loginModalTab = 'login';
        this.notificationService.showSuccess('Account created! Please login.', 3500);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoginLoading = false;
        let msg = 'Registration failed. Please try again.';
        if (err.status === 0) {
          msg = 'Backend server is not running. Please start Spring Boot.';
        } else if (err.error) {
          msg = typeof err.error === 'string' ? err.error : (err.error.message || msg);
        }
        this.notificationService.showError(msg, 3500);
        this.cdr.detectChanges();
      },
    });
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
