import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-logout-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" (click)="onCancel()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-icon">🚪</div>
          <h2 class="modal-title">¿Cerrar Sesión?</h2>
        </div>
        
        <div class="modal-content">
          <p class="modal-message">
            ¿Estás seguro/a de que quieres cerrar sesión?
          </p>
          <p class="modal-submessage">
            Tendrás que iniciar sesión nuevamente para continuar.
          </p>
        </div>
        
        <div class="modal-actions">
          <button 
            class="btn-cancel" 
            (click)="onCancel()"
            [disabled]="isLoading"
          >
            Cancelar
          </button>
          <button 
            class="btn-confirm" 
            (click)="onConfirm()"
            [disabled]="isLoading"
          >
            <span *ngIf="!isLoading">Cerrar Sesión</span>
            <span *ngIf="isLoading">Cerrando...</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease-out;
    }

    .modal-container {
      background: linear-gradient(145deg, 
        rgba(255, 255, 255, 0.95) 0%, 
        rgba(255, 255, 255, 0.9) 100%);
      backdrop-filter: blur(20px);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 25px;
      padding: 2rem;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease-out;
      text-align: center;
    }

    .modal-header {
      margin-bottom: 1.5rem;
    }

    .modal-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .modal-title {
      font-family: 'Arial', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #4a5568;
      margin: 0;
    }

    .modal-content {
      margin-bottom: 2rem;
    }

    .modal-message {
      font-size: 1.1rem;
      font-weight: 600;
      color: #2d3748;
      margin: 0 0 0.5rem 0;
      line-height: 1.4;
    }

    .modal-submessage {
      font-size: 0.95rem;
      color: #718096;
      margin: 0;
      line-height: 1.4;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn-cancel, .btn-confirm {
      flex: 1;
      padding: 1rem 1.5rem;
      border-radius: 15px;
      border: none;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-cancel {
      background: linear-gradient(135deg, 
        rgba(107, 114, 128, 0.1) 0%, 
        rgba(75, 85, 99, 0.1) 100%);
      color: #4b5563;
      border: 2px solid rgba(107, 114, 128, 0.3);
    }

    .btn-cancel:hover:not(:disabled) {
      background: linear-gradient(135deg, 
        rgba(107, 114, 128, 0.2) 0%, 
        rgba(75, 85, 99, 0.2) 100%);
      transform: translateY(-2px);
    }

    .btn-confirm {
      background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
      color: white;
      box-shadow: 0 6px 20px rgba(245, 101, 101, 0.4);
    }

    .btn-confirm:hover:not(:disabled) {
      background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(245, 101, 101, 0.6);
    }

    .btn-cancel:disabled,
    .btn-confirm:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }

    @keyframes slideUp {
      0% { 
        opacity: 0; 
        transform: translateY(30px) scale(0.9); 
      }
      100% { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
    }

    @media (max-width: 480px) {
      .modal-container {
        padding: 1.5rem;
        margin: 1rem;
      }
      
      .modal-actions {
        flex-direction: column;
      }
    }
  `]
})
export class LogoutModalComponent {
  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
  
  isLoading = false;
  
  private authService = inject(AuthService);
  
  onCancel() {
    this.cancel.emit();
  }
  
  onConfirm() {
    this.isLoading = true;
    
    setTimeout(() => {
      this.authService.logout();
      this.confirm.emit();
    }, 800);
  }
}