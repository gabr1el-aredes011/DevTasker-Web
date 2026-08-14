import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable,
} from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ResendEmailVerificationRequest,
  VerifyEmailRequest,
} from './email-verification.models';

@Injectable({
  providedIn: 'root',
})
export class EmailVerificationService {
  private readonly http = inject(HttpClient);

  confirm(
    request: VerifyEmailRequest,
  ): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/auth/email-verification/confirm`,
      request,
    );
  }

  resend(
    email: string,
  ): Observable<void> {
    const request: ResendEmailVerificationRequest = {
      email,
    };

    return this.http.post<void>(
      `${environment.apiUrl}/auth/email-verification/resend`,
      request,
    );
  }
}