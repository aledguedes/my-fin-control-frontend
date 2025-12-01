import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Transaction, FinancialCategory, InstallmentPlan, MonthlyView } from '../models/transaction.model';
import { Observable, tap, forkJoin, throwError } from 'rxjs';
// FIX: Import `map` operator from rxjs.
import { catchError, map } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private http: HttpClient = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private apiUrl = `${environment.apiUrl}/financial`;

  private categories = signal<FinancialCategory[]>([]);
  private installmentPlans = signal<InstallmentPlan[]>([]);
  private monthlyView = signal<MonthlyView | null>(null);
  private _navigateToInstallments = signal(false);

  allCategories = this.categories.asReadonly();
  allInstallmentPlans = this.installmentPlans.asReadonly();
  currentMonthlyView = this.monthlyView.asReadonly();
  navigateToInstallments = this._navigateToInstallments.asReadonly();

  revenueCategories = computed(() => this.allCategories().filter(c => c.type === 'revenue'));
  expenseCategories = computed(() => this.allCategories().filter(c => c.type === 'expense'));
  
  loadInitialData(): Observable<any> {
    return forkJoin({
      categories: this.http.get<{categories: FinancialCategory[]}>(`${this.apiUrl}/categories`),
      installmentPlans: this.http.get<{installmentPlans: InstallmentPlan[]}>(`${this.apiUrl}/summary/installment-plans`),
    }).pipe(
      tap(data => {
        this.categories.set(data.categories.categories);
        this.installmentPlans.set(data.installmentPlans.installmentPlans);
      })
    );
  }
  
  refreshInstallmentPlans(): Observable<InstallmentPlan[]> {
    // FIX: Use `map` to transform the stream to match the return type, which fixes the type inference for `data` in `tap`.
    return this.http.get<{installmentPlans: InstallmentPlan[]}>(`${this.apiUrl}/summary/installment-plans`).pipe(
        tap(data => this.installmentPlans.set(data.installmentPlans)),
        map(data => data.installmentPlans)
    );
  }

  fetchMonthlyView(date: Date): Observable<MonthlyView> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const params = new HttpParams().set('year', String(year)).set('month', String(month));
    return this.http.get<MonthlyView>(`${this.apiUrl}/summary/monthly-view`, { params }).pipe(
      tap(view => this.monthlyView.set(view))
    );
  }
  
  addTransaction(transactionData: Omit<Transaction, 'id'>): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/transactions`, transactionData).pipe(
      tap(() => this.notificationService.show('Lançamento adicionado!', 'success')),
      catchError(err => {
        this.notificationService.show('Erro ao adicionar lançamento.', 'error');
        return throwError(() => err);
      })
    );
  }

  updateTransaction(transaction: Transaction): Observable<Transaction> {
    return this.http.put<Transaction>(`${this.apiUrl}/transactions/${transaction.id}`, transaction).pipe(
      tap(() => this.notificationService.show('Lançamento atualizado!', 'success')),
      catchError(err => {
        this.notificationService.show('Erro ao atualizar lançamento.', 'error');
        return throwError(() => err);
      })
    );
  }

  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/transactions/${id}`).pipe(
      tap(() => this.notificationService.show('Lançamento excluído!', 'success')),
      catchError(err => {
        this.notificationService.show('Erro ao excluir lançamento.', 'error');
        return throwError(() => err);
      })
    );
  }

  addCategory(categoryData: Omit<FinancialCategory, 'id'>): Observable<FinancialCategory> {
    return this.http.post<FinancialCategory>(`${this.apiUrl}/categories`, categoryData).pipe(
      tap(newCategory => {
        this.categories.update(current => [...current, newCategory].sort((a,b) => a.name.localeCompare(b.name)));
        this.notificationService.show('Categoria adicionada!', 'success');
      }),
      catchError(err => {
        this.notificationService.show('Erro ao adicionar categoria.', 'error');
        return throwError(() => err);
      })
    );
  }

  getCategoryById(id: string): FinancialCategory | undefined {
    return this.categories().find(c => c.id === id);
  }
  
  triggerInstallmentsNavigation() { this._navigateToInstallments.set(true); }
  resetInstallmentsNavigation() { this._navigateToInstallments.set(false); }
}