import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  // Estados del componente
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Datos del usuario
  email = '';
  code = '';
  
  // Contraseñas
  newPassword = '';
  confirmPassword = '';
  
  // Para cleanup de suscripciones
  private destroy$ = new Subject<void>();
  
  // Inyección de dependencias
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  
  constructor() {
    console.log('ResetPasswordComponent iniciado');
  }
  
  ngOnInit(): void {
    // Obtener email y código de los query parameters
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.email = params['email'] || '';
      this.code = params['code'] || '';
      
      if (!this.email || !this.code) {
        console.warn('Faltan parámetros, redirigiendo a forgot-password');
        this.router.navigate(['/forgot-password']);
      }
    });
  }
  
  // Método principal para cambiar contraseña
  cambiarContrasena(): void {
    console.log('Cambiando contraseña para:', this.email);
    
    // Validaciones
    if (!this.isFormValid()) {
      this.showError('Por favor completa todos los campos correctamente');
      return;
    }
    
    // Iniciar loading
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Cambiar contraseña con AuthService
    this.authService.resetPassword(this.email, this.code, this.newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Contraseña cambiada exitosamente:', response);
          this.isLoading = false;
          this.successMessage = 'Contraseña cambiada exitosamente';
          
          // Navegar al login después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: { message: 'password-changed' }
            });
          }, 2000);
        },
        error: (error: any) => {
          console.error('Error cambiando contraseña:', error);
          this.isLoading = false;
          
          // Manejar diferentes tipos de error
          if (error.status === 400) {
            this.showError('Código inválido o expirado');
          } else if (error.status === 0) {
            this.showError('No se puede conectar al servidor');
          } else if (error.error?.error) {
            this.showError(error.error.error);
          } else {
            this.showError('Error cambiando contraseña. Inténtalo de nuevo');
          }
        }
      });
  }
  
  // Validar formulario completo
  isFormValid(): boolean {
    return this.newPassword.length >= 6 &&
           this.confirmPassword.length >= 6 &&
           this.passwordsMatch() &&
           this.hasMinimumStrength();
  }
  
  // Verificar si las contraseñas coinciden
  passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword && this.confirmPassword.length > 0;
  }
  
  // Verificar mayúsculas
  hasUpperCase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }
  
  // Verificar números
  hasNumber(): boolean {
    return /\d/.test(this.newPassword);
  }
  
  // Verificar caracteres especiales
  hasSpecialChar(): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(this.newPassword);
  }
  
  // Verificar fortaleza mínima
  hasMinimumStrength(): boolean {
    return this.newPassword.length >= 6;
  }
  
  // Calcular fortaleza de contraseña (0-100)
  getStrengthPercentage(): number {
    let strength = 0;
    
    if (this.newPassword.length >= 6) strength += 25;
    if (this.newPassword.length >= 8) strength += 15;
    if (this.hasUpperCase()) strength += 20;
    if (/[a-z]/.test(this.newPassword)) strength += 10;
    if (this.hasNumber()) strength += 20;
    if (this.hasSpecialChar()) strength += 10;
    
    return Math.min(strength, 100);
  }
  
  // Obtener clase CSS para la fortaleza
  getStrengthClass(): string {
    const percentage = this.getStrengthPercentage();
    
    if (percentage < 40) return 'weak';
    if (percentage < 70) return 'medium';
    return 'strong';
  }
  
  // Obtener texto de fortaleza
  getStrengthText(): string {
    const percentage = this.getStrengthPercentage();
    
    if (percentage < 40) return 'Débil';
    if (percentage < 70) return 'Media';
    return 'Fuerte';
  }
  
  // Evento al cambiar contraseña
  onPasswordChange(): void {
    // Limpiar mensajes de error cuando el usuario escriba
    if (this.errorMessage && (this.newPassword || this.confirmPassword)) {
      this.errorMessage = '';
    }
  }
  
  // Volver a verify-code
  volver(): void {
    console.log('Volviendo a verify-code');
    this.router.navigate(['/verify-code'], {
      queryParams: { email: this.email }
    });
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
    console.log('ResetPasswordComponent destruido');
  }
}