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
import { finalize, forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class DashboardComponent {
  dataService = inject(DataService);
  uiService = inject(UiService);
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

    let transactions = view.transactions;

    // Se o modo de agrupamento estiver ativo, mostrar apenas despesas
    if (this.uiService.isGroupingMode()) {
      transactions = transactions.filter((t) => t.type === 'expense');
    }

    // Se o modo de exclusão estiver ativo, mostrar apenas recorrentes
    if (this.uiService.isExclusionMode()) {
      transactions = transactions.filter((t) => t.is_recurrent || t.isRecurrent);
    }

    return this.showAllTransactions() ? transactions : transactions.slice(0, 5);
  });

  // Valor total das despesas agrupadas selecionadas
  groupedAmount = computed(() => {
    if (!this.uiService.isGroupingMode()) {
      return 0;
    }

    const view = this.dataService.currentMonthlyView();
    if (!view) return 0;

    const selectedIds = this.uiService.selectedTransactions();
    const selectedTransactions = view.transactions.filter(
      (t) => t.type === 'expense' && selectedIds.has(t.id),
    );

    return selectedTransactions.reduce((sum, t) => sum + t.amount, 0);
  });

  // Quantidade de transações recorrentes selecionadas para exclusão
  exclusionCount = computed(() => {
    if (!this.uiService.isExclusionMode()) {
      return 0;
    }
    return this.uiService.selectedTransactions().size;
  });

  constructor() {
    // Fetch monthly view when date or showHidden changes
    effect(
      () => {
        this.isLoading.set(true);
        const subscription = this.dataService
          .fetchMonthlyView(this.currentDate(), this.uiService.showHiddenItems())
          .subscribe({
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

  toggleGroupingMode(): void {
    this.uiService.toggleGroupingMode();
  }

  toggleShowHiddenItems(): void {
    this.uiService.toggleShowHiddenItems();
  }

  onRestoreTransaction(transaction: MonthlyTransaction): void {
    const monthStr = `${transaction.date.split('-')[0]}-${transaction.date.split('-')[1]}`;

    this.uiService.openConfirmModal(
      'Restaurar Lançamento',
      `Deseja restaurar "${transaction.description}" para o mês ${monthStr}?`,
      () => {
        this.dataService.excludeRecurrentMonth(transaction.id, monthStr, 'remove').subscribe({
          next: () => {
            this.dataService
              .fetchMonthlyView(this.currentDate(), this.uiService.showHiddenItems())
              .subscribe();
          },
        });
      },
      { type: 'info', confirmText: 'Restaurar' },
    );
  }

  handleTransactionClick(transaction: MonthlyTransaction): void {
    if (this.uiService.isGroupingMode()) {
      // No modo de agrupamento, apenas despesas podem ser selecionadas
      if (transaction.type === 'expense') {
        this.uiService.toggleTransactionSelection(transaction.id);
      }
    } else {
      // Fora do modo de agrupamento, permite edição
      this.onEdit(transaction);
    }
  }

  onEdit(monthlyTx: MonthlyTransaction) {
    // Não permitir edição quando estiver em modo de agrupamento
    if (this.uiService.isGroupingMode()) {
      return;
    }
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
    this.uiService.openConfirmModal(
      'Excluir Lançamento',
      'Tem certeza que deseja excluir este lançamento? Se for um parcelamento, a transação original e todas as parcelas futuras serão removidas.',
      () => {
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
      },
      { type: 'danger', confirmText: 'Confirmar Exclusão' },
    );
  }

  toggleExclusionMode(): void {
    this.uiService.toggleExclusionMode();
  }

  confirmExclusion(): void {
    const selectedIds = Array.from(this.uiService.selectedTransactions());

    if (selectedIds.length === 0) {
      this.dataService['notificationService'].show('Selecione pelo menos uma conta.', 'error');
      return;
    }

    this.uiService.openExclusionModal();
  }

  onTogglePayment(transaction: MonthlyTransaction) {
    const parentId = transaction.parent_id || transaction.parentId || transaction.id;
    const currentPaid = transaction.paid_installments ?? 0;
    const clickedInstallment = transaction.installment_number ?? 1;

    // Se já está pago, o clique no botão de "check" pode significar estorno (voltar para a anterior)
    if (transaction.status === 'PAID') {
      this.uiService.openConfirmModal(
        'Estornar Pagamento',
        'Deseja estornar o pagamento deste mês? O contador de parcelas pagas será reduzido.',
        () => {
          this.dataService.updatePayment(parentId, clickedInstallment - 1).subscribe({
            next: () => this.dataService.fetchMonthlyView(this.currentDate()).subscribe(),
          });
        },
        { type: 'warning', confirmText: 'Sim, Estornar' },
      );
      return;
    }

    const processPayment = () => {
      this.dataService.updatePayment(parentId, clickedInstallment).subscribe({
        next: () => {
          this.dataService.fetchMonthlyView(this.currentDate()).subscribe();
        },
      });
    };

    // Lógica do Alerta de Salto
    if (clickedInstallment > currentPaid + 1) {
      this.uiService.openConfirmModal(
        'Atenção: Salto de Parcelas',
        'Existem meses anteriores em atraso ou pendentes para esta conta. Ao confirmar o pagamento deste mês, todos os meses anteriores também serão marcados como pagos. Deseja continuar?',
        processPayment,
        { type: 'danger', confirmText: 'Confirmar Pagamento' },
      );
    } else {
      // Confirmação simples para pagamento comum
      this.uiService.openConfirmModal(
        'Confirmar Pagamento',
        `Deseja marcar o pagamento da parcela ${clickedInstallment} como concluído?`,
        processPayment,
        { type: 'info', confirmText: 'Marcar como Pago' },
      );
    }
  }
}
