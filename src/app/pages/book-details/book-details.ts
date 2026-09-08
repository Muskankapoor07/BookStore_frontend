import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Book, FeedbackItem } from '../../models/book.model';
import { BookService } from '../../services/book.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { NavbarComponent } from '../../components/navbar/navbar';

@Component({
  selector: 'app-book-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './book-details.html',
  styleUrl: './book-details.css',
})
export class BookDetails implements OnInit {
  book: Book | null = null;
  bookId: string | number = '';
  isLoading: boolean = true;
  searchQuery: string = '';
  currentYear: number = new Date().getFullYear();

  // Image Gallery
  selectedImage: string = '';
  thumbnails: string[] = [];

  // Feedback & Ratings
  feedbackList: FeedbackItem[] = [];
  userRating: number = 0;
  hoverRating: number = 0;
  newComment: string = '';
  isSubmittingFeedback: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookService: BookService,
    private cartService: CartService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.bookId = id;
        this.loadBookDetails(id);
        this.loadFeedback(id);
      }
    });
  }

  loadBookDetails(id: string | number): void {
    this.isLoading = true;
    this.bookService.getBookById(id).subscribe({
      next: (data) => {
        if (data) {
          this.book = data;
          this.selectedImage = data.coverImage || 'assets/images/dont-make-me-think.svg';
          this.thumbnails = [this.selectedImage];
        } else {
          this.notificationService.showError('Book not found!', 3000);
          this.router.navigate(['/home']);
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching book details:', err);
        this.isLoading = false;
        this.notificationService.showError('Failed to load book details.', 3000);
        this.cdr.detectChanges();
      },
    });
  }

  loadFeedback(id: string | number): void {
    this.bookService.getFeedback(id).subscribe({
      next: (feedback) => {
        this.feedbackList = feedback || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading feedback:', err);
      },
    });
  }

  selectThumbnail(imgUrl: string): void {
    this.selectedImage = imgUrl;
  }

  setRating(rating: number): void {
    this.userRating = rating;
  }

  setHoverRating(rating: number): void {
    this.hoverRating = rating;
  }

  submitFeedback(): void {
    if (!this.authService.isLoggedIn()) {
      this.notificationService.showError('Please login to submit feedback!', 3000);
      this.router.navigate(['/login']);
      return;
    }

    if (this.userRating <= 0) {
      this.notificationService.showError('Please select a star rating!', 2500);
      return;
    }

    if (!this.newComment.trim()) {
      this.notificationService.showError('Please enter a review comment!', 2500);
      return;
    }

    this.isSubmittingFeedback = true;
    this.bookService.addFeedback(this.bookId, this.userRating, this.newComment.trim()).subscribe({
      next: (res) => {
        this.notificationService.showSuccess('Thank you for your feedback!', 2500);
        this.userRating = 0;
        this.hoverRating = 0;
        this.newComment = '';
        this.isSubmittingFeedback = false;
        this.loadFeedback(this.bookId); // Refresh list dynamically
      },
      error: (err) => {
        console.error('Error submitting feedback:', err);
        this.isSubmittingFeedback = false;
        this.notificationService.showError('Failed to submit feedback. Please try again.', 3000);
        this.cdr.detectChanges();
      },
    });
  }

  addToBag(): void {
    if (this.book) {
      if (this.book.isOutOfStock) {
        this.notificationService.showError('This book is currently out of stock.', 2500);
        return;
      }
      this.cartService.addToCart(this.book);
      this.notificationService.showSuccess(`"${this.book.title}" added to bag!`, 2000);
    }
  }

  addToWishlist(): void {
    if (this.book) {
      this.notificationService.showSuccess(`"${this.book.title}" added to wishlist!`, 2000);
    }
  }

  onSearch(query: string): void {
    this.router.navigate(['/home'], { queryParams: { q: query } });
  }

  getUserInitials(emailOrName?: string): string {
    if (!emailOrName) return 'U';
    const clean = emailOrName.split('@')[0].trim();
    const parts = clean.split(/[ ._]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  }

  getUserDisplayName(emailOrName?: string): string {
    if (!emailOrName) return 'Anonymous User';
    const name = emailOrName.split('@')[0];
    return name
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
