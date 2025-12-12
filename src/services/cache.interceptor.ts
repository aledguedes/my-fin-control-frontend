import { HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, tap } from 'rxjs';
import { CacheService } from './cache.service';

// Configuração de TTL por endpoint (em milissegundos)
const CACHE_CONFIG: Record<string, number> = {
  // Financial endpoints
  '/financial/categories': 3600000, // 1 hora
  '/financial/summary/monthly-view': 300000, // 5 minutos
  '/financial/summary/installment-plans': 900000, // 15 minutos
  
  // Shopping endpoints
  '/shopping/categories': 3600000, // 1 hora
  '/shopping/products': 1800000, // 30 minutos
  '/shopping/lists': 300000, // 5 minutos
};

const DEFAULT_TTL = 300000; // 5 minutos

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Apenas cachear requisições GET
  if (req.method !== 'GET') {
    return next(req);
  }

  // Não cachear requisições de autenticação
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const cacheService = inject(CacheService);
  const cacheKey = `${req.url}?${req.params.toString()}`;

  // Verificar cache
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return of(new HttpResponse({ body: cached, status: 200 }));
  }

  // Determinar TTL baseado no endpoint
  const ttl =
    Object.entries(CACHE_CONFIG).find(([path]) => req.url.includes(path))?.[1] || DEFAULT_TTL;

  // Fazer requisição e cachear resposta
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cacheService.set(cacheKey, event.body, ttl);
      }
    }),
  );
};

