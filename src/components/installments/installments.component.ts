import {
  Component,
  ChangeDetectionStrategy,
  computed,
  signal,
  inject,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { InstallmentPlan } from '../../models/transaction.model';

type FilterStatus = 'todos' | 'UPCOMING' | 'OVERDUE' | 'PAID';

@Component({
  selector: 'app-installments',
  templateUrl: './installments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class InstallmentsComponent {
  dataService = inject(DataService);
  close = output<void>();

  filterStatus = signal<FilterStatus>('UPCOMING');

  filteredPlans = computed(() => {
    const plans = this.dataService.allInstallmentPlans();
    const filter = this.filterStatus();

    if (filter === 'todos') {
      return plans;
    }
    return plans.filter((p) => p.status === filter);
  });

  getCategoryName(category_id: string): string {
    return this.dataService.getCategoryById(category_id)?.name ?? 'Sem Categoria';
  }

  getPaidAmount(plan: InstallmentPlan): number {
    return plan.paidInstallments * plan.installmentAmount;
  }

  getPendingAmount(plan: InstallmentPlan): number {
    return plan.remainingInstallments * plan.installmentAmount;
  }

  getEndDate(plan: InstallmentPlan): Date {
    const start_date = new Date(plan.startDate);
    const date = new Date(start_date.getFullYear(), start_date.getMonth(), start_date.getDate());
    date.setMonth(date.getMonth() + plan.totalInstallments - 1);
    return date;
  }

  setFilter(status: FilterStatus): void {
    this.filterStatus.set(status);
  }

  getProgressBarWidth(plan: InstallmentPlan): string {
    if (plan.totalInstallments === 0) return '0%';
    const percentage = (plan.paidInstallments / plan.totalInstallments) * 100;
    return `${percentage}%`;
  }
}
