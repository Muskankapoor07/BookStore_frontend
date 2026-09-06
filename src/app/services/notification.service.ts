import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface NotificationMessage {
  type: 'success' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<NotificationMessage | null>(null);
  public notification$: Observable<NotificationMessage | null> = this.notificationSubject.asObservable();
  private autoDismissTimer: any = null;

  showSuccess(message: string, durationMs: number = 2500): void {
    this.setNotification({ type: 'success', message }, durationMs);
  }

  showError(message: string, durationMs: number = 3000): void {
    this.setNotification({ type: 'error', message }, durationMs);
  }

  private setNotification(notification: NotificationMessage, durationMs: number): void {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
    }
    this.notificationSubject.next(notification);
    this.autoDismissTimer = setTimeout(() => {
      this.clear();
    }, durationMs);
  }

  clear(): void {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
    this.notificationSubject.next(null);
  }
}
