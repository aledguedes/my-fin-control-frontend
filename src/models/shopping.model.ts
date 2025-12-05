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
  category_id?: string;
  unit: ProductUnit;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
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

export interface ShoppingListResponse {
  list: ShoppingList;
}

export interface ShoppingList {
  id: string;
  name: string;
  created_at: string; // YYYY-MM-DD
  items: ShoppingListItem[];
  status: 'pending' | 'completed';
  completed_at?: string; // YYYY-MM-DD
  total_amount?: number;
  user_id?: string;
  updated_at?: string;
}
