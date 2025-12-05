import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ShoppingListItem, ShoppingCategory, ShoppingList, Product, ProductUnit, ShoppingListResponse } from '../models/shopping.model';
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
      lists: this.http.get<{lists: ShoppingList[]}>(`${this.apiUrl}/lists`),
      categories: this.http.get<{categories: ShoppingCategory[]}>(`${this.apiUrl}/categories`),
      products: this.http.get<{products: Product[]}>(`${this.apiUrl}/products`),
    }).pipe(
      tap(data => {
        this.shoppingLists.set(data.lists.lists);
        this.products.set(data.products.products);
        this.shoppingCategories.set(data.categories.categories);
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

    this.loadAndSetActiveList(listId);
  }

  private loadAndSetActiveList(listId: string): void {
      this.http.get<{ list: ShoppingList }>(`${this.apiUrl}/lists/${listId}`).subscribe({
        next: (response) => {
          const rawList = response.list;
          
          // Map API response (snake_case) to Frontend Model (camelCase)
          const mappedList: ShoppingList = {
            id: rawList.id,
            name: rawList.name,
            status: rawList.status,
            created_at: rawList.created_at,
            completed_at: rawList.completed_at,
            total_amount: rawList.total_amount,
            user_id: rawList.user_id,
            updated_at: rawList.updated_at,
            items: (rawList.items || []).map((item: any) => ({
              id: item.id,
              quantity: item.quantity,
              price: item.price,
              checked: Boolean(item.checked), // Ensure boolean
              productId: item.product_id,
              shoppingListId: item.shopping_list_id,
              name: item.product_name, // Denormalized name
              categoryId: item.category_id, // Note: The API example has 'category_name' but model expects 'categoryId'. Check if 'category_id' comes in response or we need to infer/ignore
              unit: 'un', // Defaulting as API sample didn't show unit
              createdAt: item.created_at,
              updatedAt: item.updated_at
            }))
          };

          this.shoppingLists.update(lists => lists.map(l => l.id === listId ? mappedList : l));
          this.activeListId.set(listId);
        },
        error: (err) => {
          console.error('Error loading list details', err);
          this.notificationService.show('Erro ao carregar detalhes da lista.', 'error');
        }
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
