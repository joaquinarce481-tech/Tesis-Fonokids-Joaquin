import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-code',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './verify-code.component.html',
  styleUrls: ['./verify-code.component.css']
})
export class VerifyCodeComponent implements OnInit, OnDestroy {
  // Estados del componente
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Email del usuario
  email = '';
  
  // Array para los 6 dígitos del código
  codeDigits: string[] = ['', '', '', '', '', ''];
  
  // Cooldown para reenviar código
  resendCooldown = 0;
  
  // Para cleanup de suscripciones
  private destroy$ = new Subject<void>();
  
  // Inyección de dependencias
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  
  constructor() {
    console.log('VerifyCodeComponent iniciado');
  }
  
  ngOnInit(): void {
    // Obtener email de los query parameters
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.email = params['email'] || '';
      if (!this.email) {
        console.warn('No se proporcionó email, redirigiendo a forgot-password');
        this.router.navigate(['/forgot-password']);
      }
    });
  }
  
  // Manejar input de dígitos - CORREGIDO para evitar duplicación
  onDigitInput(event: any, index: number): void {
    const input = event.target;
    let value = input.value;
    
    // Si hay múltiples caracteres (por duplicación), tomar solo el último
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    // Solo permitir números
    if (!/^\d?$/.test(value)) {
      // Restaurar valor anterior y salir
      input.value = this.codeDigits[index];
      return;
    }
    
    // Actualizar el array Y el input para evitar conflictos con ngModel
    this.codeDigits[index] = value;
    input.value = value;
    
    // Mover al siguiente input si se ingresó un dígito
    if (value && index < 5) {
      setTimeout(() => {
        const nextInput = input.parentElement.children[index + 1] as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }, 0);
    }
  }
  
  // Manejar teclas especiales - COMPLETAMENTE REESCRITO
  onKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    
    // Backspace - limpiar actual y mover al anterior
    if (event.key === 'Backspace') {
      event.preventDefault();
      
      // Limpiar el campo actual
      this.codeDigits[index] = '';
      input.value = '';
      
      // Si el campo ya estaba vacío y no es el primero, ir al anterior
      if (index > 0) {
        const prevInput = input.parentElement?.children[index - 1] as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
        }
      }
      return;
    }
    
    // Delete - limpiar actual
    if (event.key === 'Delete') {
      event.preventDefault();
      this.codeDigits[index] = '';
      input.value = '';
      return;
    }
    
    // Flechas de navegación
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      const prevInput = input.parentElement?.children[index - 1] as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
      return;
    }
    
    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      const nextInput = input.parentElement?.children[index + 1] as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
      return;
    }
    
    // Enter - verificar código si está completo
    if (event.key === 'Enter' && this.isCodeComplete()) {
      event.preventDefault();
      this.verificarCodigo();
      return;
    }
    
    // Pegar desde clipboard
    if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      navigator.clipboard.readText().then(text => {
        this.pasteCode(text, index);
      }).catch(() => {
        // Ignorar errores de clipboard
      });
      return;
    }
    
    // Prevenir entrada de caracteres no numéricos
    if (!/\d/.test(event.key) && !['Tab', 'Shift'].includes(event.key)) {
      event.preventDefault();
    }
  }
  
  // Obtener código completo
  getFullCode(): string {
    return this.codeDigits.join('');
  }
  
  // Verificar si el código está completo
  isCodeComplete(): boolean {
    return this.codeDigits.every(digit => digit !== '') && this.codeDigits.length === 6;
  }
  
  // Método principal para verificar código
  verificarCodigo(): void {
    const code = this.getFullCode();
    console.log('Verificando código:', code);
    
    if (!this.isCodeComplete()) {
      this.showError('Ingresa los 6 dígitos del código');
      return;
    }
    
    // Iniciar loading
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Verificar código con AuthService
    this.authService.verifyResetCode(this.email, code)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Código verificado exitosamente:', response);
          this.isLoading = false;
          this.successMessage = 'Código verificado correctamente';
          
          // Navegar a reset password después de 1.5 segundos
          setTimeout(() => {
            this.router.navigate(['/reset-password'], {
              queryParams: { 
                email: this.email,
                code: code 
              }
            });
          }, 1500);
        },
        error: (error: any) => {
          console.error('Error verificando código:', error);
          this.isLoading = false;
          
          // Manejar diferentes tipos de error
          if (error.status === 400) {
            this.showError('Código inválido o expirado');
            this.clearCode();
          } else if (error.status === 0) {
            this.showError('No se puede conectar al servidor');
          } else if (error.error?.error) {
            this.showError(error.error.error);
          } else {
            this.showError('Error verificando código. Inténtalo de nuevo');
          }
        }
      });
  }
  
  // Reenviar código
  reenviarCodigo(): void {
    if (this.resendCooldown > 0) return;
    
    console.log('Reenviando código a:', this.email);
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Solicitar nuevo código
    this.authService.forgotPassword(this.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Código reenviado exitosamente:', response);
          this.isLoading = false;
          this.successMessage = 'Nuevo código enviado';
          this.clearCode();
          
          // Iniciar cooldown de 60 segundos
          this.startResendCooldown();
        },
        error: (error: any) => {
          console.error('Error reenviando código:', error);
          this.isLoading = false;
          this.showError('Error reenviando código. Inténtalo de nuevo');
        }
      });
  }
  
  // Iniciar cooldown para reenvío
  private startResendCooldown(): void {
    this.resendCooldown = 60;
    const interval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }
  
  // Limpiar código
  private clearCode(): void {
    this.codeDigits = ['', '', '', '', '', ''];
    // Enfocar primer input
    setTimeout(() => {
      const firstInput = document.querySelector('.code-digit') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }
  
  // NUEVO MÉTODO - Manejar pegado de código
  private pasteCode(text: string, startIndex: number): void {
    // Limpiar el texto y quedarse solo con números
    const numbers = text.replace(/\D/g, '');
    
    if (numbers.length === 0) return;
    
    // Llenar los campos desde la posición actual
    for (let i = 0; i < numbers.length && (startIndex + i) < 6; i++) {
      this.codeDigits[startIndex + i] = numbers[i];
      
      // Actualizar el input visual
      const input = document.querySelector(`.code-digit:nth-child(${startIndex + i + 1})`) as HTMLInputElement;
      if (input) {
        input.value = numbers[i];
      }
    }
    
    // Mover el foco al siguiente campo disponible o al último
    const nextIndex = Math.min(startIndex + numbers.length, 5);
    const nextInput = document.querySelector(`.code-digit:nth-child(${nextIndex + 1})`) as HTMLInputElement;
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  }
  
  // Volver a forgot-password
  volver(): void {
    console.log('Volviendo a forgot-password');
    this.router.navigate(['/forgot-password']);
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
    console.log('VerifyCodeComponent destruido');
  }
}