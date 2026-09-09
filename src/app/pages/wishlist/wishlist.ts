import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { WishlistService, WishlistItem } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { NavbarComponent } from '../../components/navbar/navbar';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css',
})
export class Wishlist implements OnInit {
  wishlistItems: WishlistItem[] = [];
  isLoggedIn: boolean = false;
  searchQuery: string = '';
  currentYear: number = new Date().getFullYear();

  constructor(
    private wishlistService: WishlistService,
    private cartService: CartService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    this.authService.currentUser$.subscribe(() => {
      this.isLoggedIn = this.authService.isLoggedIn();
      this.cdr.detectChanges();
    });

    this.wishlistService.wishlistItems$.subscribe((items) => {
      this.wishlistItems = items || [];
      this.cdr.detectChanges();
    });

    if (this.isLoggedIn) {
      this.wishlistService.fetchWishlist();
    }
  }

  moveToCart(item: WishlistItem): void {
    this.cartService.addToCart(item.book);
    this.wishlistService.removeFromWishlist(item.book.id).subscribe();
    this.notificationService.showSuccess(`"${item.book.title}" moved to bag!`, 2000);
  }

  removeItem(item: WishlistItem): void {
    this.wishlistService.removeFromWishlist(item.book.id).subscribe();
    this.notificationService.showSuccess(`"${item.book.title}" removed from wishlist.`, 2000);
  }

  onSearch(query: string): void {
    this.router.navigate(['/home'], { queryParams: { q: query } });
  }
}
