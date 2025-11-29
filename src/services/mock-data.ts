import { Transaction, Category } from '../models/transaction.model';
import { ShoppingList, ShoppingCategory, Product } from '../models/shopping.model';

export const MOCK_USERS = [
  { id: 'user-1', username: 'admin', password: 'admin', email: 'admin@test.com' },
  { id: 'user-2', username: 'alex', password: '123', email: 'alexandredguedes@gmail.com' },
];

export const MOCK_FINANCIAL_CATEGORIES: Category[] = [
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
    id: 't1', type: 'revenue', amount: 5000, date: '2024-07-05',
    description: 'Salário Mensal', category_id: 'c1', paymentMethod: 'Transferência', isInstallment: false,
  },
  // Despesas à vista
  {
    id: 't2', type: 'expense', amount: 1500, date: '2024-07-10',
    description: 'Aluguel', category_id: 'c3', paymentMethod: 'Boleto', isInstallment: false,
  },
  {
    id: 't3', type: 'expense', amount: 800, date: '2024-07-15',
    description: 'Compras do Mês', category_id: 'c4', paymentMethod: 'Crédito', isInstallment: false,
  },
  // Despesa Parcelada
  {
    id: 't4', type: 'expense', amount: 2400, date: '2024-05-20',
    description: 'Curso de Inglês', category_id: 'c7', paymentMethod: 'Carnê', isInstallment: true,
    installments: { totalInstallments: 12, paidInstallments: 0, startDate: '2024-06-10' },
  },
   // Despesa Recorrente
  {
    id: 't7', type: 'expense', amount: 49.90, date: '2024-07-20',
    description: 'Assinatura Streaming', category_id: 'c6', paymentMethod: 'Crédito', isInstallment: false, isRecurrent: true,
  },
];

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
    { id: 'p1', name: 'Arroz Integral 5kg', category_id: 'sc1', unit: 'un' },
    { id: 'p2', name: 'Feijão Carioca 1kg', category_id: 'sc1', unit: 'un' },
    { id: 'p8', name: 'Óleo de Soja 900ml', category_id: 'sc1', unit: 'un' },
    { id: 'p9', name: 'Açúcar Refinado 1kg', category_id: 'sc1', unit: 'un' },
    { id: 'p10', name: 'Sal Refinado 1kg', category_id: 'sc1', unit: 'un' },
    { id: 'p11', name: 'Café em Pó 500g', category_id: 'sc1', unit: 'un' },
    { id: 'p12', name: 'Molho de Tomate', category_id: 'sc1', unit: 'un' },
    { id: 'p24', name: 'Iogurte Natural', category_id: 'sc1', unit: 'un' },

    // Higiene
    { id: 'p3', name: 'Sabonete', category_id: 'sc2', unit: 'un' },
    { id: 'p6', name: 'Shampoo', category_id: 'sc2', unit: 'un' },
    { id: 'p13', name: 'Condicionador', category_id: 'sc2', unit: 'un' },
    { id: 'p14', name: 'Pasta de Dente', category_id: 'sc2', unit: 'un' },
    { id: 'p15', name: 'Papel Higiênico 4 rolos', category_id: 'sc2', unit: 'un' },

    // Hortifruti
    { id: 'p4', name: 'Maçã', category_id: 'sc3', unit: 'kg' },
    { id: 'p7', name: 'Alface Crespa', category_id: 'sc3', unit: 'un' },
    // Fix: Added missing 'unit' property and corrected 'category_id'.
    { id: 'p16', name: 'Banana Prata', category_id: 'sc3', unit: 'kg' },
    { id: 'p17', name: 'Tomate', category_id: 'sc3', unit: 'kg' },
    { id: 'p18', name: 'Cebola', category_id: 'sc3', unit: 'kg' },
    { id: 'p19', name: 'Batata', category_id: 'sc3', unit: 'kg' },

    // Açougue e Frios
    { id: 'p5', name: 'Patinho moído', category_id: 'sc4', unit: 'kg' },
    { id: 'p20', name: 'Filé de Frango', category_id: 'sc4', unit: 'kg' },
    { id: 'p21', name: 'Queijo Mussarela', category_id: 'sc4', unit: 'kg' },
    { id: 'p22', name: 'Presunto', category_id: 'sc4', unit: 'kg' },
    { id: 'p23', name: 'Ovos', category_id: 'sc4', unit: 'dz' },

    // Padaria
    { id: 'p25', name: 'Pão Francês', category_id: 'sc5', unit: 'un' },
    { id: 'p26', name: 'Pão de Forma', category_id: 'sc5', unit: 'un' },
    { id: 'p27', name: 'Manteiga', category_id: 'sc5', unit: 'un' },

    // Bebidas
    { id: 'p28', name: 'Leite Integral 1L', category_id: 'sc6', unit: 'l' },
    { id: 'p29', name: 'Suco de Laranja 1L', category_id: 'sc6', unit: 'l' },
    { id: 'p30', name: 'Água Mineral 1.5L', category_id: 'sc6', unit: 'l' },
    { id: 'p31', name: 'Refrigerante 2L', category_id: 'sc6', unit: 'l' },

    // Limpeza
    { id: 'p32', name: 'Detergente 500ml', category_id: 'sc7', unit: 'un' },
    { id: 'p33', name: 'Sabão em Pó 1kg', category_id: 'sc7', unit: 'un' },
    { id: 'p34', name: 'Água Sanitária 1L', category_id: 'sc7', unit: 'l' },

    // Congelados
    { id: 'p35', name: 'Pizza Congelada', category_id: 'sc8', unit: 'un' },
    { id: 'p36', name: 'Sorvete 2L', category_id: 'sc8', unit: 'un' },
    { id: 'p37', name: 'Pão de Queijo', category_id: 'sc8', unit: 'un' },
];

export const MOCK_SHOPPING_LISTS: ShoppingList[] = [
    {
        id: 'sl1', name: 'Compras da Semana', status: 'pending', created_at: '2024-07-22',
        items: [
            { id: 'i1', productId: 'p1', name: 'Arroz Integral 5kg', quantity: 1, price: 25.50, checked: true, category_id: 'sc1', unit: 'un' },
            { id: 'i2', productId: 'p4', name: 'Maçã', quantity: 1.5, price: 8.99, checked: false, category_id: 'sc3', unit: 'kg' },
        ]
    },
    {
        id: 'sl2', name: 'Compras de Junho', status: 'completed', created_at: '2024-06-15', completedAt: '2024-06-16', totalAmount: 157.80,
        items: []
    }
];