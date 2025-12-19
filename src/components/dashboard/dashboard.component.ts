import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  effect,
  computed,
  input,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { Transaction, MonthlyTransaction } from '../../models/transaction.model';
import { UiService } from '../../services/ui.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class DashboardComponent {
  dataService = inject(DataService);
  private uiService = inject(UiService);
  private cdr = inject(ChangeDetectorRef);

  // Receive currentDate from parent component
  currentDate = input.required<Date>();
  isLoading = signal(true);
  deletingId = signal<string | null>(null);
  showAllExpenses = signal(false);
  showAllTransactions = signal(false);

  // Top expenses (sorted by amount, limited to 3)
  topExpenses = computed(() => {
    const view = this.dataService.currentMonthlyView();
    if (!view) return [];

    const expenses = view.transactions.filter((t) => t.type === 'expense');
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
        // Cleanup subscription on effect disposal
        return () => subscription.unsubscribe();
      },
      { allowSignalWrites: true },
    );
  }

  getCategoryName(category_id: string): string {
    return this.dataService.getCategoryById(category_id)?.name ?? 'Sem Categoria';
  }

  getCategoryIcon(category_id: string): string {
    const category = this.dataService.getCategoryById(category_id);
    // Simple icon mapping based on category name
    if (!category)
      return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z';

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

  toggleShowAllExpenses(): void {
    this.showAllExpenses.update((v) => !v);
  }

  toggleShowAllTransactions(): void {
    this.showAllTransactions.update((v) => !v);
  }

  onEdit(monthlyTx: MonthlyTransaction) {
    // Aceitar ambos os formatos (camelCase da API e snake_case do modelo)
    const is_installment = monthlyTx.isInstallment ?? monthlyTx.is_installment ?? false;
    const is_recurrent = monthlyTx.isRecurrent ?? monthlyTx.is_recurrent ?? false;
    
    const transaction: Partial<Transaction> = {
      id: monthlyTx.id,
      description: monthlyTx.description,
      amount: monthlyTx.amount,
      type: monthlyTx.type,
      transaction_date: monthlyTx.date,
      category_id: monthlyTx.category_id,
      is_installment: is_installment,
      is_recurrent: is_recurrent,
      payment_method: monthlyTx.payment_method,
      total_installments: monthlyTx.total_installments,
    };
    this.uiService.openTransactionModal(transaction);
  }

  onDelete(transaction: MonthlyTransaction) {
    if (
      confirm(
        'Tem certeza que deseja excluir este lançamento? Se for um parcelamento, a transação original e todas as parcelas futuras serão removidas.',
      )
    ) {
      this.deletingId.set(transaction.id);
      this.dataService
        .deleteTransaction(transaction.id)
        .pipe(finalize(() => this.deletingId.set(null)))
        .subscribe({
          next: () => {
            this.dataService.fetchMonthlyView(this.currentDate()).subscribe();
            this.dataService.refreshInstallmentPlans().subscribe();
          },
        });
    }
  }
}
