import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
  user?: User;
}

export interface ApiResponse {
  message: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:3001/api/auth'; // Siguiendo tu patrón
  
  // 🔐 Estado de autenticación
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredAuth();
  }

  // 🔄 Cargar autenticación guardada
  private loadStoredAuth(): void {
    const token = localStorage.getItem('fonokids_token');
    const user = localStorage.getItem('fonokids_user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        this.currentUserSubject.next(userData);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        console.error('Error cargando usuario guardado:', error);
        this.logout();
      }
    }
  }

  // 🔑 LOGIN
  login(username: string, password: string): Observable<AuthResponse> {
    console.log('🔐 AuthService: Intentando login...', username);
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, {
      username,
      password
    }).pipe(
      tap(response => {
        if (response.token && response.user) {
          console.log('✅ Login exitoso:', response.user.username);
          
          // Guardar en localStorage
          localStorage.setItem('fonokids_token', response.token);
          localStorage.setItem('fonokids_user', JSON.stringify(response.user));
          
          // Actualizar estado
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError(error => {
        console.error('❌ Error en login:', error);
        return throwError(() => error);
      })
    );
  }

  // 🚪 LOGOUT
  logout(): void {
    console.log('🚪 Cerrando sesión...');
    
    // Limpiar localStorage
    localStorage.removeItem('fonokids_token');
    localStorage.removeItem('fonokids_user');
    
    // Resetear estado
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Navegar al login
    this.router.navigate(['/login']);
  }

  // 📧 FORGOT PASSWORD - Solicitar código
  forgotPassword(email: string): Observable<ApiResponse> {
    console.log('📧 Solicitando código de recuperación para:', email);
    
    return this.http.post<ApiResponse>(`${this.apiUrl}/forgot-password`, {
      email
    }).pipe(
      tap(response => {
        console.log('✅ Código de recuperación enviado');
      }),
      catchError(error => {
        console.error('❌ Error solicitando código:', error);
        return throwError(() => error);
      })
    );
  }

  // 🔍 VERIFY CODE - Verificar código de recuperación
  verifyResetCode(email: string, code: string): Observable<ApiResponse> {
    console.log('🔍 Verificando código para:', email);
    
    return this.http.post<ApiResponse>(`${this.apiUrl}/verify-reset-code`, {
      email,
      code
    }).pipe(
      tap(response => {
        console.log('✅ Código verificado correctamente');
      }),
      catchError(error => {
        console.error('❌ Error verificando código:', error);
        return throwError(() => error);
      })
    );
  }

  // 🔄 RESET PASSWORD - Cambiar contraseña
  resetPassword(email: string, code: string, newPassword: string): Observable<ApiResponse> {
    console.log('🔄 Restableciendo contraseña para:', email);
    
    return this.http.post<ApiResponse>(`${this.apiUrl}/reset-password`, {
      email,
      code,
      newPassword
    }).pipe(
      tap(response => {
        console.log('✅ Contraseña actualizada exitosamente');
      }),
      catchError(error => {
        console.error('❌ Error actualizando contraseña:', error);
        return throwError(() => error);
      })
    );
  }

  // 👤 CREATE USER - Crear usuario (opcional, para admin)
  createUser(userData: {
    username: string;
    email: string;
    password: string;
    nombre_completo: string;
  }): Observable<ApiResponse> {
    console.log('👤 Creando nuevo usuario:', userData.username);
    
    return this.http.post<ApiResponse>(`${this.apiUrl}/create-user`, userData).pipe(
      tap(response => {
        console.log('✅ Usuario creado exitosamente');
      }),
      catchError(error => {
        console.error('❌ Error creando usuario:', error);
        return throwError(() => error);
      })
    );
  }

  // 🛡️ GET PROFILE - Obtener perfil (ruta protegida)
  getProfile(): Observable<{ user: User }> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<{ user: User }>(`${this.apiUrl}/profile`, { headers }).pipe(
      tap(response => {
        console.log('✅ Perfil obtenido:', response.user);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo perfil:', error);
        if (error.status === 401 || error.status === 403) {
          this.logout(); // Token inválido
        }
        return throwError(() => error);
      })
    );
  }

  // 🔗 Obtener headers de autenticación
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('fonokids_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // 🎯 GETTERS DE ESTADO
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem('fonokids_token');
  }

  // 🔄 REFRESH USER DATA
  refreshUserData(): void {
    if (this.isAuthenticated) {
      this.getProfile().subscribe({
        next: (response) => {
          this.currentUserSubject.next(response.user);
        },
        error: (error) => {
          console.error('Error refrescando datos del usuario:', error);
        }
      });
    }
  }

  // 🧹 CLEANUP - Limpiar suscripciones
  ngOnDestroy(): void {
    this.currentUserSubject.complete();
    this.isAuthenticatedSubject.complete();
  }
}