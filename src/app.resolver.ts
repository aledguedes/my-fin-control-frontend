import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DataService } from './services/data.service';
import { ShoppingService } from './services/shopping.service';

export const initialDataResolver: ResolveFn<any> = () => {
  const dataService = inject(DataService);
  const shoppingService = inject(ShoppingService);

  return forkJoin({
    financial: dataService.loadInitialData(),
    shopping: shoppingService.loadInitialData(),
  });
};
