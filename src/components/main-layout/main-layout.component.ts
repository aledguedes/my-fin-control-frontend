import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';
import { HeaderComponent } from '../header/header.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { ExclusionModalComponent } from '../exclusion-modal/exclusion-modal.component';
import { DataService } from '../../services/data.service';
import { Transaction } from '../../models/transaction.model';
import { UiService } from '../../services/ui.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    TransactionFormComponent,
    HeaderComponent,
    ConfirmModalComponent,
    ExclusionModalComponent,
  ],
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private dataService = inject(DataService);
  private router = inject(Router);
  uiService = inject(UiService);

  isSaving = signal(false);

  // Logic moved to HeaderComponent

  handleSaveTransaction(transaction: Transaction): void {
    this.isSaving.set(true);
    const isEditing = !!transaction.id;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...newTransactionData } = transaction;

    const saveOperation$ = isEditing
      ? this.dataService.updateTransaction(transaction)
      : this.dataService.addTransaction(newTransactionData as Transaction);

    saveOperation$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        // Refresh relevant data after successful save
        this.dataService.fetchMonthlyView(new Date()).subscribe();
        this.dataService.refreshInstallmentPlans().subscribe();
        this.uiService.closeTransactionModal();

        if (!isEditing && transaction.is_installment) {
          this.router.navigate(['/financial']);
          this.dataService.triggerInstallmentsNavigation();
        }
      },
    });
  }
}
