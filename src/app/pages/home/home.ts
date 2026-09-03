import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Book } from '../../models/book.model';
import { BookService } from '../../services/book.service';
import { CartService } from '../../services/cart.service';
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
  pageSize: number = 8;
  totalItems: number = 0;
  currentYear: number = new Date().getFullYear();

  pages: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 18];

  constructor(
    private bookService: BookService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.loadBooks();
  }

  /**
   * Load books dynamically via BookService (connected to Backend API)
   */
  loadBooks(): void {
    this.isLoading = true;
    this.bookService.getBooks(this.searchQuery, this.sortBy).subscribe({
      next: (data: Book[]) => {
        this.books = data || [];
        this.applyFilterAndSort();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching books:', err);
        this.isLoading = false;
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
    this.totalItems = this.filteredBooksList.length;
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.currentPage = 1;
    this.applyFilterAndSort();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.applyFilterAndSort();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= 18) {
      this.currentPage = page;
    }
  }

  addToCart(book: Book): void {
    if (!book.isOutOfStock) {
      this.cartService.addToCart(book);
    }
  }
}
