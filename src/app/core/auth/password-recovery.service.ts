import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  PasswordRecoveryChallengeResponse,
  RequestPasswordRecoveryRequest,
  ResendPasswordRecoveryRequest,
  ResetPasswordRequest,
  VerifyPasswordRecoveryRequest,
  VerifyPasswordRecoveryResponse,
} from './password-recovery.models';

@Injectable({
  providedIn: 'root',
})
export class PasswordRecoveryService {
  private readonly http = inject(HttpClient);

  request(
    request: RequestPasswordRecoveryRequest,
  ): Observable<PasswordRecoveryChallengeResponse> {
    return this.http.post<PasswordRecoveryChallengeResponse>(
      `${environment.apiUrl}/auth/password-recovery/request`,
      request,
    );
  }

  resend(request: ResendPasswordRecoveryRequest): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/auth/password-recovery/resend`,
      request,
    );
  }

  verify(
    request: VerifyPasswordRecoveryRequest,
  ): Observable<VerifyPasswordRecoveryResponse> {
    return this.http.post<VerifyPasswordRecoveryResponse>(
      `${environment.apiUrl}/auth/password-recovery/verify`,
      request,
    );
  }

  reset(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/auth/password-recovery/reset`,
      request,
    );
  }
}
