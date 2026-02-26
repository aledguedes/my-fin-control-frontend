import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';
import { DataService } from '../../services/data.service';

interface TransactionInfo {
  id: string;
  description: string;
  dueDay: number;
  months: string[];
}

@Component({
  selector: 'app-exclusion-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (uiService.isExclusionModalOpen()) {
      <div
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
      >
        <div
          class="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 flex flex-col max-h-[90vh]"
        >
          <!-- Header -->
          <div class="relative p-8 pb-4 shrink-0">
            <div class="flex items-center gap-4">
              <div
                class="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shadow-inner"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-black text-gray-900 tracking-tight">
                  Personalizar Ocultação
                </h3>
                <p class="text-rose-600 font-bold uppercase text-[9px] tracking-[0.2em]">
                  Configuração Individual por Item
                </p>
              </div>
            </div>
            <button
              (click)="uiService.closeExclusionModal()"
              class="absolute top-8 right-8 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar space-y-6">
            @for (tx of transactionsWithSettings(); track tx.id) {
              <div
                class="bg-gray-50 rounded-2xl p-4 border border-gray-100 transition-all hover:shadow-sm group"
              >
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm border border-gray-100 font-black text-xs"
                    >
                      {{ tx.dueDay }}
                    </div>
                    <div>
                      <h4 class="font-black text-gray-800 text-sm tracking-tight">
                        {{ tx.description }}
                      </h4>
                      <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        Vence todo dia {{ tx.dueDay }}
                      </p>
                    </div>
                  </div>

                  <div
                    class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm"
                  >
                    <span class="text-[10px] font-black text-rose-600 uppercase">{{
                      tx.months.length
                    }}</span>
                    <span class="text-[10px] font-bold text-gray-400 uppercase"
                      >Meses marcados</span
                    >
                  </div>
                </div>

                <div
                  class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-1.5"
                >
                  @for (month of getAvailableMonthsForTx(tx); track month.value) {
                    <button
                      (click)="toggleTxMonth(tx.id, month.value)"
                      class="flex flex-col items-center justify-center py-1 px-1 rounded-lg border transition-all"
                      [class.bg-rose-50]="tx.months.includes(month.value)"
                      [class.border-rose-500]="tx.months.includes(month.value)"
                      [class.bg-white]="!tx.months.includes(month.value)"
                      [class.border-gray-100]="!tx.months.includes(month.value)"
                      [class.opacity-50]="month.isPassed && !tx.months.includes(month.value)"
                    >
                      <span
                        class="text-[11px] font-black uppercase tracking-tighter"
                        [class.text-rose-900]="tx.months.includes(month.value)"
                        [class.text-gray-900]="!tx.months.includes(month.value)"
                      >
                        {{ month.label }}
                      </span>
                      @if (month.statusLabel) {
                        <span
                          class="text-[9px] font-black uppercase tracking-tighter opacity-70"
                          [class.text-rose-600]="tx.months.includes(month.value)"
                        >
                          {{ month.statusLabel }}
                        </span>
                      }
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Show More Button -->
            <div class="flex justify-center py-4">
              <button
                (click)="loadMoreMonths()"
                class="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full font-black text-xs transition-all active:scale-95 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                VER MAIS 3 MESES
              </button>
            </div>
          </div>

          <div
            class="bg-gray-50 p-6 flex flex-col sm:flex-row gap-4 border-t border-gray-100 shrink-0"
          >
            <div class="flex-1 flex flex-col justify-center">
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                Resumo Total
              </p>
              <div class="flex items-baseline gap-1.5">
                <span class="text-xl font-black text-gray-900">{{ totalExclusionsCount() }}</span>
                <span class="text-xs font-bold text-gray-500 uppercase tracking-tighter italic"
                  >alterações</span
                >
              </div>
            </div>

            <div class="flex gap-3 sm:w-2/3">
              <button
                (click)="uiService.closeExclusionModal()"
                class="flex-1 px-6 py-3 rounded-xl font-black text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 transition-all active:scale-95 text-xs"
              >
                CANCELAR
              </button>
              <button
                (click)="onConfirm()"
                [disabled]="totalExclusionsCount() === 0"
                class="flex-[2] bg-rose-600 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
              >
                OCULTAR EM LOTE
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
})
export class ExclusionModalComponent {
  uiService = inject(UiService);
  dataService = inject(DataService);

  monthLimit = signal(12);
  txExclusions = signal<Record<string, string[]>>({});

  constructor() {
    // Sync initial state when modal opens
    effect(
      () => {
        if (this.uiService.isExclusionModalOpen()) {
          const ids = Array.from(this.uiService.selectedTransactions());
          const currentExclusions = this.txExclusions();
          const newExclusions: Record<string, string[]> = { ...currentExclusions };

          // Ensure every selected ID is in the map
          ids.forEach((id) => {
            if (!newExclusions[id]) {
              // Default selection: Current month if not passed, else next month
              const tx = this.getTxInfo(id);
              if (tx) {
                const baseDate = new Date();
                const currentMonthStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;

                if (baseDate.getDate() <= tx.dueDay) {
                  newExclusions[id] = [currentMonthStr];
                } else {
                  const nextMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
                  const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
                  newExclusions[id] = [nextMonthStr];
                }
              }
            }
          });

          // Remove IDs no longer selected
          Object.keys(newExclusions).forEach((key) => {
            if (!ids.includes(key)) delete newExclusions[key];
          });

          if (JSON.stringify(currentExclusions) !== JSON.stringify(newExclusions)) {
            this.txExclusions.set(newExclusions);
          }
        }
      },
      { allowSignalWrites: true },
    );
  }

  transactionsWithSettings = computed(() => {
    const ids = Array.from(this.uiService.selectedTransactions());
    const settings = this.txExclusions();

    return ids.map((id) => {
      const info = this.getTxInfo(id);
      return {
        id,
        description: info?.description || 'Transação',
        dueDay: info?.dueDay || 1,
        months: settings[id] || [],
      } as TransactionInfo;
    });
  });

  totalExclusionsCount = computed(() => {
    let count = 0;
    Object.values(this.txExclusions()).forEach((months) => (count += months.length));
    return count;
  });

  private getTxInfo(id: string) {
    const view = this.dataService.currentMonthlyView();
    if (!view) return null;
    const tx = view.transactions.find((t) => t.id === id);
    if (!tx) return null;

    // Extract due day from string date or use current
    const dateObj = new Date(tx.date);
    return {
      description: tx.description,
      dueDay: !isNaN(dateObj.getDate()) ? dateObj.getDate() : 1,
    };
  }

  getAvailableMonthsForTx(tx: TransactionInfo) {
    const baseDate = new Date();
    const currentYear = baseDate.getFullYear();
    const currentMonth = baseDate.getMonth();
    const today = baseDate.getDate();

    // We start from January of the current year (retroactive within current year)
    // up to the limit signal.
    const months = [];
    const limit = this.monthLimit();

    for (let i = 0; i < limit; i++) {
      // Start from Month 0 (January) of current year
      const d = new Date(currentYear, i, 1);
      const monthIndex = d.getMonth();
      const year = d.getFullYear();

      const value = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });

      // Logic: if current year and month is current month, check due day
      const isCurrentMonth = monthIndex === currentMonth && year === currentYear;
      const isPassed = isCurrentMonth
        ? today > tx.dueDay
        : year < currentYear || (year === currentYear && monthIndex < currentMonth);

      let statusLabel = '';
      if (isCurrentMonth) statusLabel = 'Hoje';
      else if (isPassed) statusLabel = 'Retro';

      months.push({
        value,
        label: `${label} ${String(year).slice(2)}`,
        isPassed,
        isCurrent: isCurrentMonth,
        statusLabel,
      });
    }
    return months;
  }

  toggleTxMonth(txId: string, monthValue: string): void {
    const current = { ...this.txExclusions() };
    const months = current[txId] ? [...current[txId]] : [];

    if (months.includes(monthValue)) {
      current[txId] = months.filter((m) => m !== monthValue);
    } else {
      current[txId] = [...months, monthValue];
    }

    this.txExclusions.set(current);
  }

  loadMoreMonths(): void {
    this.monthLimit.update((v) => v + 3);
  }

  onConfirm(): void {
    const settings = this.txExclusions();
    const batchItems = Object.entries(settings)
      .filter(([_, months]) => months.length > 0)
      .map(([id, months]) => ({
        id,
        month: months,
        action: 'add' as const,
      }));

    if (batchItems.length === 0) return;

    this.dataService.excludeRecurrentBatch(batchItems).subscribe({
      next: () => {
        const view = this.dataService.currentMonthlyView();
        if (view) {
          // Trigger refresh if needed
        }
        this.uiService.toggleExclusionMode();
        this.uiService.closeExclusionModal();
      },
    });
  }
}
