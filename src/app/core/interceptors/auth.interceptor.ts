import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../auth/token-storage.service';

export const authInterceptor: HttpInterceptorFn = (
  request,
  next,
) => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  const token = tokenStorage.token();

  const isApiRequest =
    request.url.startsWith(environment.apiUrl);

  const requestWithToken =
    token && isApiRequest
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : request;

  return next(requestWithToken).pipe(
    catchError((error: unknown) => {
      const isUnauthorized =
        error instanceof HttpErrorResponse &&
        error.status === 401;

      const isLoginRequest =
        request.url.endsWith('/auth/login');

      if (isUnauthorized && !isLoginRequest) {
        tokenStorage.clear();

        void router.navigate(['/login'], {
          queryParams: {
            session: 'expired',
          },
        });
      }

      return throwError(() => error);
    }),
  );
};