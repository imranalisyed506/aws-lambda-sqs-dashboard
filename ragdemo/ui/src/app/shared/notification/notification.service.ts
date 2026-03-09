import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'info';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  timeoutMs: number;
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  readonly notifications$ = this.notificationsSubject.asObservable();

  notifySuccess(message: string, title = 'Success', timeoutMs = 3000): void {
    this.push({ type: 'success', title, message, timeoutMs });
  }

  notifyError(message: string, title = 'Error', timeoutMs = 5000): void {
    this.push({ type: 'error', title, message, timeoutMs });
  }

  notifyInfo(message: string, title = 'Info', timeoutMs = 3500): void {
    this.push({ type: 'info', title, message, timeoutMs });
  }

  remove(id: string): void {
    const current = this.notificationsSubject.getValue();
    this.notificationsSubject.next(current.filter((item) => item.id !== id));
  }

  private push(input: Omit<NotificationItem, 'id'>): void {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item: NotificationItem = { id, ...input };
    const current = this.notificationsSubject.getValue();

    this.notificationsSubject.next([item, ...current].slice(0, 4));

    window.setTimeout(() => {
      this.remove(id);
    }, item.timeoutMs);
  }
}
