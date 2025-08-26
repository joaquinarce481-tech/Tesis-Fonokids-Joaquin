import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Importar FormsModule
import { CommonModule } from '@angular/common'; // Para *ngIf

@Component({
  selector: 'app-login',
  standalone: true, // IMPORTANTE: Hacer el componente standalone
  imports: [FormsModule, CommonModule], // IMPORTANTE: Importar los módulos necesarios
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isLoading = false;
  errorMessage = '';
  
  // Variables para los inputs del template
  username = '';
  password = '';

  constructor(private router: Router) {}

  // Método que usa tu template actual
  ingresar() {
    console.log('Botón ingresar presionado');
    console.log('Usuario:', this.username, 'Contraseña:', this.password);
    
    this.isLoading = true;
    this.errorMessage = '';
    
    // Simulación de login con loading
    setTimeout(() => {
      this.isLoading = false;
      
      // 🔥 CREDENCIALES TEMPORALES PARA PRUEBAS
      if (this.username.trim().toLowerCase() === 'jearce' && this.password.trim() === 'pruebas1') {
        // Login exitoso - redirigir al dashboard
        console.log('✅ Login exitoso! Redirigiendo al dashboard...');
        this.router.navigate(['/dashboard']);
      } else if (this.username.trim() === '' || this.password.trim() === '') {
        // Campos vacíosff
        this.errorMessage = '¡Ingresa tu nombre de usuario y contraseña!';
      } else {
        // Credenciales incorrectas - mostrar las correctas para pruebas
        this.errorMessage = '❌ Credenciales incorrectas. Vuelve a Probar';
      }
    }, 1500);
  }
}