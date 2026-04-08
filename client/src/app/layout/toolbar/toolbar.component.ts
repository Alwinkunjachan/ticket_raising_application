import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
  ],
  template: `
    <div class="toolbar">
      <div class="toolbar-left"></div>
      <div class="toolbar-right">
        <a routerLink="/labels" routerLinkActive="active" class="toolbar-btn" matTooltip="Labels">
          <mat-icon>label</mat-icon>
          <span class="btn-text">Labels</span>
        </a>

        @if (authService.currentMember(); as member) {
          <button [matMenuTriggerFor]="userMenu" class="user-trigger">
            @if (member.avatarUrl) {
              <img [src]="member.avatarUrl" class="user-avatar" alt="avatar"
                   referrerpolicy="no-referrer" />
            } @else {
              <div class="user-avatar-placeholder">{{ authService.memberInitial() }}</div>
            }
          </button>
          <mat-menu #userMenu="matMenu" xPosition="before" class="user-dropdown">
            <ng-template matMenuContent>
              <div class="user-info-header">
                @if (member.avatarUrl) {
                  <img [src]="member.avatarUrl" class="menu-avatar" alt="avatar"
                       referrerpolicy="no-referrer" />
                } @else {
                  <div class="menu-avatar-placeholder">{{ authService.memberInitial() }}</div>
                }
                <span class="user-full-name">{{ getFirstName(member.name) }} {{ getLastName(member.name) }}</span>
                <span class="user-email">{{ member.email }}</span>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="themeService.toggleTheme()">
                <mat-icon>{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
                <span>{{ themeService.isDark() ? 'Light mode' : 'Dark mode' }}</span>
              </button>
              @if (member.role === 'admin') {
                <button mat-menu-item routerLink="/settings">
                  <mat-icon>settings</mat-icon>
                  <span>Settings</span>
                </button>
              }
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="confirmLogout()">
                <mat-icon>logout</mat-icon>
                <span>Sign out</span>
              </button>
            </ng-template>
          </mat-menu>
        }
      </div>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 44px;
      padding: 0 16px 0 20px;
      border-bottom: 1px solid var(--surface-border);
      background: var(--surface-bg);
      flex-shrink: 0;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 6px;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      transition: all 150ms;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--row-hover);
        color: var(--text-primary);
      }

      &.active {
        color: var(--accent-primary);
      }
    }

    .user-trigger {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid var(--surface-border);
      padding: 0;
      cursor: pointer;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 200ms;

      &:hover {
        border-color: var(--accent-primary);
      }
    }

    .user-avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .user-avatar-placeholder {
      width: 100%;
      height: 100%;
      background: var(--accent-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
    }

    .user-info-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 16px 12px;
      gap: 6px;
    }

    .menu-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .menu-avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--accent-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
    }

    .user-full-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .user-email {
      font-size: 11px;
      color: var(--text-secondary);
    }

    ::ng-deep .user-dropdown {
      .mat-mdc-menu-content {
        padding: 4px 0;
      }

      &.mat-mdc-menu-panel {
        border-radius: 12px;
        min-width: 180px;
        max-width: 200px;
        margin-top: 4px;
      }
    }
  `]
})
export class ToolbarComponent {
  constructor(
    public themeService: ThemeService,
    public authService: AuthService,
    private dialog: MatDialog
  ) {}

  getFirstName(fullName: string): string {
    return fullName.split(' ')[0];
  }

  getLastName(fullName: string): string {
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  confirmLogout(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Sign out',
        message: 'Are you sure you want to sign out?',
        confirmLabel: 'Sign out',
      },
      width: '360px',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.authService.logout();
      }
    });
  }
}
