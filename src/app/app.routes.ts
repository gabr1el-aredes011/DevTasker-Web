import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/authentication/pages/login/login.component').then(
        (component) => component.LoginComponent,
      ),
  },
  {
    path: 'cadastro',
    loadComponent: () =>
      import('./features/authentication/pages/register/register.component').then(
        (component) => component.RegisterComponent,
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/authentication/pages/verify-email/verify-email.component').then(
        (component) => component.VerifyEmailComponent,
      ),
  },
  {
    path: 'kanban',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/kanban/pages/kanban/kanban.component').then(
        (component) => component.KanbanComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
