import {
  Component,
  ChangeDetectionStrategy,
  signal,
  effect,
  inject,
  computed,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { InstallmentsComponent } from '../installments/installments.component';
import { CategoriesComponent } from '../categories/categories.component';
import { DataService } from '../../services/data.service';
import { UiService } from '../../services/ui.service';

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
  showMonthPicker = signal(false);

  dataService = inject(DataService);
  private uiService = inject(UiService);
  private cdr = inject(ChangeDetectorRef);

  // Month names for picker
  monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Available years (2025-2035)
  availableYears = computed(() => {
    const years: number[] = [];
    const startYear = 2026;
    const endYear = startYear + 10;
    for (let i = startYear; i <= endYear; i++) {
      years.push(i);
    }
    return years;
  });

  currentMonth = computed(() => this.currentDate().getMonth());
  currentYear = computed(() => this.currentDate().getFullYear());

  constructor() {
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

  isPreviousMonthAllowed = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    return year > 2026 || (year === 2026 && month > 0);
  });

  navigateMonth(direction: number): void {
    // Safety check: prevent navigating before January 2026
    if (direction < 0 && !this.isPreviousMonthAllowed()) {
      return;
    }

    const current = this.currentDate();
    const newDate = new Date(current.getFullYear(), current.getMonth() + direction, 2);

    // Double check to ensure we don't go below Jan 2026
    if (newDate.getFullYear() < 2026) {
      return;
    }

    this.currentDate.set(newDate);
    this.cdr.markForCheck();
  }

  toggleMonthPicker(): void {
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
}
