import { Component, ChangeDetectionStrategy, input, output, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Transaction, PaymentMethod } from '../../models/transaction.model';
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

  paymentMethods: PaymentMethod[] = ['Dinheiro', 'Débito', 'Crédito', 'Carnê', 'Boleto', 'Transferência', 'Financiamento', 'Empréstimo'];

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
    const isInstallment = data?.isInstallment ?? false;
    
    this.transactionForm = this.fb.group({
      id: [data?.id ?? null],
      type: [data?.type ?? 'expense', Validators.required],
      description: [data?.description ?? '', Validators.required],
      amount: [data?.amount ?? null, !isInstallment ? Validators.required : null],
      category_id: [data?.category_id ?? null, Validators.required],
      paymentMethod: [data?.paymentMethod ?? 'Débito', Validators.required],
      date: [data?.date ?? new Date().toISOString().split('T')[0], Validators.required],
      isInstallment: [isInstallment],
      isRecurrent: [data?.isRecurrent ?? false],
      installments: this.fb.group({
        installmentAmount: [isInstallment && data?.amount && data.installments?.totalInstallments ? parseFloat((data.amount / data.installments.totalInstallments).toFixed(2)) : null, isInstallment ? Validators.required : null],
        totalInstallments: [data?.installments?.totalInstallments ?? 2, isInstallment ? [Validators.required, Validators.min(2)] : null],
        startDate: [data?.installments?.startDate ?? new Date().toISOString().split('T')[0]],
        paidInstallments: [data?.installments?.paidInstallments ?? 0]
      })
    });
    this.setupFormListeners();
  }

  private setupFormListeners(): void {
    this.transactionForm.get('type')?.valueChanges.subscribe(type => {
      this.transactionForm.get('category_id')?.reset();
      if (type === 'revenue') {
        this.transactionForm.patchValue({ isInstallment: false, isRecurrent: false, paymentMethod: 'Transferência' });
      } else {
        this.transactionForm.patchValue({ paymentMethod: 'Débito' });
      }
    });

    this.transactionForm.get('isInstallment')?.valueChanges.subscribe(isInstallment => {
      if (isInstallment) {
        this.transactionForm.get('isRecurrent')?.setValue(false, { emitEvent: false });
      }
      this.updateInstallmentValidators();
    });

    this.transactionForm.get('isRecurrent')?.valueChanges.subscribe(isRecurrent => {
      if (isRecurrent) {
        this.transactionForm.get('isInstallment')?.setValue(false, { emitEvent: false });
      }
    });

    (this.transactionForm.get('installments') as FormGroup).valueChanges.subscribe(value => {
      if (this.transactionForm.get('isInstallment')?.value) {
        const numInstallments = value.totalInstallments ?? 0;
        const installmentAmt = value.installmentAmount ?? 0;
        if (numInstallments > 0 && installmentAmt > 0) {
          const totalAmount = parseFloat((installmentAmt * numInstallments).toFixed(2));
          this.transactionForm.get('amount')?.setValue(totalAmount, { emitEvent: false });
        }
      }
    });
  }

  private updateInstallmentValidators(): void {
    const isInstallment = this.transactionForm.get('isInstallment')?.value;
    const installmentGroup = this.transactionForm.get('installments') as FormGroup;
    const installmentAmountControl = installmentGroup.get('installmentAmount');
    const totalInstallmentsControl = installmentGroup.get('totalInstallments');
    const amountControl = this.transactionForm.get('amount');

    if (isInstallment) {
        installmentAmountControl?.setValidators([Validators.required, Validators.min(0.01)]);
        totalInstallmentsControl?.setValidators([Validators.required, Validators.min(2)]);
        amountControl?.clearValidators();
    } else {
        installmentAmountControl?.clearValidators();
        totalInstallmentsControl?.clearValidators();
        amountControl?.setValidators([Validators.required, Validators.min(0.01)]);
    }
    installmentAmountControl?.updateValueAndValidity();
    totalInstallmentsControl?.updateValueAndValidity();
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
      date: formValue.date,
      description: formValue.description,
      category_id: formValue.category_id,
      paymentMethod: formValue.paymentMethod,
      isInstallment: formValue.isInstallment,
      isRecurrent: formValue.isRecurrent,
      installments: formValue.isInstallment ? {
        totalInstallments: formValue.installments.totalInstallments,
        paidInstallments: formValue.installments.paidInstallments,
        startDate: formValue.installments.startDate
      } : undefined
    };
    
    this.saveTransaction.emit(transactionData);
  }
}