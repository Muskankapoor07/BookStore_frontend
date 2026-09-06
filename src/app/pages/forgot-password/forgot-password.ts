import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  forgotForm: FormGroup;
  submitted = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit() {
    this.submitted = true;
    this.notificationService.clear();

    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      this.notificationService.showError('Please enter a valid email address.');
      return;
    }

    this.isLoading = true;
    const { email } = this.forgotForm.value;

    this.authService.forgotPassword({ email }).subscribe({
      next: (message) => {
        this.isLoading = false;
        this.notificationService.showSuccess(message || 'Password reset link sent to your email!');
      },
      error: (err) => {
        this.isLoading = false;
        let msg = 'Failed to send reset link. Please try again.';
        if (err.status === 0) {
          msg = 'Backend server is not running on http://localhost:8080.';
        } else if (err.error) {
          if (typeof err.error === 'string') {
            msg = err.error;
          } else if (err.error.message) {
            msg = err.error.message;
          }
        }
        this.notificationService.showError(msg);
      },
    });
  }
}
