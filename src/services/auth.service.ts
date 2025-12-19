import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { environment } from '../environments/environment';

const AUTH_TOKEN_KEY = 'myfin_auth_token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Fix: Explicitly type the injected HttpClient to resolve property access errors.
  private http: HttpClient = inject(HttpClient);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private apiUrl = `${environment.apiUrl}/auth`;

  private token = signal<string | null>(localStorage.getItem(AUTH_TOKEN_KEY));

  isAuthenticated = computed<boolean>(() => {
    const currentToken = this.token();
    if (!currentToken) {
      return false;
    }
    return !this.isTokenExpired(currentToken);
  });

  constructor() {
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    if (this.token()) {
      this.isTokenExpired(this.token()!);
    }
  }

  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodedPayload);
    } catch (e) {
      console.error('Falha ao decodificar o token:', e);
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      this.logout(false);
      return true;
    }
    const expiry = payload.exp * 1000;
    const isExpired = Date.now() > expiry;
    
    if (isExpired) {
      this.logout(false);
    }
    
    return isExpired;
  }

  getToken(): string | null {
    return this.token();
  }

  login(email: string, pass: string): Observable<{ token: string } | null> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, { email: email, password: pass })
      .pipe(
        // Fix: Explicitly type the response to resolve property access errors.
        tap((response: { token: string }) => {
          localStorage.setItem(AUTH_TOKEN_KEY, response.token);
          this.token.set(response.token);
        }),
        catchError(() => {
          return of(null); // Em caso de erro do interceptor, retorna nulo para o componente
        })
      );
  }

  loginWithGoogle(credential: string): Observable<{ token: string } | null> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/google-login`, { credential })
      .pipe(
        // Fix: Explicitly type the response to resolve property access errors.
        tap((response: { token: string }) => {
          localStorage.setItem(AUTH_TOKEN_KEY, response.token);
          this.token.set(response.token);
        }),
        catchError(() => {
          return of(null);
        })
      );
  }

  logout(showNotification: boolean = true): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    this.token.set(null);
    this.router.navigate(['/login']);
    if (showNotification) {
      this.notificationService.show('Você foi desconectado com sucesso.', 'success');
    }
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === AUTH_TOKEN_KEY) {
      this.token.set(event.newValue);
    }
  }
}