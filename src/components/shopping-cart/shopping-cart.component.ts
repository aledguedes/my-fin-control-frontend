import { Component, ChangeDetectionStrategy, output, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShoppingService } from '../../services/shopping.service';
import { ShoppingListItem, Product, ShoppingList } from '../../models/shopping.model';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';
import { NotificationService } from '../../services/notification.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-shopping-cart',
  templateUrl: './shopping-cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CurrencyMaskDirective],
})
export class ShoppingCartComponent {
  completePurchase = output<void>();

  shoppingService = inject(ShoppingService);
  notificationService = inject(NotificationService);

  localList = signal<ShoppingList | null>(null);

  viewMode = signal<'list' | 'category'>('list');
  sortDirection = signal<'asc' | 'desc'>('asc');
  
  isQuickAddModalOpen = signal(false);
  quickAddSearchTerm = signal('');
  quickAddSelectedProductIds = signal<string[]>([]);
  isQuickAdding = signal(false);
  
  items = computed(() => this.localList()?.items ?? []);
  total = computed(() => {
    return this.items().reduce((sum, item) => sum + item.price * item.quantity, 0);
  });
  
  constructor() {
    effect(() => {
      const activeList = this.shoppingService.activeList();
      if (activeList) {
        this.localList.set(JSON.parse(JSON.stringify(activeList)));
      } else {
        this.localList.set(null);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const currentList = this.localList();
      if (currentList && currentList.status === 'pending') {
        localStorage.setItem(`shopping_list_draft_${currentList.id}`, JSON.stringify(currentList));
      }
    });
  }
  
  groupedItems = computed(() => {
    const items = this.items();
    const categories = this.shoppingService.shoppingCategories();
    const grouped: { categoryName: string; items: ShoppingListItem[] }[] = categories.map(category => ({
      categoryName: category.name,
      items: items.filter(item => item.categoryId === category.id).sort((a,b) => a.name.localeCompare(b.name)),
    })).filter(g => g.items.length > 0);

    const uncategorizedItems = items.filter(item => !item.categoryId || !categories.some(c => c.id === item.categoryId));
    if (uncategorizedItems.length > 0) {
      grouped.push({ categoryName: 'Sem Categoria', items: uncategorizedItems.sort((a,b) => a.name.localeCompare(b.name)) });
    }
    return grouped;
  });

  sortedItems = computed(() => {
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return [...this.items()].sort((a, b) => a.name.localeCompare(b.name) * direction);
  });
  
  private availableProducts = computed(() => {
    const productIdsInCart = new Set(this.items().map(item => item.productId));
    return this.shoppingService.products().filter(p => !productIdsInCart.has(p.id));
  });

  groupedAndFilteredQuickAddProducts = computed(() => {
    const searchTerm = this.quickAddSearchTerm().toLowerCase();
    const available = this.availableProducts();

    const filteredProducts = searchTerm
      ? available.filter(p => p.name.toLowerCase().includes(searchTerm))
      : available;

    const categories = this.shoppingService.shoppingCategories();

    return categories
      .map(category => ({
        categoryName: category.name,
        products: filteredProducts
          .filter(p => p.categoryId === category.id)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter(g => g.products.length > 0);
  });

  setViewMode(mode: 'list' | 'category'): void { this.viewMode.set(mode); }
  toggleSortDirection(): void { this.sortDirection.update(dir => dir === 'asc' ? 'desc' : 'asc'); }
  
  toggleQuickAddSelection(productId: string): void {
    this.quickAddSelectedProductIds.update(ids => {
      const set = new Set(ids);
      if (set.has(productId)) {
        set.delete(productId);
      } else {
        set.add(productId);
      }
      return Array.from(set);
    });
  }
  
  confirmQuickAdd(): void {
    const selectedIds = this.quickAddSelectedProductIds();
    if (selectedIds.length === 0) return;
    
    this.localList.update(list => {
      if (!list) return null;
      const newItems: ShoppingListItem[] = selectedIds.map(productId => {
        const product = this.shoppingService.products().find(p => p.id === productId);
        if (!product) return null;
        return {
          id: uuidv4(),
          productId: product.id,
          name: product.name,
          quantity: 1,
          price: 0,
          checked: false,
          categoryId: product.categoryId,
          unit: product.unit
        };
      }).filter((item): item is ShoppingListItem => item !== null);

      return {
        ...list,
        items: [...list.items, ...newItems]
      };
    });

    this.notificationService.show(`${selectedIds.length} itens adicionados!`, 'success');
    this.quickAddSelectedProductIds.set([]);
    this.quickAddSearchTerm.set('');
    this.isQuickAddModalOpen.set(false);
  }

  updateItem(itemId: string, field: 'quantity' | 'price' | 'checked', value: number | boolean): void {
    this.localList.update(list => {
      if (!list) return null;
      return {
        ...list,
        items: list.items.map(item => {
          if (item.id === itemId) {
            return { ...item, [field]: value };
          }
          return item;
        })
      };
    });
  }

  removeItem(itemId: string): void { 
    this.localList.update(list => {
      if (!list) return null;
      return {
        ...list,
        items: list.items.filter(item => item.id !== itemId)
      };
    });
  }

  toggleCheck(item: ShoppingListItem): void {
    this.updateItem(item.id, 'checked', !item.checked);
  }
  
  onCompletePurchase(): void {
    if (this.total() > 0) {
        if(confirm('Concluir a compra irá arquivar a lista atual. Deseja continuar?')) {
            this.shoppingService.activeListId.set(this.localList()?.id ?? null);
            this.completePurchase.emit();
        }
    }
  }
  
  trackById(index: number, item: ShoppingListItem | Product): string { return item.id; }
}
