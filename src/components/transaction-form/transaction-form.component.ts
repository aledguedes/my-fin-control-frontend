import { Component, ChangeDetectionStrategy, input, output, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Transaction, payment_method } from '../../models/transaction.model';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';

@Component({
  selector: 'app-transaction-form',
  templateUrl: './transaction-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, CurrencyMaskDirective],
})
export class TransactionFormComponent implements OnInit {
  transactionToEdit = input<Partial<Transaction> | null>(null);
  isSaving = input<boolean>(false);
  closeModal = output<void>();
  saveTransaction = output<Transaction>();

  dataService = inject(DataService);
  private fb = inject(FormBuilder);
  
  transactionForm!: FormGroup;

  payment_methods: payment_method[] = ['Dinheiro', 'Débito', 'Crédito', 'Carnê', 'Boleto', 'Transferência', 'Financiamento', 'Empréstimo'];

  constructor() {
    effect(() => {
      const data = this.transactionToEdit();
      if (this.transactionForm) {
        this.buildForm(data);
      }
    });
  }

  ngOnInit(): void {
    this.buildForm(this.transactionToEdit());
  }

  private buildForm(data: Partial<Transaction> | null = null): void {
    const is_installment = data?.is_installment ?? false;
    const is_recurrent = data?.is_recurrent ?? false;
    
    this.transactionForm = this.fb.group({
      id: [data?.id ?? null],
      type: [data?.type ?? 'expense', Validators.required],
      description: [data?.description ?? '', Validators.required],
      amount: [data?.amount ?? null, !is_installment ? Validators.required : null],
      category_id: [data?.category_id ?? null, Validators.required],
      payment_method: [data?.payment_method ?? 'Débito', Validators.required],
      transaction_date: [data?.transaction_date ?? new Date().toISOString().split('T')[0], Validators.required],
      is_installment: [is_installment],
      is_recurrent: [is_recurrent],
      recurrence_start_date: [data?.recurrence_start_date ?? null], 
      installments: this.fb.group({
        installmentAmount: [is_installment && data?.amount && data.installments?.total_installments ? parseFloat((data.amount / data.installments.total_installments).toFixed(2)) : null, is_installment ? Validators.required : null],
        total_installments: [data?.installments?.total_installments ?? 2, is_installment ? [Validators.required, Validators.min(2)] : null],
        start_date: [data?.installments?.start_date ?? new Date().toISOString().split('T')[0]],
        paid_installments: [data?.installments?.paid_installments ?? 0]
      })
    });
    this.setupFormListeners();
    // Initial validation state update
    if (is_recurrent) {
        this.transactionForm.get('recurrence_start_date')?.setValidators([Validators.required]);
    }
  }

  private setupFormListeners(): void {
    this.transactionForm.get('type')?.valueChanges.subscribe(type => {
      this.transactionForm.get('category_id')?.reset();
      if (type === 'revenue') {
        this.transactionForm.patchValue({ is_installment: false, is_recurrent: false, payment_method: 'Transferência' });
      } else {
        this.transactionForm.patchValue({ payment_method: 'Débito' });
      }
    });

    this.transactionForm.get('is_installment')?.valueChanges.subscribe(is_installment => {
      if (is_installment) {
        this.transactionForm.get('is_recurrent')?.setValue(false);
      }
      this.updateInstallmentValidators();
    });

    this.transactionForm.get('is_recurrent')?.valueChanges.subscribe(is_recurrent => {
      const recurrenceDateControl = this.transactionForm.get('recurrence_start_date');
      if (is_recurrent) {
        this.transactionForm.get('is_installment')?.setValue(false);
        recurrenceDateControl?.setValidators([Validators.required]);
        // Set default date if empty when enabling
        if (!recurrenceDateControl?.value) {
            recurrenceDateControl?.setValue(new Date().toISOString().split('T')[0]);
        }
      } else {
        recurrenceDateControl?.clearValidators();
        recurrenceDateControl?.setValue(null);
      }
      recurrenceDateControl?.updateValueAndValidity();
    });

    (this.transactionForm.get('installments') as FormGroup).valueChanges.subscribe(value => {
      if (this.transactionForm.get('is_installment')?.value) {
        const numInstallments = value.total_installments ?? 0;
        const installmentAmt = value.installmentAmount ?? 0;
        if (numInstallments > 0 && installmentAmt > 0) {
          const totalAmount = parseFloat((installmentAmt * numInstallments).toFixed(2));
          this.transactionForm.get('amount')?.setValue(totalAmount, { emitEvent: false });
        }
      }
    });
  }

  private updateInstallmentValidators(): void {
    const is_installment = this.transactionForm.get('is_installment')?.value;
    const installmentGroup = this.transactionForm.get('installments') as FormGroup;
    const installmentAmountControl = installmentGroup.get('installmentAmount');
    const total_installmentsControl = installmentGroup.get('total_installments');
    const amountControl = this.transactionForm.get('amount');

    if (is_installment) {
        installmentAmountControl?.setValidators([Validators.required, Validators.min(0.01)]);
        total_installmentsControl?.setValidators([Validators.required, Validators.min(2)]);
        amountControl?.clearValidators();
    } else {
        installmentAmountControl?.clearValidators();
        total_installmentsControl?.clearValidators();
        amountControl?.setValidators([Validators.required, Validators.min(0.01)]);
    }
    installmentAmountControl?.updateValueAndValidity();
    total_installmentsControl?.updateValueAndValidity();
    amountControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    const formValue = this.transactionForm.getRawValue();
    const transactionData: Transaction = {
      id: formValue.id || undefined!,
      type: formValue.type,
      amount: formValue.amount,
      transaction_date: formValue.transaction_date,
      description: formValue.description,
      category_id: formValue.category_id,
      payment_method: formValue.payment_method,
      is_installment: formValue.is_installment,
      is_recurrent: formValue.is_recurrent,
      // Map recurrence_start_date to model property (assuming model uses camelCase or I can add the snake_case one)
      recurrence_start_date: formValue.is_recurrent ? formValue.recurrence_start_date : undefined,
      
      installments: formValue.is_installment ? {
        total_installments: formValue.installments.total_installments,
        paid_installments: formValue.installments.paid_installments,
        start_date: formValue.installments.start_date
      } : undefined
    } as Transaction;
    
    this.saveTransaction.emit(transactionData);
  }
}
