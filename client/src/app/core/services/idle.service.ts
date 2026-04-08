import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from './auth.service';
import { IdleTimeoutDialogComponent } from '../../shared/components/idle-timeout-dialog/idle-timeout-dialog.component';

const IDLE_TIMEOUT = 10 * 60 * 1000;   // 10 minutes
const COUNTDOWN_DURATION = 30;         // 30 seconds countdown

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

@Injectable({ providedIn: 'root' })
export class IdleService implements OnDestroy {
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private dialogRef: MatDialogRef<IdleTimeoutDialogComponent> | null = null;
  private running = false;
  private boundReset: () => void;

  constructor(
    private ngZone: NgZone,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    this.boundReset = this.resetTimer.bind(this);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.addListeners();
    this.startTimer();
  }

  stop(): void {
    this.running = false;
    this.removeListeners();
    this.clearTimer();
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private addListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      ACTIVITY_EVENTS.forEach((event) =>
        document.addEventListener(event, this.boundReset, { passive: true })
      );
    });
  }

  private removeListeners(): void {
    ACTIVITY_EVENTS.forEach((event) =>
      document.removeEventListener(event, this.boundReset)
    );
  }

  private startTimer(): void {
    this.clearTimer();
    this.ngZone.runOutsideAngular(() => {
      this.idleTimer = setTimeout(() => {
        this.ngZone.run(() => this.onIdle());
      }, IDLE_TIMEOUT);
    });
  }

  private clearTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private resetTimer(): void {
    if (!this.running || this.dialogRef) return;
    this.startTimer();
  }

  private onIdle(): void {
    this.removeListeners();
    this.clearTimer();

    this.dialogRef = this.dialog.open(IdleTimeoutDialogComponent, {
      data: { countdown: COUNTDOWN_DURATION },
      disableClose: true,
      width: '380px',
      panelClass: 'idle-timeout-panel',
      autoFocus: false,
    });

    this.dialogRef.afterClosed().subscribe((action: 'extend' | 'logout') => {
      this.dialogRef = null;
      if (action === 'extend') {
        this.addListeners();
        this.startTimer();
      } else {
        this.stop();
        this.authService.logout();
      }
    });
  }
}
