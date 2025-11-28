import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const token = authService.getToken();

  let authReq = req;
  // CORREÇÃO: Alterado de startsWith para includes para funcionar com URLs absolutas.
  if (token && req.url.includes('/api/v1')) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        notificationService.show('Sua sessão expirou. Por favor, faça login novamente.', 'error');
        authService.logout(false);
      }
      return throwError(() => error);
    })
  );
};
