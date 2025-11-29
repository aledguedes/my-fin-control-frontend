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
  date: string; // YYYY-MM-DD
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
  category: Category;
  paymentMethod: PaymentMethod;
}


export interface InstallmentPlanResponse {
    installmentPlans: InstallmentPlan[];
}
export interface InstallmentPlan {
    id: string;
    description: string;
    paymentMethod: PaymentMethod;
    totalAmount: number;
    startDate: string;
    endDate: string;
    totalInstallments: number;
    paidInstallments: number;
    pendingInstallments: number;
    paidAmount: number;
    pendingAmount: number;
    status: 'ativo' | 'concluído' | 'atrasado';
    category: Category;
}

// Fix: Add MonthlyView interface to be exported as a model
export interface MonthlyView {
  year: number;
  month: number;
  transactions: Transaction[];
  summary: {
    totalRevenue: number;
    totalExpense: number;
    balance: number;
  }
}