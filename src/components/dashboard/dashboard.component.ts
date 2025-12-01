import { Component, ChangeDetectionStrategy, signal, inject, effect, computed } from '@angular/core';
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
  
  currentDate = signal(new Date());
  isLoading = signal(true);
  deletingId = signal<string | null>(null);

  // Computed signal to format the date for the <input type="month">
  monthYearValue = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  });

  constructor() {
    effect(() => {
      this.isLoading.set(true);
      const subscription = this.dataService.fetchMonthlyView(this.currentDate()).subscribe({
        next: () => this.isLoading.set(false),
        error: () => this.isLoading.set(false)
      });
      // Cleanup subscription on effect disposal
      return () => subscription.unsubscribe();
    }, { allowSignalWrites: true });
  }
  
  // Handles the change event from the <input type="month">
  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.value) return;
    const [year, month] = input.value.split('-').map(Number);
    // Set the day to the 2nd to avoid timezone issues that could push it back a day to the previous month.
    this.currentDate.set(new Date(year, month - 1, 2));
  }

  getCategoryName(categoryId: string): string {
    return this.dataService.getCategoryById(categoryId)?.name ?? 'Sem Categoria';
  }

  trackById(index: number, item: MonthlyTransaction): string {
      return item.id;
  }
  
  onEdit(monthlyTx: MonthlyTransaction) {
    const transaction: Partial<Transaction> = {
      id: monthlyTx.id,
      description: monthlyTx.description,
      amount: monthlyTx.amount,
      type: monthlyTx.type,
      transactionDate: monthlyTx.date,
      categoryId: monthlyTx.categoryId,
      isInstallment: monthlyTx.isInstallment ?? false,
      isRecurrent: monthlyTx.isRecurrent ?? false,
      paymentMethod: monthlyTx.paymentMethod,
      totalInstallments: monthlyTx.totalInstallments,
    };
    this.uiService.openTransactionModal(transaction);
  }

  onDelete(transaction: MonthlyTransaction) {
    if (confirm('Tem certeza que deseja excluir este lançamento? Se for um parcelamento, a transação original e todas as parcelas futuras serão removidas.')) {
        this.deletingId.set(transaction.id);
        this.dataService.deleteTransaction(transaction.id).pipe(
          finalize(() => this.deletingId.set(null))
        ).subscribe({
          next: () => {
            this.dataService.fetchMonthlyView(this.currentDate()).subscribe();
            this.dataService.refreshInstallmentPlans().subscribe();
          }
        });
    }
  }
}
