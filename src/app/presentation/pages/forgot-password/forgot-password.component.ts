import { Component, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnDestroy {
  // Estados del componente
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Variable para el email
  email = '';
  
  // Para cleanup de suscripciones
  private destroy$ = new Subject<void>();
  
  // Inyección de dependencias
  private router = inject(Router);
  private authService = inject(AuthService);
  
  constructor() {
    console.log('ForgotPasswordComponent iniciado');
  }
  
  // Método principal para enviar código
  enviarCodigo(): void {
    console.log('Enviando código a:', this.email);
    
    // Validación básica
    if (!this.email.trim()) {
      this.showError('Ingresa tu email');
      return;
    }
    
    // Iniciar loading
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Solicitar código con AuthService
    this.authService.forgotPassword(this.email.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Código enviado exitosamente:', response);
          this.isLoading = false;
          this.successMessage = 'Código enviado! Revisa tu email';
          
          // Navegar a verificar código después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/verify-code'], {
              queryParams: { email: this.email.trim() }
            });
          }, 2000);
        },
        error: (error: any) => {
          console.error('Error enviando código:', error);
          this.isLoading = false;
          
          // Manejar diferentes tipos de error
          if (error.status === 404) {
            this.showError('No existe una cuenta con ese email');
          } else if (error.status === 0) {
            this.showError('No se puede conectar al servidor');
          } else if (error.error?.error) {
            this.showError(error.error.error);
          } else {
            this.showError('Error enviando código. Inténtalo de nuevo');
          }
        }
      });
  }
  
  // Volver al login
  volverAlLogin(): void {
    console.log('Volviendo al login');
    this.router.navigate(['/login']);
  }
  
  // Mostrar error con auto-hide
  private showError(message: string): void {
    this.errorMessage = message;
    
    // Auto-hide error después de 5 segundos
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }
  
  // Cleanup al destruir componente
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    console.log('ForgotPasswordComponent destruido');
  }
}