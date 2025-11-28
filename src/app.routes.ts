import { inject } from '@angular/core';
import { Router, type CanActivateFn, type Routes } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LoginComponent } from './components/login/login.component';
import { InitialDashboardComponent } from './components/initial-dashboard/initial-dashboard.component';
import { FinancialHomeComponent } from './components/financial-home/financial-home.component';
import { ShoppingHomeComponent } from './components/shopping-home/shopping-home.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { initialDataResolver } from './app.resolver';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/login');
};

export const routes: Routes = [
    {
        path: 'login',
        component: LoginComponent,
    },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        resolve: {
          initialData: initialDataResolver
        },
        children: [
            { path: 'dashboard', component: InitialDashboardComponent },
            { 
              path: 'financial', 
              component: FinancialHomeComponent
            },
            { 
              path: 'shopping', 
              component: ShoppingHomeComponent
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ]
    },
    {
        path: '**',
        redirectTo: ''
    }
];