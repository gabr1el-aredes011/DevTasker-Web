import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CurrentUserResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from './auth.models';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly currentUserState =
    signal<CurrentUserResponse | null>(null);

  readonly currentUser = this.currentUserState.asReadonly();
  readonly isAuthenticated = this.tokenStorage.isAuthenticated;

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/auth/login`,
        request,
      )
      .pipe(
        tap((response) => {
          this.tokenStorage.saveAccessToken(
            response.accessToken,
          );

          this.currentUserState.set({
            id: response.userId,
            name: response.name,
            email: response.email,
            role: response.role,
          });
        }),
      );
  }

  register(
  request: RegisterRequest,
): Observable<RegisterResponse> {
  return this.http.post<RegisterResponse>(
    `${environment.apiUrl}/auth/register`,
    request,
  );
}

  loadCurrentUser(): Observable<CurrentUserResponse> {
    return this.http
      .get<CurrentUserResponse>(
        `${environment.apiUrl}/users/me`,
      )
      .pipe(
        tap((user) => {
          this.currentUserState.set(user);
        }),
      );
  }

  logout(): void {
    this.tokenStorage.clear();
    this.currentUserState.set(null);
  }
}