import { Injectable, signal } from '@angular/core';
import { Transaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class UiService {
  isTransactionModalOpen = signal(false);
  editingTransaction = signal<Partial<Transaction> | null>(null);

  // Estado de agrupamento
  isGroupingMode = signal(false);
  selectedTransactions = signal<Set<string>>(new Set());

  openTransactionModal(transaction: Partial<Transaction> | null = null): void {
    // Não permitir abrir modal de edição quando estiver em modo de agrupamento
    if (this.isGroupingMode() && transaction) {
      return;
    }
    this.editingTransaction.set(transaction);
    this.isTransactionModalOpen.set(true);
  }

  closeTransactionModal(): void {
    this.isTransactionModalOpen.set(false);
    this.editingTransaction.set(null);
  }

  toggleGroupingMode(): void {
    const newValue = !this.isGroupingMode();
    this.isGroupingMode.set(newValue);
    if (!newValue) {
      // Resetar seleção quando desabilitar o modo de agrupamento
      this.selectedTransactions.set(new Set());
    }
  }

  toggleTransactionSelection(transactionId: string): void {
    const current = new Set(this.selectedTransactions());
    if (current.has(transactionId)) {
      current.delete(transactionId);
    } else {
      current.add(transactionId);
    }
    this.selectedTransactions.set(current);
  }

  isTransactionSelected(transactionId: string): boolean {
    return this.selectedTransactions().has(transactionId);
  }

  // Modal de Confirmação Genérico
  confirmModal = signal<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  openConfirmModal(
    title: string,
    message: string,
    onConfirm: () => void,
    options: {
      confirmText?: string;
      cancelText?: string;
      type?: 'danger' | 'warning' | 'info';
    } = {},
  ): void {
    this.confirmModal.set({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        this.closeConfirmModal();
      },
      ...options,
    });
  }

  closeConfirmModal(): void {
    this.confirmModal.set(null);
  }
}
