import { Transaction, FinancialCategory } from '../models/transaction.model';
import { ShoppingList, ShoppingCategory, Product, ShoppingListItem } from '../models/shopping.model';

export const MOCK_USERS = [
  { id: 'user-1', username: 'admin', password: 'admin', email: 'admin@test.com' },
  { id: 'user-2', username: 'alex', password: '123', email: 'alexandredguedes@gmail.com' },
];

export const MOCK_FINANCIAL_CATEGORIES: FinancialCategory[] = [
  { id: 'c1', name: 'Salário', type: 'revenue' },
  { id: 'c2', name: 'Freelance', type: 'revenue' },
  { id: 'c3', name: 'Moradia', type: 'expense' },
  { id: 'c4', name: 'Alimentação', type: 'expense' },
  { id: 'c5', name: 'Transporte', type: 'expense' },
  { id: 'c6', name: 'Lazer', type: 'expense' },
  { id: 'c7', name: 'Educação', type: 'expense' },
  { id: 'c8', name: 'Saúde', type: 'expense' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  // Receitas
  {
    id: 't1', type: 'revenue', amount: 5000, transactionDate: '2024-07-05',
    description: 'Salário Mensal', categoryId: 'c1', paymentMethod: 'Transferência', isInstallment: false,
  },
  // Despesas à vista
  {
    id: 't2', type: 'expense', amount: 1500, transactionDate: '2024-07-10',
    description: 'Aluguel', categoryId: 'c3', paymentMethod: 'Boleto', isInstallment: false,
  },
  {
    id: 't3', type: 'expense', amount: 800, transactionDate: '2024-07-15',
    description: 'Compras do Mês', categoryId: 'c4', paymentMethod: 'Crédito', isInstallment: false,
  },
  // Despesa Parcelada
  {
    id: 't4', type: 'expense', amount: 2400, transactionDate: '2024-05-20',
    description: 'Curso de Inglês', categoryId: 'c7', paymentMethod: 'Carnê', isInstallment: true,
    installments: { totalInstallments: 12, paidInstallments: 0, startDate: '2024-06-10' },
  },
   // Despesa Recorrente
  {
    id: 't7', type: 'expense', amount: 49.90, transactionDate: '2024-07-20',
    description: 'Assinatura Streaming', categoryId: 'c6', paymentMethod: 'Crédito', isInstallment: false, isRecurrent: true,
  },
] as Transaction[];

export const MOCK_SHOPPING_CATEGORIES: ShoppingCategory[] = [
    { id: 'sc1', name: 'Mercearia' },
    { id: 'sc2', name: 'Higiene' },
    { id: 'sc3', name: 'Hortifruti' },
    { id: 'sc4', name: 'Açougue e Frios' },
    { id: 'sc5', name: 'Padaria' },
    { id: 'sc6', name: 'Bebidas' },
    { id: 'sc7', name: 'Limpeza' },
    { id: 'sc8', name: 'Congelados' },
    { id: 'sc9', name: 'Outros' },
];

export const MOCK_PRODUCTS: Product[] = [
    // Mercearia
    { id: 'p1', name: 'Arroz Integral 5kg', categoryId: 'sc1', unit: 'un' },
    { id: 'p2', name: 'Feijão Carioca 1kg', categoryId: 'sc1', unit: 'un' },
    { id: 'p8', name: 'Óleo de Soja 900ml', categoryId: 'sc1', unit: 'un' },
    { id: 'p9', name: 'Açúcar Refinado 1kg', categoryId: 'sc1', unit: 'un' },
    { id: 'p10', name: 'Sal Refinado 1kg', categoryId: 'sc1', unit: 'un' },
    { id: 'p11', name: 'Café em Pó 500g', categoryId: 'sc1', unit: 'un' },
    { id: 'p12', name: 'Molho de Tomate', categoryId: 'sc1', unit: 'un' },
    { id: 'p24', name: 'Iogurte Natural', categoryId: 'sc1', unit: 'un' },

    // Higiene
    { id: 'p3', name: 'Sabonete', categoryId: 'sc2', unit: 'un' },
    { id: 'p6', name: 'Shampoo', categoryId: 'sc2', unit: 'un' },
    { id: 'p13', name: 'Condicionador', categoryId: 'sc2', unit: 'un' },
    { id: 'p14', name: 'Pasta de Dente', categoryId: 'sc2', unit: 'un' },
    { id: 'p15', name: 'Papel Higiênico 4 rolos', categoryId: 'sc2', unit: 'un' },

    // Hortifruti
    { id: 'p4', name: 'Maçã', categoryId: 'sc3', unit: 'kg' },
    { id: 'p7', name: 'Alface Crespa', categoryId: 'sc3', unit: 'un' },
    { id: 'p16', name: 'Banana Prata', categoryId: 'sc3', unit: 'kg' },
    { id: 'p17', name: 'Tomate', categoryId: 'sc3', unit: 'kg' },
    { id: 'p18', name: 'Cebola', categoryId: 'sc3', unit: 'kg' },
    { id: 'p19', name: 'Batata', categoryId: 'sc3', unit: 'kg' },

    // Açougue e Frios
    { id: 'p5', name: 'Patinho moído', categoryId: 'sc4', unit: 'kg' },
    { id: 'p20', name: 'Filé de Frango', categoryId: 'sc4', unit: 'kg' },
    { id: 'p21', name: 'Queijo Mussarela', categoryId: 'sc4', unit: 'kg' },
    { id: 'p22', name: 'Presunto', categoryId: 'sc4', unit: 'kg' },
    { id: 'p23', name: 'Ovos', categoryId: 'sc4', unit: 'dz' },

    // Padaria
    { id: 'p25', name: 'Pão Francês', categoryId: 'sc5', unit: 'un' },
    { id: 'p26', name: 'Pão de Forma', categoryId: 'sc5', unit: 'un' },
    { id: 'p27', name: 'Manteiga', categoryId: 'sc5', unit: 'un' },

    // Bebidas
    { id: 'p28', name: 'Leite Integral 1L', categoryId: 'sc6', unit: 'l' },
    { id: 'p29', name: 'Suco de Laranja 1L', categoryId: 'sc6', unit: 'l' },
    { id: 'p30', name: 'Água Mineral 1.5L', categoryId: 'sc6', unit: 'l' },
    { id: 'p31', name: 'Refrigerante 2L', categoryId: 'sc6', unit: 'l' },

    // Limpeza
    { id: 'p32', name: 'Detergente 500ml', categoryId: 'sc7', unit: 'un' },
    { id: 'p33', name: 'Sabão em Pó 1kg', categoryId: 'sc7', unit: 'un' },
    { id: 'p34', name: 'Água Sanitária 1L', categoryId: 'sc7', unit: 'l' },

    // Congelados
    { id: 'p35', name: 'Pizza Congelada', categoryId: 'sc8', unit: 'un' },
    { id: 'p36', name: 'Sorvete 2L', categoryId: 'sc8', unit: 'un' },
    { id: 'p37', name: 'Pão de Queijo', categoryId: 'sc8', unit: 'un' },
];

export const MOCK_SHOPPING_LISTS: ShoppingList[] = [
    {
        id: 'sl1', name: 'Compras da Semana', status: 'pending', createdAt: '2024-07-22',
        items: [
            { id: 'i1', productId: 'p1', name: 'Arroz Integral 5kg', quantity: 1, price: 25.50, checked: true, categoryId: 'sc1', unit: 'un' },
            { id: 'i2', productId: 'p4', name: 'Maçã', quantity: 1.5, price: 8.99, checked: false, categoryId: 'sc3', unit: 'kg' },
        ] as ShoppingListItem[]
    },
    {
        id: 'sl2', name: 'Compras de Junho', status: 'completed', createdAt: '2024-06-15', completedAt: '2024-06-16', totalAmount: 157.80,
        items: []
    }
];
