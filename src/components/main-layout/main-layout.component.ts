import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd, IsActiveMatchOptions } from '@angular/router';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';
import { DataService } from '../../services/data.service';
import { Transaction } from '../../models/transaction.model';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';
import { filter, finalize } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, TransactionFormComponent],
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private router = inject(Router);
  uiService = inject(UiService);
  
  isSaving = signal(false);

  readonly routerLinkActiveOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'exact',
    fragment: 'ignored',
    matrixParams: 'ignored'
  };

  isDashboardActive = signal(this.router.isActive('/dashboard', this.routerLinkActiveOptions));

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
        this.isDashboardActive.set(this.router.isActive('/dashboard', this.routerLinkActiveOptions));
    });
  }

  handleSaveTransaction(transaction: Transaction): void {
    this.isSaving.set(true);
    const isEditing = !!transaction.id;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...newTransactionData } = transaction;

    const saveOperation$ = isEditing
      ? this.dataService.updateTransaction(transaction)
      : this.dataService.addTransaction(newTransactionData);

    saveOperation$.pipe(
      finalize(() => this.isSaving.set(false))
    ).subscribe({
      next: () => {
        // Refresh relevant data after successful save
        this.dataService.fetchMonthlyView(new Date()).subscribe();
        this.dataService.refreshInstallmentPlans().subscribe();
        this.uiService.closeTransactionModal();
        
        if (!isEditing && transaction.isInstallment) {
          this.router.navigate(['/financial']);
          this.dataService.triggerInstallmentsNavigation();
        }
      },
    });
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}