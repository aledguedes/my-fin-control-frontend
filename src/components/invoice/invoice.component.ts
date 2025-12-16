import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ShoppingList } from '../../models/shopping.model';
import { ShoppingService } from '../../services/shopping.service';
import { AuthService } from '../../services/auth.service';

interface InvoiceItem {
  id: string;
  productName: string;
  categoryName: string;
  quantity: number;
  price: number;
  unit: string;
  total: number;
}

interface FormattedInvoiceItem extends InvoiceItem {
  formattedPrice: string;
  formattedTotal: string;
}

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private shoppingService = inject(ShoppingService);

  listId = signal<string | null>(null);

  invoiceData = computed<ShoppingList | null>(() => {
    const id = this.listId();
    if (!id) return null;
    return this.shoppingService.shoppingLists().find((list) => list.id === id) || null;
  });

  ngOnInit(): void {
    const listId = this.route.snapshot.paramMap.get('listId');
    if (!listId) {
      this.router.navigate(['/shopping']);
      return;
    }
    this.listId.set(listId);

    // Verificar se a lista já tem items carregados
    const existingList = this.shoppingService.shoppingLists().find((l) => l.id === listId);

    // Se a lista não existe ou não tem items, carregar os detalhes da API
    if (!existingList || !existingList.items || existingList.items.length === 0) {
      this.shoppingService.loadListDetails(listId).subscribe({
        next: () => {
          // Lista carregada e atualizada no signal, o computed invoiceData() será atualizado automaticamente
        },
        error: (err) => {
          console.error('Erro ao carregar detalhes da lista:', err);
        },
      });
    }
  }

  // Computed properties
  invoiceItems = computed<InvoiceItem[]>(() => {
    const data = this.invoiceData();
    if (!data) return [];
    return data.items.map((item) => ({
      id: item.id,
      productName: item.product_name || item.name,
      categoryName: item.category_name || '',
      quantity: item.quantity,
      price: item.price,
      unit: item.unit,
      total: item.quantity * item.price,
    }));
  });

  invoiceId = computed(() => {
    const data = this.invoiceData();
    if (!data) return '';
    const date = new Date(data.completed_at || data.created_at);
    const year = date.getFullYear();
    const shortId = data.id.substring(0, 3).toUpperCase();
    return `#INV-${year}-${shortId}`;
  });

  formattedDate = computed(() => {
    const data = this.invoiceData();
    if (!data) return '';
    const dateString = data.completed_at || data.created_at;
    const date = new Date(dateString);
    const months = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    return `${date.getDate()} de ${months[date.getMonth()]}, ${date.getFullYear()}`;
  });

  userInfo = computed(() => {
    const token = this.authService.getToken();
    if (!token) {
      return { name: 'Usuário', email: 'usuario@email.com' };
    }

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const decoded = JSON.parse(decodedPayload);
      return {
        name: decoded.name || decoded.username || 'Usuário',
        email: decoded.email || 'usuario@email.com',
      };
    } catch (e) {
      return { name: 'Usuário', email: 'usuario@email.com' };
    }
  });

  subtotal = computed(() => {
    return this.invoiceItems().reduce((sum, item) => sum + item.total, 0);
  });

  formattedSubtotal = computed(() => {
    return this.formatCurrency(this.subtotal());
  });

  formattedTotal = computed(() => {
    const data = this.invoiceData();
    return this.formatCurrency(data?.total_amount || 0);
  });

  formattedInvoiceItems = computed<FormattedInvoiceItem[]>(() => {
    return this.invoiceItems().map((item) => ({
      ...item,
      formattedPrice: this.formatCurrency(item.price),
      formattedTotal: this.formatCurrency(item.total),
    }));
  });

  private formatCurrency(amount: number): string {
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  handleClose(): void {
    this.router.navigate(['/shopping']);
  }
}
