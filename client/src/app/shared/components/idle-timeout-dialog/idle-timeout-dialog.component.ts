import { Component, Inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface IdleTimeoutDialogData {
  countdown: number;
}

@Component({
  selector: 'app-idle-timeout-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="idle-dialog">
      <div class="idle-icon">
        <mat-icon>schedule</mat-icon>
      </div>
      <h2>Session Expiring</h2>
      <p>You've been inactive for a while. For your security, you'll be signed out automatically.</p>
      <div class="progress-track">
        <div class="progress-fill" [style.width.%]="progressValue()"></div>
      </div>
      <span class="countdown-text">{{ secondsLeft() }}s remaining</span>
      <div class="idle-actions">
        <button mat-stroked-button (click)="onLogout()">Sign out</button>
        <button mat-flat-button color="primary" (click)="onExtend()">Extend Session</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .idle-dialog {
      text-align: center;
      padding: 28px 24px 24px;
    }

    .idle-icon {
      margin-bottom: 12px;

      mat-icon {
        font-size: 44px;
        width: 44px;
        height: 44px;
        color: var(--accent-primary, #7c3aed);
      }
    }

    h2 {
      margin: 0 0 8px;
      font-size: 17px;
      font-weight: 600;
      color: var(--text-primary);
    }

    p {
      margin: 0 0 20px;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .progress-track {
      width: 100%;
      height: 4px;
      border-radius: 2px;
      background: var(--surface-border, rgba(255, 255, 255, 0.1));
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      border-radius: 2px;
      background: var(--accent-primary, #7c3aed);
      transition: width 1s linear;
    }

    .countdown-text {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 20px;
    }

    .idle-actions {
      display: flex;
      gap: 10px;

      button {
        flex: 1;
        height: 38px;
        font-weight: 500;
        border-radius: 8px;
      }
    }
  `]
})
export class IdleTimeoutDialogComponent implements OnInit, OnDestroy {
  secondsLeft = signal(0);
  progressValue = signal(100);
  private timer: ReturnType<typeof setInterval> | null = null;
  private total: number;

  constructor(
    private dialogRef: MatDialogRef<IdleTimeoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: IdleTimeoutDialogData
  ) {
    this.total = data.countdown;
    this.secondsLeft.set(this.total);
  }

  ngOnInit(): void {
    this.timer = setInterval(() => {
      const remaining = this.secondsLeft() - 1;
      this.secondsLeft.set(remaining);
      this.progressValue.set((remaining / this.total) * 100);
      if (remaining <= 0) {
        this.clearTimer();
        this.dialogRef.close('logout');
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  onExtend(): void {
    this.clearTimer();
    this.dialogRef.close('extend');
  }

  onLogout(): void {
    this.clearTimer();
    this.dialogRef.close('logout');
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
