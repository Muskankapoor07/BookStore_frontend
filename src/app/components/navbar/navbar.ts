import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent implements OnInit {
  @Input() searchQuery: string = '';
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();

  currentUser: User | null = null;
  cartCount: number = 0;
  isProfileMenuOpen: boolean = false;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    this.cartService.cartCount$.subscribe((count) => {
      this.cartCount = count;
    });
  }

  // Close profile dropdown when clicking anywhere outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-item')) {
      this.isProfileMenuOpen = false;
    }
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.searchQueryChange.emit(value);
    this.search.emit(value);
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  logout(): void {
    this.isProfileMenuOpen = false;
    this.authService.logout();
    this.notificationService.showSuccess('Logged out successfully!', 2500);
    this.router.navigate(['/login']);
  }
}
