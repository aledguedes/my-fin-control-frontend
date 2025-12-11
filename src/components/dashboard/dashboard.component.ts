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
  HostListener,
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
  showMonthPicker = signal(false);

  // Month names in Portuguese (3 letters)
  monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Get available years (starting from 2025, up to 10 years ahead)
  availableYears = computed(() => {
    const years: number[] = [];
    const startYear = 2025;
    const endYear = startYear + 10; // 2025 to 2035
    for (let i = startYear; i <= endYear; i++) {
      years.push(i);
    }
    return years;
  });

  // Get current month and year
  currentMonth = computed(() => this.currentDate().getMonth());
  currentYear = computed(() => this.currentDate().getFullYear());

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

  // Toggle custom month picker dropdown
  toggleMonthPicker(): void {
    if (this.isLoading()) return;
    this.showMonthPicker.update((value) => !value);
  }

  // Select month from custom picker
  selectMonth(monthIndex: number): void {
    const newDate = new Date(this.currentYear(), monthIndex, 2);
    this.currentDate.set(newDate);
    this.showMonthPicker.set(false);
    this.cdr.markForCheck();
  }

  // Select year from custom picker
  selectYear(year: number): void {
    const newDate = new Date(year, this.currentMonth(), 2);
    this.currentDate.set(newDate);
    this.showMonthPicker.set(false);
    this.cdr.markForCheck();
  }

  // Close picker when clicking outside (handled in template)
  closeMonthPicker(): void {
    this.showMonthPicker.set(false);
  }

  // Close picker on Escape key
  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    if (this.showMonthPicker()) {
      this.closeMonthPicker();
    }
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
