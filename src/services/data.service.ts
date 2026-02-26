import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Transaction,
  FinancialCategory,
  InstallmentPlan,
  MonthlyView,
} from '../models/transaction.model';
import { Observable, tap, forkJoin, throwError } from 'rxjs';
// FIX: Import `map` operator from rxjs.
import { catchError, map } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { CacheService } from './cache.service';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private http: HttpClient = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private cacheService = inject(CacheService);
  private apiUrl = `${environment.apiUrl}/financial`;

  private categories = signal<FinancialCategory[]>([]);
  private installmentPlans = signal<InstallmentPlan[]>([]);
  private monthlyView = signal<MonthlyView | null>(null);
  private _navigateToInstallments = signal(false);

  allCategories = this.categories.asReadonly();
  allInstallmentPlans = this.installmentPlans.asReadonly();
  currentMonthlyView = this.monthlyView.asReadonly();
  navigateToInstallments = this._navigateToInstallments.asReadonly();

  revenueCategories = computed(() => this.allCategories().filter((c) => c.type === 'revenue'));
  expenseCategories = computed(() => this.allCategories().filter((c) => c.type === 'expense'));

  loadInitialData(): Observable<any> {
    return forkJoin({
      categories: this.http.get<{ categories: FinancialCategory[] }>(`${this.apiUrl}/categories`),
      installmentPlans: this.http.get<{ installmentPlans: InstallmentPlan[] }>(
        `${this.apiUrl}/summary/installment-plans`,
      ),
    }).pipe(
      tap((data) => {
        this.categories.set(data.categories.categories);
        this.installmentPlans.set(data.installmentPlans.installmentPlans);
      }),
    );
  }

  refreshInstallmentPlans(): Observable<InstallmentPlan[]> {
    // FIX: Use `map` to transform the stream to match the return type, which fixes the type inference for `data` in `tap`.
    return this.http
      .get<{ installmentPlans: InstallmentPlan[] }>(`${this.apiUrl}/summary/installment-plans`)
      .pipe(
        tap((data) => this.installmentPlans.set(data.installmentPlans)),
        map((data) => data.installmentPlans),
      );
  }

  fetchMonthlyView(date: Date, showHidden: boolean = false): Observable<MonthlyView> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    let params = new HttpParams().set('year', String(year)).set('month', String(month));

    if (showHidden) {
      params = params.set('showHidden', 'true');
    }

    return this.http.get<any>(`${this.apiUrl}/summary/monthly-view`, { params }).pipe(
      map((response) => {
        const today = new Date().toISOString().split('T')[0];
        // Mapear transações da API (camelCase) para o formato esperado (snake_case)
        const mappedTransactions = (response.transactions || response.monthlyView || []).map(
          (tx: any) => {
            const date = tx.date || tx.transaction_date;
            let status = tx.status;

            // Fallback logic aligned with new enums if status is missing
            if (!status) {
              status = date < today ? 'OVERDUE' : 'UPCOMING';
            }

            return {
              ...tx,
              status,
              isHidden: tx.isHidden ?? false,
              is_installment: tx.isInstallment ?? tx.is_installment ?? false,
              is_recurrent: tx.isRecurrent ?? tx.is_recurrent ?? false,
              installment_number: tx.installment_number ?? tx.installmentNumber,
              parent_id: tx.parent_id ?? tx.parentId,
              paid_installments: tx.paid_installments ?? tx.paidInstallments ?? 0,
            };
          },
        );

        return {
          ...response,
          transactions: mappedTransactions,
        } as MonthlyView;
      }),
      tap((view) => this.monthlyView.set(view)),
    );
  }

  addTransaction(transactionData: Omit<Transaction, 'id'>): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/transactions`, transactionData).pipe(
      tap(() => {
        // Invalidar cache relacionado
        this.cacheService.clearByPattern('/summary/monthly-view');
        this.cacheService.clearByPattern('/summary/installment-plans');
        this.notificationService.show('Lançamento adicionado!', 'success');
      }),
      catchError((err) => {
        this.notificationService.show('Erro ao adicionar lançamento.', 'error');
        return throwError(() => err);
      }),
    );
  }

  updateTransaction(transaction: Transaction): Observable<Transaction> {
    console.log('UPDATE TRANSACTION', transaction);
    return this.http
      .put<Transaction>(`${this.apiUrl}/transactions/${transaction.id}`, transaction)
      .pipe(
        tap(() => {
          // Invalidar cache relacionado
          this.cacheService.clearByPattern('/summary/monthly-view');
          this.cacheService.clearByPattern('/summary/installment-plans');
          this.notificationService.show('Lançamento atualizado!', 'success');
        }),
        catchError((err) => {
          this.notificationService.show('Erro ao atualizar lançamento.', 'error');
          return throwError(() => err);
        }),
      );
  }

  updateTransactionStatus(
    id: string,
    status: 'PAID' | 'UPCOMING' | 'OVERDUE',
  ): Observable<Transaction> {
    return this.http
      .patch<Transaction>(`${this.apiUrl}/transactions/${id}/status`, { status })
      .pipe(
        tap(() => {
          this.cacheService.clearByPattern('/summary/monthly-view');
          this.cacheService.clearByPattern('/summary/installment-plans');
          const statusLabels: Record<string, string> = {
            PAID: 'Pago',
            UPCOMING: 'Pendente',
            OVERDUE: 'Atrasado',
          };
          this.notificationService.show(
            `Status atualizado para ${statusLabels[status]}!`,
            'success',
          );
        }),
        catchError((err) => {
          this.notificationService.show('Erro ao atualizar status.', 'error');
          return throwError(() => err);
        }),
      );
  }

  updatePayment(parentId: string, paidInstallments: number): Observable<any> {
    return this.http
      .patch(`${this.apiUrl}/transactions/${parentId}/payment`, {
        paid_installments: paidInstallments,
      })
      .pipe(
        tap(() => {
          this.cacheService.clearByPattern('/summary/monthly-view');
          this.cacheService.clearByPattern('/summary/installment-plans');
          this.notificationService.show('Pagamento atualizado!', 'success');
        }),
        catchError((err) => {
          this.notificationService.show('Erro ao atualizar pagamento.', 'error');
          return throwError(() => err);
        }),
      );
  }

  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/transactions/${id}`).pipe(
      tap(() => {
        // Invalidar cache relacionado
        this.cacheService.clearByPattern('/summary/monthly-view');
        this.cacheService.clearByPattern('/summary/installment-plans');
        this.notificationService.show('Lançamento excluído!', 'success');
      }),
      catchError((err) => {
        this.notificationService.show('Erro ao excluir lançamento.', 'error');
        return throwError(() => err);
      }),
    );
  }

  addCategory(categoryData: Omit<FinancialCategory, 'id'>): Observable<FinancialCategory> {
    return this.http.post<FinancialCategory>(`${this.apiUrl}/categories`, categoryData).pipe(
      tap((newCategory) => {
        // Invalidar cache de categorias
        this.cacheService.clearByPattern('/categories');
        this.categories.update((current) =>
          [...current, newCategory].sort((a, b) => a.name.localeCompare(b.name)),
        );
        this.notificationService.show('Categoria adicionada!', 'success');
      }),
      catchError((err) => {
        this.notificationService.show('Erro ao adicionar categoria.', 'error');
        return throwError(() => err);
      }),
    );
  }

  getCategoryById(id: string): FinancialCategory | undefined {
    return this.categories().find((c) => c.id === id);
  }

  excludeRecurrentMonth(
    id: string,
    month: string | string[],
    action: 'add' | 'remove',
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/transactions/${id}/exclude`, { month, action }).pipe(
      tap(() => {
        this.cacheService.clearByPattern('/summary/monthly-view');
        this.cacheService.clearByPattern('/summary/installment-plans');
        this.notificationService.show(
          action === 'add' ? 'Alteração aplicada com sucesso!' : 'Mês restaurado!',
          'success',
        );
      }),
      catchError((err) => {
        this.notificationService.show('Erro ao processar exclusão.', 'error');
        return throwError(() => err);
      }),
    );
  }

  excludeRecurrentBatch(
    items: { id: string; month: string | string[]; action: 'add' | 'remove' }[],
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/transactions/batch/exclude`, items).pipe(
      tap(() => {
        this.cacheService.clearByPattern('/summary/monthly-view');
        this.cacheService.clearByPattern('/summary/installment-plans');
        this.notificationService.show('Alteração em lote aplicada!', 'success');
      }),
      catchError((err) => {
        this.notificationService.show('Erro ao processar lote.', 'error');
        return throwError(() => err);
      }),
    );
  }

  triggerInstallmentsNavigation() {
    this._navigateToInstallments.set(true);
  }
  resetInstallmentsNavigation() {
    this._navigateToInstallments.set(false);
  }
}
