import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  effect,
  computed,
  viewChild,
  ElementRef,
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

  currentDate = signal(new Date());
  isLoading = signal(true);
  deletingId = signal<string | null>(null);
  monthInput = viewChild<ElementRef<HTMLInputElement>>('monthInput');

  // Computed signal to format the date for the <input type="month">
  monthYearValue = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  });

  constructor() {
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

  // Handles the change event from the <input type="month">
  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.value) return;
    const [year, month] = input.value.split('-').map(Number);
    // Set the day to the 2nd to avoid timezone issues that could push it back a day to the previous month.
    this.currentDate.set(new Date(year, month - 1, 2));
  }

  // Navigate to previous or next month
  navigateMonth(direction: number): void {
    if (this.isLoading()) return;
    const current = this.currentDate();
    const newDate = new Date(current.getFullYear(), current.getMonth() + direction, 2);
    this.currentDate.set(newDate);
    this.cdr.markForCheck();
  }

  // Trigger the month picker input
  triggerMonthPicker(): void {
    if (this.isLoading()) return;

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const input = this.monthInput()?.nativeElement;
      if (!input) {
        console.warn('Month input element not found');
        return;
      }

      // Try modern showPicker API first (Chrome 99+)
      try {
        if (typeof input.showPicker === 'function') {
          // Type assertion needed because TypeScript doesn't recognize showPicker return type
          const pickerPromise = input.showPicker() as unknown as Promise<void> | undefined;
          if (pickerPromise && typeof pickerPromise.then === 'function') {
            pickerPromise.catch(() => {
              // If showPicker fails, use fallback
              this.fallbackMonthPicker(input);
            });
            return;
          }
        }
      } catch (error) {
        console.warn('showPicker error, using fallback:', error);
      }

      // Fallback for browsers without showPicker or if it fails
      this.fallbackMonthPicker(input);
    }, 0);
  }

  // Fallback method to open month picker
  private fallbackMonthPicker(input: HTMLInputElement): void {
    // Temporarily make input visible and clickable
    const originalStyle = input.style.cssText;
    input.style.cssText =
      'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 40px; opacity: 0.01; z-index: 9999;';

    input.focus();
    input.click();

    // Restore original style after a short delay
    setTimeout(() => {
      input.style.cssText = originalStyle;
    }, 100);
  }

  getCategoryName(category_id: string): string {
    return this.dataService.getCategoryById(category_id)?.name ?? 'Sem Categoria';
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
      transaction_date: monthlyTx.date,
      category_id: monthlyTx.category_id,
      is_installment: monthlyTx.is_installment ?? false,
      is_recurrent: monthlyTx.is_recurrent ?? false,
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
