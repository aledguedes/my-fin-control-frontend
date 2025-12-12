import { Component, ChangeDetectionStrategy, signal, effect, inject, computed, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { InstallmentsComponent } from '../installments/installments.component';
import { CategoriesComponent } from '../categories/categories.component';
import { DataService } from '../../services/data.service';
import { UiService } from '../../services/ui.service';
import { MonthlyTransaction } from '../../models/transaction.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-financial-home',
  templateUrl: './financial-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DashboardComponent, InstallmentsComponent, CategoriesComponent],
  standalone: true,
})
export class FinancialHomeComponent {
  activeView = signal<'dashboard' | 'installments' | 'categories'>('dashboard');
  currentDate = signal(new Date());
  isLoading = signal(true);
  showMonthPicker = signal(false);
  showAllExpenses = signal(false);
  showAllTransactions = signal(false);

  dataService = inject(DataService);
  private uiService = inject(UiService);
  private cdr = inject(ChangeDetectorRef);

  // Month names for picker
  monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Available years (2025-2035)
  availableYears = computed(() => {
    const years: number[] = [];
    const startYear = 2025;
    const endYear = startYear + 10;
    for (let i = startYear; i <= endYear; i++) {
      years.push(i);
    }
    return years;
  });

  currentMonth = computed(() => this.currentDate().getMonth());
  currentYear = computed(() => this.currentDate().getFullYear());

  // Top expenses (sorted by amount, limited to 3)
  topExpenses = computed(() => {
    const view = this.dataService.currentMonthlyView();
    if (!view) return [];
    
    const expenses = view.transactions.filter(t => t.type === 'expense');
    const sorted = expenses.sort((a, b) => b.amount - a.amount);
    return this.showAllExpenses() ? sorted : sorted.slice(0, 3);
  });

  // Displayed transactions (limited or all)
  displayedTransactions = computed(() => {
    const view = this.dataService.currentMonthlyView();
    if (!view) return [];
    
    return this.showAllTransactions() ? view.transactions : view.transactions.slice(0, 5);
  });

  constructor() {
    // Fetch monthly view when date changes
    effect(
      () => {
        this.isLoading.set(true);
        const subscription = this.dataService.fetchMonthlyView(this.currentDate()).subscribe({
          next: () => this.isLoading.set(false),
          error: () => this.isLoading.set(false),
        });
        return () => subscription.unsubscribe();
      },
      { allowSignalWrites: true },
    );

    // Handle navigation to installments
    effect(() => {
      if (this.dataService.navigateToInstallments()) {
        this.setView('installments');
        this.dataService.resetInstallmentsNavigation();
      }
    });
  }

  setView(view: 'dashboard' | 'installments' | 'categories'): void {
    this.activeView.set(view);
  }

  onNewTransaction(): void {
    this.uiService.openTransactionModal(null);
  }

  navigateMonth(direction: number): void {
    if (this.isLoading()) return;
    const current = this.currentDate();
    const newDate = new Date(current.getFullYear(), current.getMonth() + direction, 2);
    this.currentDate.set(newDate);
    this.cdr.markForCheck();
  }

  toggleMonthPicker(): void {
    if (this.isLoading()) return;
    this.showMonthPicker.update((value) => !value);
  }

  selectMonth(monthIndex: number): void {
    const newDate = new Date(this.currentYear(), monthIndex, 2);
    this.currentDate.set(newDate);
    this.showMonthPicker.set(false);
    this.cdr.markForCheck();
  }

  selectYear(year: number): void {
    const newDate = new Date(year, this.currentMonth(), 2);
    this.currentDate.set(newDate);
    this.showMonthPicker.set(false);
    this.cdr.markForCheck();
  }

  closeMonthPicker(): void {
    this.showMonthPicker.set(false);
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    if (this.showMonthPicker()) {
      this.closeMonthPicker();
    }
  }

  getCategoryName(category_id: string): string {
    return this.dataService.getCategoryById(category_id)?.name ?? 'Sem Categoria';
  }

  getCategoryIcon(category_id: string): string {
    const category = this.dataService.getCategoryById(category_id);
    // Simple icon mapping based on category name
    if (!category) return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z';
    
    const name = category.name.toLowerCase();
    if (name.includes('compra') || name.includes('roupa')) {
      return 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'; // Shopping bag
    } else if (name.includes('lazer') || name.includes('entretenimento')) {
      return 'M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z'; // Entertainment
    }
    return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z'; // Default card icon
  }

  trackById(index: number, item: MonthlyTransaction): string {
    return item.id;
  }

  onEditTransaction(transaction: MonthlyTransaction): void {
    const transactionData = {
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      transaction_date: transaction.date,
      category_id: transaction.category_id,
      is_installment: transaction.is_installment ?? false,
      is_recurrent: transaction.is_recurrent ?? false,
      payment_method: transaction.payment_method,
      total_installments: transaction.total_installments,
    };
    this.uiService.openTransactionModal(transactionData);
  }

  toggleShowAllExpenses(): void {
    this.showAllExpenses.update(v => !v);
  }

  toggleShowAllTransactions(): void {
    this.showAllTransactions.update(v => !v);
  }
}