import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  activeTab: 'login' | 'signup' = 'login';
  showLoginPassword = false;
  showSignupPassword = false;
  loginForm: FormGroup;
  signupForm: FormGroup;

  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });

    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['tab'] === 'signup') {
        this.activeTab = 'signup';
      } else if (params['tab'] === 'login') {
        this.activeTab = 'login';
      }
    });

    if (this.route.snapshot.url[0]?.path === 'signup') {
      this.activeTab = 'signup';
    }
  }

  switchTab(tab: 'login' | 'signup') {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  toggleLoginPassword() {
    this.showLoginPassword = !this.showLoginPassword;
  }

  toggleSignupPassword() {
    this.showSignupPassword = !this.showSignupPassword;
  }

  onLogin() {
    this.notificationService.clear();

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.notificationService.showError('Please enter a valid email and password.', 3000);
      return;
    }

    this.isLoading = true;
    const { email, password, rememberMe } = this.loginForm.value;

    this.authService.login({ email, password, rememberMe })
      .subscribe({
        next: (res) => {
          // Show green banner 'Login Successful' that persists across route navigation
          this.notificationService.showSuccess('Login Successful', 3500);
          this.cdr.detectChanges();

          // Navigate to home after short delay without clearing notification
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 300);
        },
        error: (err) => {
          this.isLoading = false;
          let msg = 'Invalid email or password.';
          if (err.status === 0) {
            msg = 'Backend server is not running on http://localhost:8080. Please start Spring Boot.';
          } else if (err.error) {
            if (typeof err.error === 'string') {
              msg = err.error;
            } else if (err.error.message) {
              msg = err.error.message;
            }
          }
          this.notificationService.showError(msg, 3500);
          this.cdr.detectChanges();
        },
      });
  }

  onSignup() {
    this.notificationService.clear();

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.notificationService.showError('Please fill in all required fields correctly.', 3000);
      return;
    }

    this.isLoading = true;
    const { fullName, email, password } = this.signupForm.value;
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

    this.authService.register({ firstName, lastName, email, password })
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.signupForm.reset();

          // 1. Immediately switch to LOGIN tab
          this.activeTab = 'login';

          // 2. Show success popup
          this.notificationService.showSuccess('Account created successfully! Please login.', 3500);
          this.cdr.detectChanges();
        },
        error: (err) => {
          let msg = 'Registration failed. Please try again.';
          if (err.status === 0) {
            msg = 'Backend server is not running on http://localhost:8080. Please start Spring Boot.';
          } else if (err.error) {
            if (typeof err.error === 'string') {
              msg = err.error;
            } else if (err.error.message) {
              msg = err.error.message;
            }
          }
          this.notificationService.showError(msg, 3500);
          this.cdr.detectChanges();
        },
      });
  }
}
