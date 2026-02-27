import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  effect,
  inject,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
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
export class TransactionFormComponent implements OnInit, OnDestroy {
  transactionToEdit = input<Partial<Transaction> | null>(null);
  isSaving = input<boolean>(false);
  closeModal = output<void>();
  saveTransaction = output<Transaction>();

  dataService = inject(DataService);
  private fb = inject(FormBuilder);

  transactionForm!: FormGroup;

  payment_methods: payment_method[] = [
    'Dinheiro',
    'Débito',
    'Crédito',
    'Carnê',
    'Boleto',
    'Transferência',
    'Financiamento',
    'Empréstimo',
    'Débito Automático',
  ];

  // Métodos para controlar desabilitação dos checkboxes
  isEditing(): boolean {
    return !!this.transactionToEdit()?.id;
  }

  private get isOriginalInstallment(): boolean {
    const data = this.transactionToEdit();
    return (data as any)?.isInstallment === true || data?.is_installment === true;
  }

  private get isOriginalRecurrent(): boolean {
    const data = this.transactionToEdit();
    return (data as any)?.isRecurrent === true || data?.is_recurrent === true;
  }

  isReadOnly(): boolean {
    return this.transactionToEdit()?.status === 'PAID';
  }

  // Checkbox de parcelado deve estar desabilitado se:
  // 1. É edição E já é parcelada (não pode mudar status)
  // 2. É recorrente (nunca pode ser parcelada)
  // 3. Modo edição E nenhum dos dois está marcado (ambos false)
  isInstallmentDisabled(): boolean {
    if (!this.transactionForm) return true;

    const isRecurrent = this.transactionForm.get('is_recurrent')?.value ?? false;
    const isInstallment = this.transactionForm.get('is_installment')?.value ?? false;

    // Se é edição e já era parcelada, desabilitar ambos
    if (this.isEditing() && this.isOriginalInstallment) {
      return true;
    }

    // Se é recorrente, sempre desabilitar parcelado
    if (isRecurrent || this.isOriginalRecurrent) {
      return true;
    }

    // Se nenhum dos dois está marcado e é modo edição, desabilitar
    if (!isInstallment && !isRecurrent && this.isEditing()) {
      return true;
    }

    // No modo criação, se ambos estão false, habilitar
    return false;
  }

  // Checkbox de recorrente deve estar desabilitado se:
  // 1. É edição E já é parcelada (não pode mudar status)
  // 2. É parcelada (não pode ser recorrente)
  // 3. Modo edição E nenhum dos dois está marcado (ambos false)
  isRecurrentDisabled(): boolean {
    if (!this.transactionForm) return true;

    const isInstallment = this.transactionForm.get('is_installment')?.value ?? false;
    const isRecurrent = this.transactionForm.get('is_recurrent')?.value ?? false;

    // Se é edição e já era parcelada, desabilitar ambos
    if (this.isEditing() && this.isOriginalInstallment) {
      return true;
    }

    // Se é parcelada (atual ou original), desabilitar recorrente
    if (isInstallment || this.isOriginalInstallment) {
      return true;
    }

    // Se nenhum dos dois está marcado e é modo edição, desabilitar
    if (!isInstallment && !isRecurrent && this.isEditing()) {
      return true;
    }

    // No modo criação, se ambos estão false, habilitar
    return false;
  }

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
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    // Restore body scroll when modal is closed
    document.body.style.overflow = '';
  }

  @HostListener('window:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    this.closeModal.emit();
  }

  handleInstallmentClick(event: Event): void {
    if (this.isInstallmentDisabled()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  handleRecurrentClick(event: Event): void {
    if (this.isRecurrentDisabled()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  handleTypeClick(event: Event, type: 'expense' | 'revenue'): void {
    if (this.isEditing()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.transactionForm.get('type')?.setValue(type);
  }

  private buildForm(data: Partial<Transaction> | null = null): void {
    // Garantir conversão correta para boolean
    // Aceitar ambos os formatos (camelCase e snake_case) como medida de segurança
    const is_installment = (data as any)?.isInstallment === true || data?.is_installment === true;
    const is_recurrent = (data as any)?.isRecurrent === true || data?.is_recurrent === true;

    this.transactionForm = this.fb.group({
      id: [data?.id ?? null],
      type: [data?.type ?? 'expense', Validators.required],
      description: [data?.description ?? '', Validators.required],
      amount: [data?.amount ?? null, !is_installment ? Validators.required : null],
      category_id: [data?.category_id ?? null, Validators.required],
      payment_method: [data?.payment_method ?? 'Débito', Validators.required],
      transaction_date: [
        data?.transaction_date ?? new Date().toISOString().split('T')[0],
        Validators.required,
      ],
      is_installment: [is_installment],
      is_recurrent: [is_recurrent],
      recurrence_start_date: [data?.recurrence_start_date ?? null],
      installments: this.fb.group({
        installmentAmount: [
          is_installment && data?.amount && data.installments?.total_installments
            ? parseFloat((data.amount / data.installments.total_installments).toFixed(2))
            : null,
          is_installment ? Validators.required : null,
        ],
        total_installments: [
          data?.installments?.total_installments ?? 2,
          is_installment ? [Validators.required, Validators.min(2)] : null,
        ],
        start_date: [data?.installments?.start_date ?? new Date().toISOString().split('T')[0]],
        paid_installments: [data?.installments?.paid_installments ?? 0],
      }),
    });

    if (this.isReadOnly()) {
      this.transactionForm.disable();
    }

    this.setupFormListeners();
    // Initial validation state update
    if (is_recurrent) {
      this.transactionForm.get('recurrence_start_date')?.setValidators([Validators.required]);
    }
  }

  private setupFormListeners(): void {
    this.transactionForm.get('type')?.valueChanges.subscribe((type) => {
      // Não permitir alteração de tipo no modo de edição
      if (this.isEditing()) {
        // Restaurar o tipo original
        const originalType = this.transactionToEdit()?.type ?? 'expense';
        this.transactionForm.get('type')?.setValue(originalType, { emitEvent: false });
        return;
      }

      this.transactionForm.get('category_id')?.reset();
      if (type === 'revenue') {
        this.transactionForm.patchValue({
          is_installment: false,
          is_recurrent: false,
          payment_method: 'Transferência',
        });
      } else {
        this.transactionForm.patchValue({ payment_method: 'Débito' });
      }
    });

    this.transactionForm.get('is_installment')?.valueChanges.subscribe((is_installment) => {
      // Prevenir alterações se o campo estiver desabilitado
      if (this.isInstallmentDisabled()) {
        // Restaurar o valor correto baseado no estado
        let restoreValue = false;
        if (this.isEditing() && this.isOriginalInstallment) {
          restoreValue = true; // Restaurar para true se era parcelada originalmente
        } else {
          restoreValue = false; // Caso contrário, manter false
        }
        this.transactionForm.get('is_installment')?.setValue(restoreValue, { emitEvent: false });
        return;
      }

      if (is_installment) {
        this.transactionForm.get('is_recurrent')?.setValue(false);
      }
      this.updateInstallmentValidators();
    });

    this.transactionForm.get('is_recurrent')?.valueChanges.subscribe((is_recurrent) => {
      // Prevenir alterações se o campo estiver desabilitado
      if (this.isRecurrentDisabled()) {
        // Restaurar o valor correto baseado no estado
        let restoreValue = false;
        if (this.isEditing() && this.isOriginalRecurrent) {
          restoreValue = true; // Restaurar para true se era recorrente originalmente
        } else {
          restoreValue = false; // Caso contrário, manter false
        }
        this.transactionForm.get('is_recurrent')?.setValue(restoreValue, { emitEvent: false });
        return;
      }

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

    (this.transactionForm.get('installments') as FormGroup).valueChanges.subscribe((value) => {
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

      installments: formValue.is_installment
        ? {
            total_installments: formValue.installments.total_installments,
            paid_installments: formValue.installments.paid_installments,
            start_date: formValue.installments.start_date,
          }
        : undefined,
    } as Transaction;

    this.saveTransaction.emit(transactionData);
  }
}
