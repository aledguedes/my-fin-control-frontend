export type ProductUnit = 'un' | 'kg' | 'l' | 'dz' | 'm' | 'cx';

export const productUnits: { value: ProductUnit, label: string }[] = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilo (kg)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'dz', label: 'Dúzia (dz)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'cx', label: 'Caixa (cx)' }
];

export interface ShoppingCategory {
  id: string;
  name: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId?: string;
  unit: ProductUnit;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShoppingListItem {
  id: string;
  productId: string;
  shoppingListId?: string;
  name: string; // Denormalized for easier display
  quantity: number;
  price: number;
  checked: boolean;
  categoryId?: string; // Denormalized for easier grouping
  unit: ProductUnit; // Denormalized for easier display
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: string; // YYYY-MM-DD
  items: ShoppingListItem[];
  status: 'pending' | 'completed';
  completedAt?: string; // YYYY-MM-DD
  totalAmount?: number;
  userId?: string;
  updatedAt?: string;
}
