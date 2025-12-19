import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import {
  ShoppingListItem,
  ShoppingCategory,
  ShoppingList,
  Product,
  ProductUnit,
  ShoppingListResponse,
} from '../models/shopping.model';
import { NotificationService } from './notification.service';
import { CacheService } from './cache.service';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ShoppingService {
  private http: HttpClient = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private cacheService = inject(CacheService);
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
    return this.shoppingLists().find((l) => l.id === activeId) || null;
  });
  items = computed(() => this.activeList()?.items ?? []);
  total = computed(() => {
    return this.items().reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  loadInitialData(): Observable<any> {
    return forkJoin({
      lists: this.http.get<{ lists: any[] }>(`${this.apiUrl}/lists`),
      categories: this.http.get<{ categories: any[] }>(`${this.apiUrl}/categories`),
      products: this.http.get<{ products: any[] }>(`${this.apiUrl}/products`),
    }).pipe(
      tap((data) => {
        // Map Lists
        const mappedLists: ShoppingList[] = (data.lists.lists || []).map((l) => ({
          id: String(l.id),
          name: l.name,
          status: l.status,
          created_at: l.created_at,
          completed_at: l.completed_at,
          total_amount: l.total_amount,
          user_id: l.user_id,
          updated_at: l.updated_at,
          items: [],
        }));
        this.shoppingLists.set(mappedLists);

        // Map Products
        const mappedProducts: Product[] = (data.products.products || []).map((p) => ({
          id: String(p.id),
          name: p.name,
          category_id: p.category_id ? String(p.category_id) : undefined,
          unit: p.unit as ProductUnit,
          user_id: p.user_id,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
        this.products.set(mappedProducts);

        // Map Categories
        const mappedCategories: ShoppingCategory[] = (data.categories.categories || []).map(
          (c) => ({
            id: String(c.id),
            name: c.name,
            userId: c.user_id,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }),
        );
        this.shoppingCategories.set(mappedCategories);
        console.log('Loaded Categories:', mappedCategories);
      }),
      catchError((err) => {
        console.error('Error loading initial data', err);
        this.notificationService.show('Erro ao carregar dados de compras.', 'error');
        return of(null);
      }),
    );
  }

  createList(name: string, initialProductIds: string[] = []): Observable<ShoppingList> {
    return this.http
      .post<ShoppingList>(`${this.apiUrl}/lists`, { name, items: initialProductIds })
      .pipe(
        tap((newList) => {
          // Invalidar cache de listas
          this.cacheService.clearByPattern('/shopping/lists');
          this.shoppingLists.update((lists) => [...lists, newList]);
          this.notificationService.show('Lista criada com sucesso!', 'success');
        }),
      );
  }

  setActiveList(listId: string | null): void {
    if (!listId) {
      this.activeListId.set(null);
      return;
    }

    this.loadAndSetActiveList(listId);
  }

  loadListDetails(listId: string): Observable<ShoppingList> {
    return this.http.get<{ list: ShoppingList }>(`${this.apiUrl}/lists/${listId}`).pipe(
      map((response) => {
        const rawList = response.list;

        // Map API response (snake_case) to Frontend Model (camelCase)
        const mappedList: ShoppingList = {
          id: String(rawList.id),
          name: rawList.name,
          status: rawList.status,
          created_at: rawList.created_at,
          completed_at: rawList.completed_at,
          total_amount: rawList.total_amount,
          user_id: rawList.user_id,
          updated_at: rawList.updated_at,
          items: (rawList.items || []).map((item: any) => {
            // Try to find category_id from the item itself, or lookup in loaded products
            let category_id = item.category_id ? String(item.category_id) : undefined;

            if (!category_id && item.product_id) {
              const product = this.products().find((p) => String(p.id) === String(item.product_id));
              if (product && product.category_id) {
                category_id = String(product.category_id);
              }
            }

            return {
              id: String(item.id),
              quantity: item.quantity,
              price: item.price,
              checked: Boolean(item.checked), // Ensure boolean
              productId: String(item.product_id),
              shoppingListId: String(item.shopping_list_id),
              name: item.product_name, // Denormalized name
              product_name: item.product_name || item.name,
              category_id: category_id,
              category_name: item.category_name || '',
              unit: item.unit || 'un',
              createdAt: item.created_at,
              updatedAt: item.updated_at,
            };
          }),
        };

        // Atualizar o signal de listas
        this.shoppingLists.update((lists) => {
          const existingIndex = lists.findIndex((l) => l.id === listId);
          if (existingIndex >= 0) {
            return lists.map((l) => (l.id === listId ? mappedList : l));
          } else {
            return [...lists, mappedList];
          }
        });

        return mappedList;
      }),
      catchError((err) => {
        console.error('Error loading list details', err);
        this.notificationService.show('Erro ao carregar detalhes da lista.', 'error');
        return throwError(() => err);
      }),
    );
  }

  private loadAndSetActiveList(listId: string): void {
    this.loadListDetails(listId).subscribe({
      next: () => {
        this.activeListId.set(listId);
      },
      error: () => {
        // Error already handled in loadListDetails
      },
    });
  }

  syncList(list: ShoppingList, showNotification: boolean = true): Observable<ShoppingList> {
    const payload = {
      name: list.name,
      status: list.status,
      items: list.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        checked: item.checked,
        product_id: item.productId,
      })),
    };

    return this.http.put<ShoppingList>(`${this.apiUrl}/lists/${list.id}`, payload).pipe(
      tap(() => {
        // Invalidar cache de listas
        this.cacheService.clearByPattern('/shopping/lists');
        localStorage.removeItem(`shopping_list_draft_${list.id}`);
        if (showNotification) {
          this.notificationService.show('Alterações salvas com sucesso!', 'success');
        }
      }),
      catchError((err) => {
        if (showNotification) {
          this.notificationService.show(
            'Falha ao sincronizar com o servidor. Suas alterações continuam salvas localmente.',
            'error',
          );
        }
        return throwError(() => err);
      }),
    );
  }

  deleteList(listId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/lists/${listId}`).pipe(
      tap(() => {
        // Invalidar cache de listas
        this.cacheService.clearByPattern('/shopping/lists');
        this.shoppingLists.update((lists) => lists.filter((l) => l.id !== listId));
        if (this.activeListId() === listId) this.setActiveList(null);
        localStorage.removeItem(`shopping_list_draft_${listId}`);
        this.notificationService.show('Lista excluída com sucesso!', 'success');
      }),
    );
  }

  completeActiveList(list: ShoppingList): Observable<any> {
    return this.http.put<object>(`${this.apiUrl}/lists/${list.id}/complete`, list).pipe(
      tap(() => {
        // Invalidar cache de listas
        this.cacheService.clearByPattern('/shopping/lists');
        this.shoppingLists.update((lists) =>
          lists.map((l) => (l.id === list.id ? { ...l, status: 'completed' } : l)),
        );
        this.setActiveList(null);
        this.notificationService.show(`Lista "${list.name}" finalizada!`, 'success');
      }),
    );
  }

  addShoppingCategory(name: string): Observable<ShoppingCategory> {
    return this.http.post<ShoppingCategory>(`${this.apiUrl}/categories`, { name }).pipe(
      tap((newCategory) => {
        // Invalidar cache de categorias
        this.cacheService.clearByPattern('/shopping/categories');
        this.shoppingCategories.update((categories) => [...categories, newCategory]);
      }),
    );
  }

  updateShoppingCategory(category: ShoppingCategory): Observable<ShoppingCategory> {
    return this.http
      .put<ShoppingCategory>(`${this.apiUrl}/categories/${category.id}`, category)
      .pipe(
        tap((updatedCategory: ShoppingCategory) => {
          // Invalidar cache de categorias
          this.cacheService.clearByPattern('/shopping/categories');
          this.shoppingCategories.update((c) =>
            c.map((cat) => (cat.id === updatedCategory.id ? updatedCategory : cat)),
          );
        }),
      );
  }

  deleteShoppingCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categories/${id}`).pipe(
      tap(() => {
        // Invalidar cache de categorias
        this.cacheService.clearByPattern('/shopping/categories');
        this.shoppingCategories.update((categories) => categories.filter((c) => c.id !== id));
        this.notificationService.show('Categoria de compra excluída!', 'success');
      }),
      catchError((err) => {
        this.notificationService.show('Erro ao excluir categoria de compra.', 'error');
        return throwError(() => err);
      }),
    );
  }

  addProduct(productData: Omit<Product, 'id'>): Observable<Product> {
    return this.http.post<any>(`${this.apiUrl}/products`, productData).pipe(
      map((response: any) => {
        // Tratar diferentes formatos de resposta do backend
        let product: any;
        if (response?.product) {
          product = response.product;
        } else if (response?.data) {
          product = response.data;
        } else {
          product = response;
        }

        // Validar se o produto tem os campos necessários
        if (!product || !product.id || !product.name) {
          console.error('Resposta inválida do servidor:', response);
          throw new Error('Resposta do servidor inválida');
        }

        // Mapear para o formato esperado
        return {
          id: String(product.id),
          name: product.name,
          category_id: product.category_id ? String(product.category_id) : undefined,
          unit: product.unit as ProductUnit,
          user_id: product.user_id,
          created_at: product.created_at,
          updated_at: product.updated_at,
        } as Product;
      }),
      tap((newProduct) => {
        // Invalidar cache de produtos
        this.cacheService.clearByPattern('/shopping/products');
        this.products.update((products) =>
          [...products, newProduct].sort((a, b) => a.name.localeCompare(b.name)),
        );
        this.notificationService.show('Produto adicionado!', 'success');
      }),
      catchError((err) => {
        console.error('Error adding product:', err);
        console.error('Error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
        });

        // Se o status for 201, o produto foi criado mas pode haver problema no parsing
        if (err.status === 201) {
          console.warn('Status 201 recebido - produto criado mas resposta pode estar malformada');
          // Tentar recarregar os produtos para sincronizar
          this.loadInitialData().subscribe();
          this.notificationService.show('Produto adicionado! Recarregando lista...', 'success');
          return throwError(() => err);
        }

        // Extrair mensagem de erro do backend
        let errorMessage = 'Erro ao adicionar produto.';

        if (err.error) {
          // Priorizar mensagem do backend
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.error) {
            errorMessage = err.error.error;
          } else if (err.error.detail) {
            errorMessage = err.error.detail;
          }
        } else if (err.status === 500) {
          // Mensagem genérica para erro 500
          errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
        } else if (!err.status || err.status === 0) {
          // Sem resposta do servidor
          errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
        }

        this.notificationService.show(errorMessage, 'error');
        return throwError(() => err);
      }),
    );
  }

  updateProduct(product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/products/${product.id}`, product).pipe(
      tap((updatedProduct) => {
        // Invalidar cache de produtos
        this.cacheService.clearByPattern('/shopping/products');
        this.products.update((products) =>
          products
            .map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        this.notificationService.show('Produto atualizado!', 'success');
      }),
      catchError((err) => {
        this.notificationService.show('Erro ao atualizar produto.', 'error');
        return throwError(() => err);
      }),
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${id}`).pipe(
      tap(() => {
        // Invalidar cache de produtos
        this.cacheService.clearByPattern('/shopping/products');
        this.products.update((products) => products.filter((p) => p.id !== id));
        this.notificationService.show('Produto excluído!', 'success');
      }),
      catchError((err) => {
        this.notificationService.show('Erro ao excluir produto.', 'error');
        return throwError(() => err);
      }),
    );
  }

  addMultipleItems(
    itemsData: { productId: string; quantity: number; price: number }[],
  ): Observable<ShoppingListItem[]> {
    const activeId = this.activeListId();
    if (!activeId) return throwError(() => new Error('No active list'));

    return this.http
      .post<ShoppingListItem[]>(`${this.apiUrl}/lists/${activeId}/items`, itemsData)
      .pipe(
        tap((newItems: ShoppingListItem[]) => {
          // Invalidar cache de listas
          this.cacheService.clearByPattern('/shopping/lists');
          this.shoppingLists.update((lists) =>
            lists.map((l) => {
              if (l.id === activeId) {
                return { ...l, items: [...l.items, ...newItems] };
              }
              return l;
            }),
          );
          this.notificationService.show(`${newItems.length} itens adicionados!`, 'success');
        }),
        catchError((err) => {
          this.notificationService.show('Erro ao adicionar itens.', 'error');
          return throwError(() => err);
        }),
      );
  }
}
