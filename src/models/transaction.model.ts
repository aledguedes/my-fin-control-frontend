export interface FinancialCategory {
  id: string;
  name: string;
  type: 'revenue' | 'expense';
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type payment_method =
  | 'Dinheiro'
  | 'Débito'
  | 'Crédito'
  | 'Carnê'
  | 'Boleto'
  | 'Transferência'
  | 'Financiamento'
  | 'Empréstimo'
  | 'Débito Automático';

export interface InstallmentDetails {
  total_installments: number;
  paid_installments: number;
  start_date: string; // YYYY-MM-DD
}

export interface Transaction {
  id: string;
  type: 'revenue' | 'expense';
  amount: number; // Total amount for installments
  transaction_date: string; // YYYY-MM-DD
  description: string;
  category_id: string;
  payment_method: payment_method;
  is_installment: boolean;
  is_recurrent?: boolean;
  installments?: InstallmentDetails;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  recurrence_start_date?: string;
  total_installments?: number;
  start_date?: string;
  paid_installments?: number;
  status?: 'PAID' | 'UPCOMING' | 'OVERDUE';
}

// This is a derived model, not stored directly. Represents one installment payment.
export interface InstallmentEntry {
  parentTransactionId: string;
  installmentNumber: number;
  total_installments: number;
  dueDate: Date;
  amount: number;
  status: 'PAID' | 'UPCOMING' | 'OVERDUE';
  description: string;
  category: FinancialCategory;
  payment_method: payment_method;
}

// This is a derived model for the installments dashboard, aligned with API
export interface InstallmentPlan {
  id: string;
  description: string;
  totalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  total_installments?: number; // compatibilidade
  paidInstallments: number;
  paid_installments?: number; // compatibilidade
  remainingInstallments: number;
  startDate: string; // YYYY-MM-DD
  status: 'PAID' | 'OVERDUE' | 'UPCOMING';
  type: 'revenue' | 'expense';
  category_id: string;
}

export interface MonthlyTransaction {
  id: string;
  parentId?: string;
  parent_id?: string; // API pode retornar snake_case
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
  date: string; // YYYY-MM-DD
  category_id: string;
  is_installment?: boolean;
  isInstallment?: boolean; // API retorna camelCase
  is_recurrent?: boolean;
  isRecurrent?: boolean; // API retorna camelCase
  installmentNumber?: number;
  installment_number?: number; // API pode retornar snake_case
  total_installments?: number;
  payment_method?: payment_method;
  status?: 'PAID' | 'UPCOMING' | 'OVERDUE';
  paid_installments?: number;
  paidInstallments?: number;
  isHidden?: boolean;
}

export interface MonthlyView {
  year: number;
  month: number;
  transactions: MonthlyTransaction[];
  summary: {
    totalRevenue: number;
    totalExpense: number;
    balance: number;
  };
}
