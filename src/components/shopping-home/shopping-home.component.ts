import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ShoppingCartComponent } from '../shopping-cart/shopping-cart.component';
import { ShoppingService } from '../../services/shopping.service';
import { ShoppingList, ShoppingCategory, Product, ProductUnit, productUnits } from '../../models/shopping.model';
import { UiService } from '../../services/ui.service';
import { Transaction } from '../../models/transaction.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-shopping-home',
  templateUrl: './shopping-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ShoppingCartComponent, ReactiveFormsModule],
})
export class ShoppingHomeComponent implements OnInit {
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  shoppingService = inject(ShoppingService);
  
  productUnits = productUnits;
  view = signal<'dashboard' | 'categories' | 'products'>('dashboard');
  isCreateListModalOpen = signal(false);
  editingCategoryId = signal<string | null>(null);
  editingProductId = signal<string | null>(null);
  expandedCategoryIds = signal<string[]>([]);
  preSelectedProductIds = signal<string[]>([]);
  
  // Loading states
  loadingAction = signal<string | null>(null); // e.g., 'create-list', 'delete-list-ID', 'add-category'

  createListForm!: FormGroup;
  categoryForm!: FormGroup;
  productForm!: FormGroup;
  editCategoryForm!: FormGroup;
  editProductForm!: FormGroup;
  
  sortedShoppingLists = computed(() => {
    return this.shoppingService.shoppingLists().slice().sort((a, b) => {
      if (a.status === 'pending' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status === 'pending') return 1;
      const dateA = new Date(a.completed_at || a.created_at).getTime();
      const dateB = new Date(b.completed_at || b.created_at).getTime();
      return dateB - dateA;
    });
  });

  productsGroupedByCategory = computed(() => {
      const products = this.shoppingService.products();
      const categories = this.shoppingService.shoppingCategories();
      const grouped = categories.map(cat => ({
          ...cat,
          products: products.filter(p => p.category_id === cat.id).sort((a,b) => a.name.localeCompare(b.name))
      }));
      return grouped.filter(g => g.products.length > 0);
  });

  ngOnInit(): void {
    this.createListForm = this.fb.group({ name: ['', Validators.required] });
    this.categoryForm = this.fb.group({ name: ['', Validators.required] });
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      categoryId: [null],
      unit: ['un' as ProductUnit, Validators.required],
    });
    this.editCategoryForm = this.fb.group({ name: ['', Validators.required] });
    this.editProductForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      categoryId: [null],
      unit: ['un' as ProductUnit, Validators.required],
    });
  }

  openCreateListModal(): void {
    this.preSelectedProductIds.set([]);
    this.isCreateListModalOpen.set(true);
  }

  closeCreateListModal(): void {
    this.isCreateListModalOpen.set(false);
    this.preSelectedProductIds.set([]);
  }

  togglePreselectedProduct(productId: string): void {
    this.preSelectedProductIds.update(ids => {
      const set = new Set(ids);
      if (set.has(productId)) {
        set.delete(productId);
      } else {
        set.add(productId);
      }
      return Array.from(set);
    });
  }

  isProductPreSelected(productId: string): boolean {
    return this.preSelectedProductIds().includes(productId);
  }

  isCategoryExpanded(categoryId: string): boolean {
    return this.expandedCategoryIds().includes(categoryId);
  }

  toggleCategory(categoryId: string): void {
    this.expandedCategoryIds.update(ids => {
      if (ids.includes(categoryId)) {
        return ids.filter(id => id !== categoryId);
      } else {
        return [...ids, categoryId];
      }
    });
  }

  handleCompletePurchase(list: ShoppingList): void {
    this.loadingAction.set('complete-purchase');
    this.shoppingService.completeActiveList(list).pipe(
      finalize(() => this.loadingAction.set(null))
    ).subscribe(() => {
      // ONLY remove draft if API call succeeds
      localStorage.removeItem(`shopping_list_draft_${list.id}`);

      const purchaseDetails: Partial<Transaction> = {
        type: 'expense',
        amount: list.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        description: `Compras: ${list.name}`, 
        // FIX: Renamed 'date' to 'transactionDate' to match the Transaction model.
        transactionDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Débito',
      };
      this.uiService.openTransactionModal(purchaseDetails);
    });
  }
  
  trackById(index: number, item: ShoppingCategory | ShoppingList | Product): string { return item.id; }
  getUnitLabel(unitValue: ProductUnit): string { return this.productUnits.find(u => u.value === unitValue)?.label ?? unitValue; }
  selectList(listId: string): void { this.shoppingService.setActiveList(listId); }

  createList(): void {
    if (this.createListForm.invalid) return;
    this.loadingAction.set('create-list');
    const listName = this.createListForm.value.name;
    const initialItems = this.preSelectedProductIds();

    this.shoppingService.createList(listName, initialItems).pipe(
      finalize(() => this.loadingAction.set(null))
    ).subscribe(newList => {
      this.shoppingService.setActiveList(newList.id);
      this.createListForm.reset();
      this.closeCreateListModal();
    });
  }

  deleteList(listId: string): void {
    if (confirm('Tem certeza que deseja excluir esta lista?')) {
      this.loadingAction.set(`delete-list-${listId}`);
      this.shoppingService.deleteList(listId).pipe(
        finalize(() => this.loadingAction.set(null))
      ).subscribe();
    }
  }

  goBackToDashboard(): void {
    this.shoppingService.setActiveList(null);
    this.view.set('dashboard');
  }
  
  addCategory(): void {
    if (this.categoryForm.invalid) return;
    this.loadingAction.set('add-category');
    this.shoppingService.addShoppingCategory(this.categoryForm.value.name).pipe(
      finalize(() => this.loadingAction.set(null))
    ).subscribe(() => this.categoryForm.reset());
  }
  
  deleteCategory(id: string): void {
    if (confirm('Tem certeza? Produtos usando esta categoria não serão excluídos, mas ficarão sem categoria.')) {
      this.loadingAction.set(`delete-category-${id}`);
      this.shoppingService.deleteShoppingCategory(id).pipe(
        finalize(() => this.loadingAction.set(null))
      ).subscribe();
    }
  }

  startEditCategory(category: ShoppingCategory): void {
    this.editingCategoryId.set(category.id);
    this.editCategoryForm.setValue({ name: category.name });
  }
  cancelEditCategory(): void { this.editingCategoryId.set(null); }

  saveCategory(id: string): void {
    if (this.editCategoryForm.invalid) return;
    this.loadingAction.set(`save-category-${id}`);
    this.shoppingService.updateShoppingCategory({ id, name: this.editCategoryForm.value.name }).pipe(
      finalize(() => {
        this.loadingAction.set(null);
        this.cancelEditCategory();
      })
    ).subscribe();
  }
  
  addProduct(): void {
    if (this.productForm.invalid) return;
    this.loadingAction.set('add-product');
    this.shoppingService.addProduct(this.productForm.value).pipe(
      finalize(() => this.loadingAction.set(null))
    ).subscribe(() => this.productForm.reset({ unit: 'un', categoryId: null }));
  }
  
  deleteProduct(id: string): void {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      this.loadingAction.set(`delete-product-${id}`);
      this.shoppingService.deleteProduct(id).pipe(
        finalize(() => this.loadingAction.set(null))
      ).subscribe();
    }
  }
  
  startEditProduct(product: Product): void {
    this.editingProductId.set(product.id);
    this.editProductForm.setValue({
      id: product.id,
      name: product.name,
      categoryId: product.category_id ?? null,
      unit: product.unit
    });
  }
  cancelEditProduct(): void { this.editingProductId.set(null); }
  
  saveProduct(): void {
    if (this.editProductForm.invalid) return;
    // FIX: Use `getRawValue()` which is correctly typed, instead of `value` which can be inferred as `unknown`.
    const product = this.editProductForm.getRawValue();
    this.loadingAction.set(`save-product-${product.id}`);
    this.shoppingService.updateProduct(product as Product).pipe(
      finalize(() => {
        this.loadingAction.set(null);
        this.cancelEditProduct();
      })
    ).subscribe();
  }
}