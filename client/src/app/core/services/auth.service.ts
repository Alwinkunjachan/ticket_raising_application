import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { Member } from '../models/member.model';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TokenResponse,
} from '../models/auth.model';

const API_URL = 'http://localhost:3000/api/v1/auth';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentMemberSignal = signal<Member | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private isLoadingSignal = signal<boolean>(true);

  readonly currentMember = this.currentMemberSignal.asReadonly();
  readonly isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly memberInitial = computed(() => {
    const member = this.currentMemberSignal();
    return member ? member.name.charAt(0).toUpperCase() : '';
  });

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredAuth();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/login`, credentials).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/register`, data).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  refreshToken(): Observable<TokenResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return of({ accessToken: '', refreshToken: '' });
    }
    return this.http
      .post<TokenResponse>(`${API_URL}/refresh`, { refreshToken })
      .pipe(
        tap((tokens) => this.storeTokens(tokens.accessToken, tokens.refreshToken))
      );
  }

  getProfile(): Observable<Member> {
    return this.http.get<Member>(`${API_URL}/me`);
  }

  googleLogin(): void {
    window.location.href = 'http://localhost:3000/api/v1/auth/google';
  }

  handleGoogleCallback(accessToken: string, refreshToken: string): void {
    this.storeTokens(accessToken, refreshToken);
    this.isAuthenticatedSignal.set(true);
    this.getProfile().subscribe({
      next: (member) => {
        this.currentMemberSignal.set(member);
        this.router.navigate(['/']);
      },
      error: () => {
        this.logout();
      },
    });
  }

  logout(): void {
    this.clearTokens();
    this.currentMemberSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.storeTokens(response.accessToken, response.refreshToken);
    this.currentMemberSignal.set(response.member);
    this.isAuthenticatedSignal.set(true);
  }

  private loadStoredAuth(): void {
    const token = this.getAccessToken();
    if (token) {
      this.isAuthenticatedSignal.set(true);
      this.getProfile().pipe(
        catchError(() => {
          this.clearTokens();
          this.isAuthenticatedSignal.set(false);
          this.isLoadingSignal.set(false);
          return of(null);
        })
      ).subscribe((member) => {
        if (member) {
          this.currentMemberSignal.set(member);
        }
        this.isLoadingSignal.set(false);
      });
    } else {
      this.isLoadingSignal.set(false);
    }
  }
}
