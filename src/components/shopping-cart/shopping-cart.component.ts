import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
  computed,
  inject,
  effect,
  DestroyRef,
} from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { ShoppingService } from '../../services/shopping.service';
import {
  ShoppingListItem,
  Product,
  ShoppingList,
  productUnits,
  ProductUnit,
} from '../../models/shopping.model';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';
import { NotificationService } from '../../services/notification.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-shopping-cart',
  templateUrl: './shopping-cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CurrencyMaskDirective],
})
export class ShoppingCartComponent {
  completePurchase = output<ShoppingList>();

  shoppingService = inject(ShoppingService);
  notificationService = inject(NotificationService);
  destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  productUnits = productUnits;
  productForm!: FormGroup;

  localList = signal<ShoppingList | null>(null);

  /** Status da sincronização com o backend */
  syncStatus = signal<'synced' | 'pending' | 'syncing' | 'error'>('synced');
  lastSyncAt = signal<Date | null>(null);

  viewMode = signal<'list' | 'category'>('list');
  sortDirection = signal<'asc' | 'desc'>('asc');

  isQuickAddModalOpen = signal(false);
  quickAddSearchTerm = signal('');
  quickAddSelectedProductIds = signal<string[]>([]);
  isQuickAdding = signal(false);
  isAddingNewProduct = signal(false);

  items = computed(() => this.localList()?.items ?? []);
  total = computed(() => {
    return this.items().reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  constructor() {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      category_id: [null],
      unit: ['un' as ProductUnit, Validators.required],
    });

    effect(
      () => {
        const activeList = this.shoppingService.activeList();
        if (!activeList) {
          this.localList.set(null);
          return;
        }

        const savedDraft = localStorage.getItem(`shopping_list_draft_${activeList.id}`);

        if (!savedDraft) {
          // Sem draft local → usa versão do servidor diretamente
          this.localList.set(JSON.parse(JSON.stringify(activeList)));
          this.syncStatus.set('synced');
          return;
        }

        // ── Controle de conflito: "a versão mais recente vence" ─────────────
        try {
          const parsedDraft: ShoppingList = JSON.parse(savedDraft);

          const draftTime = parsedDraft.updated_at
            ? new Date(parsedDraft.updated_at).getTime()
            : 0;
          const serverTime = activeList.updated_at
            ? new Date(activeList.updated_at).getTime()
            : 0;

          if (draftTime >= serverTime) {
            // Draft local é mais recente (ou igual) → usa o draft
            // O sync automático dos 2min vai enviá-lo ao servidor eventualmente
            this.localList.set(parsedDraft);
            this.syncStatus.set('pending');
          } else {
            // Servidor tem versão mais recente (outro dispositivo salvou depois)
            // Descarta o draft obsoleto e usa a versão do servidor
            console.info(
              `[ShoppingCart] Versão do servidor (${activeList.updated_at}) é mais recente que o draft local (${parsedDraft.updated_at}). Usando versão do servidor.`,
            );
            localStorage.removeItem(`shopping_list_draft_${activeList.id}`);
            this.localList.set(JSON.parse(JSON.stringify(activeList)));
            this.syncStatus.set('synced');
          }
        } catch (e) {
          console.error('[ShoppingCart] Falha ao parsear draft local. Usando versão do servidor.', e);
          localStorage.removeItem(`shopping_list_draft_${activeList.id}`);
          this.localList.set(JSON.parse(JSON.stringify(activeList)));
          this.syncStatus.set('synced');
        }
      },
      { allowSignalWrites: true },
    );

    // ── Sync inteligente: local-first + sincronização eventual ──────────────
    // 1. Persiste imediatamente no localStorage (sem atraso)
    // 2. Após 2s de inatividade, envia snapshot completo ao backend
    toObservable(this.localList)
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((currentList) => {
        if (currentList && currentList.status === 'pending') {
          // Persiste draft local SEMPRE (sem delay)
          localStorage.setItem(
            `shopping_list_draft_${currentList.id}`,
            JSON.stringify(currentList),
          );
          // Marca como pendente enquanto o debounce ainda não disparou
          this.syncStatus.set('pending');
        }
      });

    // 3. Janela de sincronização: agrupa múltiplas alterações em um único request
    toObservable(this.localList)
      .pipe(
        debounceTime(120_000), // 2 minutos após a última alteração
        distinctUntilChanged(),
        switchMap((currentList) => {
          if (!currentList || currentList.status !== 'pending') return of(null);
          this.syncStatus.set('syncing');
          return this.shoppingService.syncList(currentList, false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          if (result !== null) {
            this.syncStatus.set('synced');
            this.lastSyncAt.set(new Date());
          }
        },
        error: () => {
          this.syncStatus.set('error');
        },
      });

    // 4. Evento crítico: sync ao destruir o componente (usuário sai da tela)
    this.destroyRef.onDestroy(() => {
      const currentList = this.localList();
      if (currentList && currentList.status === 'pending' && this.syncStatus() !== 'synced') {
        this.shoppingService.syncList(currentList, false).subscribe();
      }
    });
  }

  groupedItems = computed(() => {
    const items = this.items();
    const categories = this.shoppingService.shoppingCategories();

    const grouped: { categoryName: string; items: ShoppingListItem[] }[] = categories
      .map((category) => ({
        categoryName: category.name,
        items: items
          .filter((item) => String(item.category_id) === String(category.id))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((g) => g.items.length > 0);

    const uncategorizedItems = items.filter(
      (item) =>
        !item.category_id || !categories.some((c) => String(c.id) === String(item.category_id)),
    );
    if (uncategorizedItems.length > 0) {
      grouped.push({
        categoryName: 'Sem Categoria',
        items: uncategorizedItems.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
    return grouped;
  });

  sortedItems = computed(() => {
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return [...this.items()].sort((a, b) => a.name.localeCompare(b.name) * direction);
  });

  private availableProducts = computed(() => {
    const productIdsInCart = new Set(this.items().map((item) => item.productId));
    return this.shoppingService.products().filter((p) => !productIdsInCart.has(p.id));
  });

  groupedAndFilteredQuickAddProducts = computed(() => {
    const searchTerm = this.quickAddSearchTerm().toLowerCase();
    const available = this.availableProducts();

    const filteredProducts = searchTerm
      ? available.filter((p) => p.name.toLowerCase().includes(searchTerm))
      : available;

    const categories = this.shoppingService.shoppingCategories();

    return categories
      .map((category) => ({
        categoryName: category.name,
        products: filteredProducts
          .filter((p) => p.category_id === category.id)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((g) => g.products.length > 0);
  });

  setViewMode(mode: 'list' | 'category'): void {
    this.viewMode.set(mode);
  }
  toggleSortDirection(): void {
    this.sortDirection.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
  }

  toggleQuickAddSelection(productId: string): void {
    this.quickAddSelectedProductIds.update((ids) => {
      const set = new Set(ids);
      if (set.has(productId)) {
        set.delete(productId);
      } else {
        set.add(productId);
      }
      return Array.from(set);
    });
  }

  showNewProductForm(): void {
    const searchTerm = this.quickAddSearchTerm().trim();
    this.productForm.patchValue({
      name: searchTerm,
      unit: 'un',
      category_id: null,
    });
    this.isAddingNewProduct.set(true);
  }

  cancelNewProduct(): void {
    this.isAddingNewProduct.set(false);
    this.productForm.reset({ unit: 'un', category_id: null });
  }

  addNewProduct(): void {
    if (this.productForm.invalid) return;

    this.isQuickAdding.set(true);
    const productData = this.productForm.getRawValue();

    this.shoppingService.addProduct(productData).subscribe({
      next: (newProduct) => {
        // Automatically select the newly created product
        this.toggleQuickAddSelection(newProduct.id);
        this.cancelNewProduct();
        this.isQuickAdding.set(false);
      },
      error: () => {
        this.isQuickAdding.set(false);
      },
    });
  }

  confirmQuickAdd(): void {
    const selectedIds = this.quickAddSelectedProductIds();
    if (selectedIds.length === 0) return;

    this.mutateList((list) => {
      const newItems: ShoppingListItem[] = selectedIds
        .map((productId) => {
          const product = this.shoppingService.products().find((p) => p.id === productId);
          if (!product) return null;
          return {
            id: uuidv4(),
            productId: product.id,
            name: product.name,
            quantity: 1,
            price: 0,
            checked: false,
            category_id: product.category_id,
            unit: product.unit,
          };
        })
        .filter((item) => item !== null);

      const updatedItems = [...list.items, ...newItems];
      return {
        ...list,
        items: updatedItems,
        total_amount: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      };
    });

    this.notificationService.show(`${selectedIds.length} itens adicionados!`, 'success');
    this.closeQuickAddModal();
  }

  closeQuickAddModal(): void {
    this.isQuickAddModalOpen.set(false);
    this.quickAddSelectedProductIds.set([]);
    this.quickAddSearchTerm.set('');
    this.isAddingNewProduct.set(false);
    this.productForm.reset({ unit: 'un', category_id: null });
  }

  updateItem(
    itemId: string,
    field: 'quantity' | 'price' | 'checked',
    value: number | boolean,
  ): void {
    this.mutateList((list) => {
      const updatedItems = list.items.map((item) => {
        if (item.id === itemId) {
          return { ...item, [field]: value };
        }
        return item;
      });

      return {
        ...list,
        items: updatedItems,
        total_amount: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      };
    });
  }

  removeItem(itemId: string): void {
    this.mutateList((list) => {
      const updatedItems = list.items.filter((item) => item.id !== itemId);
      return {
        ...list,
        items: updatedItems,
        total_amount: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      };
    });
  }

  /**
   * Helper centralizado para mutações locais.
   * Injeta automaticamente `updated_at` com o timestamp atual,
   * garantindo que a comparação de versões (draft vs servidor) seja sempre precisa.
   */
  private mutateList(fn: (list: ShoppingList) => ShoppingList): void {
    this.localList.update((list) => {
      if (!list) return null;
      const result = fn(list);
      return { ...result, updated_at: new Date().toISOString() };
    });
  }

  toggleCheck(item: ShoppingListItem): void {
    this.updateItem(item.id, 'checked', !item.checked);
  }

  isCompletionModalOpen = signal(false);

  onCompletePurchase(): void {
    if (this.total() > 0) {
      this.isCompletionModalOpen.set(true);
    }
  }

  confirmCompletion(): void {
    const list = this.localList();
    if (!list) {
      this.isCompletionModalOpen.set(false);
      return;
    }

    // Evento crítico: garante sync antes de finalizar
    // Se já está sincronizado, emite diretamente; caso contrário, sincroniza primeiro
    if (this.syncStatus() === 'synced') {
      this.completePurchase.emit(list);
      this.isCompletionModalOpen.set(false);
    } else {
      this.syncStatus.set('syncing');
      this.shoppingService.syncList(list, false).subscribe({
        next: () => {
          this.syncStatus.set('synced');
          this.lastSyncAt.set(new Date());
          this.completePurchase.emit(list);
          this.isCompletionModalOpen.set(false);
        },
        error: () => {
          this.syncStatus.set('error');
          // Mesmo com erro de sync, permite finalizar (dados locais são a fonte de verdade)
          this.completePurchase.emit(list);
          this.isCompletionModalOpen.set(false);
        },
      });
    }
  }

  closeCompletionModal(): void {
    this.isCompletionModalOpen.set(false);
  }

  trackById(index: number, item: ShoppingListItem | Product): string {
    return item.id;
  }
}
