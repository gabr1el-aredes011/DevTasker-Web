import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../auth/token-storage.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const tokenStorage = {
    token: vi.fn().mockReturnValue('jwt-token'),
    clear: vi.fn(),
  };

  const router = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.clearAllMocks();
    tokenStorage.token.mockReturnValue('jwt-token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenStorageService, useValue: tokenStorage },
        { provide: Router, useValue: router },
      ],
    });

    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should not attach JWT or redirect on a public password recovery 401', () => {
    const url = `${environment.apiUrl}/auth/password-recovery/request`;

    client.post(url, { email: 'user@example.com' }).subscribe({ error: () => undefined });

    const request = http.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(tokenStorage.clear).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should attach JWT and expire the session on a protected API 401', () => {
    const url = `${environment.apiUrl}/projects`;

    client.get(url).subscribe({ error: () => undefined });

    const request = http.expectOne(url);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(tokenStorage.clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { session: 'expired' },
    });
  });

  it('should preserve the session after a 401 from an external service', () => {
    const url = 'https://example.test/private-resource';

    client.get(url).subscribe({ error: () => undefined });

    const request = http.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(tokenStorage.clear).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
