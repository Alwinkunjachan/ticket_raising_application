import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <mat-icon class="auth-logo">confirmation_number</mat-icon>
          <h1>Sprintly</h1>
          <p class="auth-subtitle">Issue tracking for modern teams</p>
        </div>

        <mat-tab-group [(selectedIndex)]="selectedTab" animationDuration="200ms">
          <mat-tab label="Sign In">
            <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="auth-form">
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email" placeholder="you{'@'}example.com" />
                @if (loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched) {
                  <mat-error>Enter a valid email</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input matInput formControlName="password" [type]="hideLoginPassword() ? 'password' : 'text'" />
                <button mat-icon-button matSuffix type="button" (click)="hideLoginPassword.set(!hideLoginPassword())">
                  <mat-icon>{{ hideLoginPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit" class="auth-submit-btn"
                      [disabled]="loginForm.invalid || isLoading()">
                @if (isLoading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Sign In
                }
              </button>
            </form>
          </mat-tab>

          <mat-tab label="Create Account">
            <form [formGroup]="registerForm" (ngSubmit)="onRegister()" class="auth-form">
              <mat-form-field appearance="outline">
                <mat-label>Name</mat-label>
                <input matInput formControlName="name" placeholder="Your name" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email" placeholder="you{'@'}example.com" />
                @if (registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched) {
                  <mat-error>Enter a valid email</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input matInput formControlName="password" [type]="hideRegisterPassword() ? 'password' : 'text'" />
                <button mat-icon-button matSuffix type="button" (click)="hideRegisterPassword.set(!hideRegisterPassword())">
                  <mat-icon>{{ hideRegisterPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (registerForm.get('password')?.hasError('minlength') && registerForm.get('password')?.touched) {
                  <mat-error>Password must be at least 8 characters</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Confirm Password</mat-label>
                <input matInput formControlName="confirmPassword" [type]="hideRegisterPassword() ? 'password' : 'text'" />
                @if (registerForm.get('confirmPassword')?.touched && registerForm.get('confirmPassword')?.value !== registerForm.get('password')?.value) {
                  <mat-error>Passwords do not match</mat-error>
                }
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit" class="auth-submit-btn"
                      [disabled]="registerForm.invalid || isLoading() || registerForm.get('password')?.value !== registerForm.get('confirmPassword')?.value">
                @if (isLoading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Create Account
                }
              </button>
            </form>
          </mat-tab>
        </mat-tab-group>

        <div class="auth-divider">
          <mat-divider></mat-divider>
          <span>OR</span>
          <mat-divider></mat-divider>
        </div>

        <button mat-stroked-button class="google-btn" (click)="onGoogleLogin()" [disabled]="isLoading()">
          <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      overflow: hidden;
    }

    .auth-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--surface-bg);
      padding: 24px;
      overflow: hidden;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 32px 32px 28px;
      background: var(--sidebar-bg);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
    }

    .auth-header {
      text-align: center;
      margin-bottom: 20px;

      .auth-logo {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--accent-primary);
        margin-bottom: 12px;
      }

      h1 {
        font-size: 22px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 4px;
      }

      .auth-subtitle {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0;
      }
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      padding-top: 16px;
      gap: 2px;

      mat-form-field {
        width: 100%;
      }
    }

    .auth-submit-btn {
      height: 40px;
      font-weight: 500;
      margin-top: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .auth-divider {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 16px 0;

      mat-divider {
        flex: 1;
      }

      span {
        font-size: 12px;
        color: var(--text-secondary);
        font-weight: 500;
      }
    }

    .google-btn {
      width: 100%;
      height: 40px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-primary);
      border-color: var(--surface-border);
    }

    .google-icon {
      flex-shrink: 0;
    }

    ::ng-deep .mat-mdc-tab-header {
      --mdc-secondary-navigation-tab-container-height: 40px;
    }

    ::ng-deep .mat-mdc-tab-body-wrapper {
      flex: 1;
    }

    ::ng-deep .mat-mdc-tab-body.mat-mdc-tab-body-active {
      overflow: visible !important;

      .mat-mdc-tab-body-content {
        overflow: visible !important;
      }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  registerForm: FormGroup;
  selectedTab = 0;
  hideLoginPassword = signal(true);
  hideRegisterPassword = signal(true);
  isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.notification.success('Signed in successfully');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notification.error(err.error?.error?.message || err.error?.message || 'Login failed');
      },
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid) return;
    if (this.registerForm.value.password !== this.registerForm.value.confirmPassword) {
      this.notification.error('Passwords do not match');
      return;
    }
    this.isLoading.set(true);
    const { confirmPassword, ...data } = this.registerForm.value;
    this.authService.register(data).subscribe({
      next: () => {
        this.notification.success('Account created successfully');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notification.error(err.error?.error?.message || err.error?.message || 'Registration failed');
      },
    });
  }

  onGoogleLogin(): void {
    this.authService.googleLogin();
  }
}
