import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
// Fix: Import MonthlyView from the model file
import { Transaction, Category, InstallmentPlan, MonthlyView } from '../models/transaction.model';
import { Observable, tap, forkJoin, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { environment } from '../environments/environment';

// Fix: Removed local MonthlyView interface definition
@Injectable({
  providedIn: 'root',
})
export class DataService {
  // Fix: Explicitly type the injected HttpClient to resolve property access errors.
  private http: HttpClient = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private apiUrl = `${environment.apiUrl}/financial`;

  private categories = signal<Category[]>([]);
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
      categories: this.http.get<Category[]>(`${this.apiUrl}/categories`),
      installmentPlans: this.http.get<InstallmentPlan[]>(`${this.apiUrl}/summary/installment-plans`),
    }).pipe(
      tap(data => {
        this.categories.set(data.categories);
        this.installmentPlans.set(data.installmentPlans);
      })
    );
  }
  
  refreshInstallmentPlans(): Observable<InstallmentPlan[]> {
    return this.http.get<InstallmentPlan[]>(`${this.apiUrl}/summary/installment-plans`).pipe(
        tap(plans => this.installmentPlans.set(plans))
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

  addCategory(categoryData: Omit<Category, 'id'>): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, categoryData).pipe(
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

  getCategoryById(id: string): Category | undefined {
    return this.categories().find(c => c.id === id);
  }
  
  triggerInstallmentsNavigation() { this._navigateToInstallments.set(true); }
  resetInstallmentsNavigation() { this._navigateToInstallments.set(false); }
}