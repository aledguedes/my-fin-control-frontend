export type ProductUnit = 'un' | 'kg' | 'l' | 'dz' | 'm' | 'cx';

export const productUnits: { value: ProductUnit, label: string }[] = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilo (kg)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'dz', label: 'Dúzia (dz)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'cx', label: 'Caixa (cx)' }
];

export interface ShoppingCategoryResponse {
  categories: ShoppingCategory[];
}

export interface ShoppingCategory {
  id: string;
  name: string;
  userId?: string;
  created_at?: string;
  updatedAt?: string;
}

export interface ProductResponse {
  products: Product[];
}

export interface Product {
  id: string;
  name: string;
  category_id?: string;
  unit: ProductUnit;
  userId?: string;
  created_at?: string;
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
  category_id?: string; // Denormalized for easier grouping
  unit: ProductUnit; // Denormalized for easier display
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShoppingListResponse {
  lists: ShoppingList[];
}

export interface ShoppingList {
  id: string;
  name: string;
  created_at: string; // YYYY-MM-DD
  items: CartItem[];
  status: 'pending' | 'completed' | 'andamento';
  completedAt?: string; // YYYY-MM-DD
  totalAmount?: number;
  userId?: string;
  updatedAt?: string;
}
