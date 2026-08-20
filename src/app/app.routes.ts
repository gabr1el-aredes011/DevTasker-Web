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
    path: 'recuperar-senha',
    loadComponent: () =>
      import(
        './features/authentication/pages/password-recovery/password-recovery.component'
      ).then((component) => component.PasswordRecoveryComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workspace/layouts/workspace-layout/workspace-layout.component').then(
        (component) => component.WorkspaceLayoutComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard.component').then(
            (component) => component.DashboardComponent,
          ),
      },
      {
        path: 'kanban',
        loadComponent: () =>
          import('./features/kanban/pages/kanban/kanban.component').then(
            (component) => component.KanbanComponent,
          ),
      },
    ],
  },
  {
    path: 'kanban',
    pathMatch: 'full',
    redirectTo: 'app/kanban',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
