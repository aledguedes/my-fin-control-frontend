import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (uiService.confirmModal(); as modal) {
      <div
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        >
          <div class="p-6">
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                [class.bg-red-100]="modal.type === 'danger'"
                [class.text-red-600]="modal.type === 'danger'"
                [class.bg-amber-100]="modal.type === 'warning' || !modal.type"
                [class.text-amber-600]="modal.type === 'warning' || !modal.type"
                [class.bg-blue-100]="modal.type === 'info'"
                [class.text-blue-600]="modal.type === 'info'"
              >
                @if (modal.type === 'danger') {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                } @else {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              </div>
              <h3 class="text-xl font-bold text-gray-900">{{ modal.title }}</h3>
            </div>
            <p class="text-gray-600 leading-relaxed">{{ modal.message }}</p>
          </div>
          <div class="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3">
            <button
              (click)="modal.onConfirm()"
              class="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95"
              [class.bg-red-600]="modal.type === 'danger'"
              [class.hover:bg-red-700]="modal.type === 'danger'"
              [class.bg-indigo-600]="modal.type !== 'danger'"
              [class.hover:bg-indigo-700]="modal.type !== 'danger'"
            >
              {{ modal.confirmText || 'Confirmar' }}
            </button>
            <button
              (click)="uiService.closeConfirmModal()"
              class="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
            >
              {{ modal.cancelText || 'Cancelar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmModalComponent {
  uiService = inject(UiService);
}
