import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login-profesional',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-profesional.html',
  styleUrls: ['./login-profesional.css']
})
export class LoginProfesionalComponent {
  
  username: string = '';
  password: string = '';
  error: string = '';
  cargando: boolean = false;
  mostrarPassword: boolean = false;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Si ya está logueado como profesional, redirigir al panel
    const profesional = localStorage.getItem('fonokids_profesional');
    if (profesional) {
      this.router.navigate(['/panel-profesional']);
    }
  }

  /**
   * Intenta hacer login como profesional
   */
  login(): void {
    // Validaciones
    if (!this.username.trim()) {
      this.error = 'Ingresa tu usuario';
      return;
    }
    if (!this.password) {
      this.error = 'Ingresa tu contraseña';
      return;
    }

    this.cargando = true;
    this.error = '';

    console.log('🩺 Intentando login profesional:', this.username);

    this.http.post<any>(`${environment.backendLogin}/api/auth/profesional/login`, {
      username: this.username,
      password: this.password
    }).subscribe({
      next: (response) => {
        console.log('✅ Login profesional exitoso');
        
        // Guardar datos del profesional
        localStorage.setItem('fonokids_profesional_token', response.token);
        localStorage.setItem('fonokids_profesional', JSON.stringify(response.profesional));
        
        this.cargando = false;
        
        // Navegar al panel profesional
        this.router.navigate(['/panel-profesional']);
      },
      error: (error) => {
        console.error('❌ Error en login profesional:', error);
        this.cargando = false;
        
        if (error.status === 401) {
          this.error = 'Usuario o contraseña incorrectos';
        } else if (error.status === 0) {
          this.error = 'No se puede conectar con el servidor';
        } else {
          this.error = error.error?.error || 'Error al iniciar sesión';
        }
      }
    });
  }

  /**
   * Alternar visibilidad de contraseña
   */
  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  /**
   * Volver al login de pacientes
   */
  irALoginPacientes(): void {
    this.router.navigate(['/login']);
  }
}