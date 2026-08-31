import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ProjectInvitationNavigationService {
  private token: string | null = null;

  preserve(token: string): void {
    this.token = token;
  }

  consume(): string | null {
    const token = this.token;
    this.token = null;
    return token;
  }
}
