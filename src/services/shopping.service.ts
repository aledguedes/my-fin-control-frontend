import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { CartItem, ShoppingCategory, ShoppingList, Product, ShoppingListResponse, ShoppingCategoryResponse, ProductResponse } from '../models/shopping.model';
import { NotificationService } from './notification.service';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ShoppingService {
  private http: HttpClient = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private apiUrl = `${environment.apiUrl}/shopping`;

  // State signals
  shoppingLists = signal<ShoppingList[]>([]);
  activeListId = signal<string | null>(null);
  shoppingCategories = signal<ShoppingCategory[]>([]);
  products = signal<Product[]>([]);
  
  // Computed signals for active list details
  activeList = computed(() => {
    const activeId = this.activeListId();
    if (!activeId) return null;
    return this.shoppingLists().find(l => l.id === activeId) || null;
  });
  items = computed(() => this.activeList()?.items ?? []);
  total = computed(() => {
    return this.items().reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  loadInitialData(): Observable<any> {
    return forkJoin({
      lists: this.http.get<ShoppingListResponse>(`${this.apiUrl}/lists`),
      categories: this.http.get<ShoppingCategoryResponse>(`${this.apiUrl}/categories`),
      products: this.http.get<ProductResponse>(`${this.apiUrl}/products`),
    }).pipe(
      tap(data => {
        this.shoppingLists.set(data.lists.lists);
        this.shoppingCategories.set(data.categories.categories);
        this.products.set(data.products.products);
      }),
      catchError(() => {
        this.notificationService.show('Erro ao carregar dados de compras.', 'error');
        return of(null);
      })
    );
  }

  createList(name: string, initialProductIds: string[] = []): Observable<ShoppingList> {
    return this.http.post<ShoppingList>(`${this.apiUrl}/lists`, { name, items: initialProductIds }).pipe(
      tap(newList => {
        this.shoppingLists.update(lists => [...lists, newList]);
        this.notificationService.show('Lista criada com sucesso!', 'success');
      })
    );
  }

  setActiveList(listId: string | null): void {
    if (!listId) {
      this.activeListId.set(null);
      return;
    }

    const preloadedList = this.shoppingLists().find(list => list.id === listId);
    if (preloadedList) {
      this.activeListId.set(listId);
    }

    const draft = localStorage.getItem(`shopping_list_draft_${listId}`);
    
    const syncAndSet = (listToSync: ShoppingList) => {
        this.syncList(listToSync).subscribe({
          next: (syncedList) => {
            this.shoppingLists.update(lists => lists.map(l => l.id === listId ? syncedList : l));
            this.activeListId.set(listId);
          },
          error: () => {
             this.notificationService.show('Falha ao sincronizar alterações. Carregando última versão salva.', 'error');
             this.loadAndSetActiveList(listId);
          }
        });
    };

    if (draft) {
      const listFromDraft: ShoppingList = JSON.parse(draft);
      syncAndSet(listFromDraft);
    } else {
      this.loadAndSetActiveList(listId);
    }
  }

  private loadAndSetActiveList(listId: string): void {
      this.http.get<ShoppingList>(`${this.apiUrl}/lists/${listId}`).subscribe(listDetails => {
          this.shoppingLists.update(lists => lists.map(l => l.id === listId ? listDetails : l));
          this.activeListId.set(listId);
      });
  }

  syncList(list: ShoppingList): Observable<ShoppingList> {
    const payload = {
        name: list.name,
        status: list.status,
        items: list.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          checked: item.checked,
          product_id: item.productId,
        })),
    };

    return this.http.put<ShoppingList>(`${this.apiUrl}/lists/${list.id}`, payload).pipe(
      tap(() => {
        localStorage.removeItem(`shopping_list_draft_${list.id}`);
        this.notificationService.show('Alterações salvas com sucesso!', 'success');
      }),
      catchError(err => {
        this.notificationService.show('Falha ao sincronizar com o servidor. Suas alterações continuam salvas localmente.', 'error');
        return throwError(() => err);
      })
    );
  }

  deleteList(listId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/lists/${listId}`).pipe(
        tap(() => {
            this.shoppingLists.update(lists => lists.filter(l => l.id !== listId));
            if (this.activeListId() === listId) this.setActiveList(null);
            localStorage.removeItem(`shopping_list_draft_${listId}`);
            this.notificationService.show('Lista excluída com sucesso!', 'success');
        })
    );
  }
  
  completeActiveList(): Observable<any> {
    const list = this.activeList();
    if (!list) return of(null);
    return this.http.post<object>(`${this.apiUrl}/lists/${list.id}/complete`, {}).pipe(
      tap(() => {
        this.shoppingLists.update(lists =>
          lists.map(l => l.id === list.id ? { ...l, status: 'completed' } : l)
        );
        this.setActiveList(null);
        this.notificationService.show(`Lista "${list.name}" finalizada!`, 'success');
      })
    );
  }

  addShoppingCategory(name: string): Observable<ShoppingCategory> {
    return this.http.post<ShoppingCategory>(`${this.apiUrl}/categories`, { name }).pipe(
      tap(newCategory => {
        this.shoppingCategories.update(categories => [...categories, newCategory]);
      })
    );
  }

  updateShoppingCategory(category: ShoppingCategory): Observable<ShoppingCategory> {
    return this.http.put<ShoppingCategory>(`${this.apiUrl}/categories/${category.id}`, category).pipe(
      tap((updatedCategory: ShoppingCategory) => {
        this.shoppingCategories.update(c => c.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
      })
    );
  }

  deleteShoppingCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categories/${id}`).pipe(
      tap(() => {
        this.shoppingCategories.update(categories => categories.filter(c => c.id !== id));
        this.notificationService.show('Categoria de compra excluída!', 'success');
      }),
      catchError(err => {
        this.notificationService.show('Erro ao excluir categoria de compra.', 'error');
        return throwError(() => err);
      })
    );
  }

  addProduct(productData: Omit<Product, 'id'>): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, productData).pipe(
      tap(newProduct => {
        this.products.update(products => [...products, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
        this.notificationService.show('Produto adicionado!', 'success');
      }),
      catchError(err => {
        this.notificationService.show('Erro ao adicionar produto.', 'error');
        return throwError(() => err);
      })
    );
  }

  updateProduct(product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/products/${product.id}`, product).pipe(
      tap(updatedProduct => {
        this.products.update(products => 
          products.map(p => p.id === updatedProduct.id ? updatedProduct : p).sort((a, b) => a.name.localeCompare(b.name))
        );
        this.notificationService.show('Produto atualizado!', 'success');
      }),
      catchError(err => {
        this.notificationService.show('Erro ao atualizar produto.', 'error');
        return throwError(() => err);
      })
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${id}`).pipe(
      tap(() => {
        this.products.update(products => products.filter(p => p.id !== id));
        this.notificationService.show('Produto excluído!', 'success');
      }),
      catchError(err => {
        this.notificationService.show('Erro ao excluir produto.', 'error');
        return throwError(() => err);
      })
    );
  }

  addMultipleItems(itemsData: { productId: string, quantity: number, price: number }[]): Observable<ShoppingListItem[]> {
    const activeId = this.activeListId();
    if (!activeId) return throwError(() => new Error('No active list'));

    return this.http.post<ShoppingListItem[]>(`${this.apiUrl}/lists/${activeId}/items`, itemsData).pipe(
      tap((newItems: ShoppingListItem[]) => {
        this.shoppingLists.update(lists => lists.map(l => {
          if (l.id === activeId) {
            return { ...l, items: [...l.items, ...newItems] };
          }
          return l;
        }));
        this.notificationService.show(`${newItems.length} itens adicionados!`, 'success');
      }),
      catchError(err => {
        this.notificationService.show('Erro ao adicionar itens.', 'error');
        return throwError(() => err);
      })
    );
  }
}
