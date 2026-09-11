import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Book } from '../../models/book.model';
import { BookService } from '../../services/book.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { NavbarComponent } from '../../components/navbar/navbar';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  books: Book[] = [];
  filteredBooksList: Book[] = [];
  isLoading: boolean = true;

  searchQuery: string = '';
  sortBy: string = 'relevance';
  currentPage: number = 1;
  pageSize: number = 12;
  totalItems: number = 0;
  currentYear: number = new Date().getFullYear();

  totalPages: number = 1;
  pages: number[] = [];

  constructor(
    private bookService: BookService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBooks();
    if (this.authService.isLoggedIn()) {
      this.wishlistService.fetchWishlist();
    }
    this.wishlistService.wishlistItems$.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  /**
   * Load books dynamically via BookService (connected to Spring Boot Backend API)
   */
  loadBooks(): void {
    this.isLoading = true;
    this.bookService.getBooks(this.searchQuery, this.sortBy, this.currentPage - 1, this.pageSize).subscribe({
      next: (res) => {
        this.books = res.books || [];
        this.totalItems = res.totalElements;
        this.totalPages = res.totalPages || Math.ceil(this.totalItems / this.pageSize);
        this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        this.applyFilterAndSort();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching books from backend:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilterAndSort(): void {
    let result = [...this.books];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      );
    }

    if (this.sortBy === 'newest') {
      result.sort((a, b) => Number(b.id) - Number(a.id));
    } else if (this.sortBy === 'low-to-high') {
      result.sort((a, b) => a.discountPrice - b.discountPrice);
    } else if (this.sortBy === 'high-to-low') {
      result.sort((a, b) => b.discountPrice - a.discountPrice);
    } else if (this.sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    this.filteredBooksList = result;
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.currentPage = 1;
    this.loadBooks();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.loadBooks();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadBooks();
    }
  }

  openBookDetail(bookId: number | string): void {
    this.router.navigate(['/book', bookId]);
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-book-cover.jpg';
  }

  addToCart(book: Book, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (!book.isOutOfStock) {
      this.cartService.addToCart(book);
      this.notificationService.showSuccess(`"${book.title}" added to cart!`, 2000);
      this.cdr.detectChanges();
    }
  }

  toggleWishlist(book: Book, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.notificationService.showError('Please login to manage your wishlist!', 2500);
      this.router.navigate(['/login']);
      return;
    }

    if (this.isInWishlist(book.id)) {
      this.wishlistService.removeFromWishlist(book.id).subscribe({
        next: () => {
          this.notificationService.showSuccess(`"${book.title}" removed from wishlist.`, 2000);
          this.cdr.detectChanges();
        },
      });
    } else {
      this.wishlistService.addToWishlist(book).subscribe({
        next: () => {
          this.notificationService.showSuccess(`"${book.title}" added to wishlist!`, 2000);
          this.cdr.detectChanges();
        },
      });
    }
  }

  isInWishlist(bookId: number | string): boolean {
    return this.wishlistService.isInWishlist(bookId);
  }
}

