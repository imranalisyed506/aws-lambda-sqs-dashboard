import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { NotificationService } from './notification.service';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss'
})
export class NotificationsComponent {
  constructor(public readonly notifications: NotificationService) {}
}
