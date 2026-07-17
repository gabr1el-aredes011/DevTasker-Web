import { computed, Injectable, signal } from '@angular/core';

const ACCESS_TOKEN_KEY = 'devtasker.access_token';

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  private readonly tokenState = signal<string | null>(
    localStorage.getItem(ACCESS_TOKEN_KEY),
  );

  readonly token = this.tokenState.asReadonly();

  readonly isAuthenticated = computed(
    () => this.tokenState() !== null,
  );

  saveAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    this.tokenState.set(token);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    this.tokenState.set(null);
  }
}