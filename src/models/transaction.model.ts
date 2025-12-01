export interface CategoryResponse {
  categories: Category[];
}

export interface Category {
  id: string;
  name: string;
  type: 'revenue' | 'expense';
  userId?: string;
  created_at?: string;
  updatedAt?: string;
}

export type PaymentMethod = 'Dinheiro' | 'Débito' | 'Crédito' | 'Carnê' | 'Boleto' | 'Transferência' | 'Financiamento' | 'Empréstimo';

export interface InstallmentDetails {
  totalInstallments: number;
  paidInstallments: number;
  startDate: string; // YYYY-MM-DD
}

export interface Transaction {
  id: string;
  type: 'revenue' | 'expense';
  amount: number; // Total amount for installments
  transactionDate: string; // YYYY-MM-DD
  description: string;
  category_id: string;
  paymentMethod: PaymentMethod;
  isInstallment: boolean;
  isRecurrent?: boolean;
  installments?: InstallmentDetails;
  userId?: string;
  created_at?: string;
  updatedAt?: string;
  recurrenceStartDate?: string;
  totalInstallments?: number;
  startDate?: string;
  paidInstallments?: number;
}

// This is a derived model, not stored directly. Represents one installment payment.
export interface InstallmentEntry {
  parentTransactionId: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: Date;
  amount: number;
  status: 'paid' | 'pending';
  description: string;
  category: FinancialCategory;
  paymentMethod: PaymentMethod;
}

// This is a derived model for the installments dashboard, aligned with API
export interface InstallmentPlan {
    id: string;
    description: string;
    totalAmount: number;
    installmentAmount: number;
    totalInstallments: number;
    paidInstallments: number;
    remainingInstallments: number;
    startDate: string; // YYYY-MM-DD
    status: 'ativo' | 'atrasado' | 'concluído';
    type: 'revenue' | 'expense';
    categoryId: string;
}

export interface MonthlyTransaction {
  id: string;
  parentId?: string;
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
  date: string; // YYYY-MM-DD
  categoryId: string;
  isInstallment?: boolean;
  isRecurrent?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  paymentMethod?: PaymentMethod;
}

export interface MonthlyView {
  year: number;
  month: number;
  transactions: MonthlyTransaction[];
  summary: {
    totalRevenue: number;
    totalExpense: number;
    balance: number;
  }
}
