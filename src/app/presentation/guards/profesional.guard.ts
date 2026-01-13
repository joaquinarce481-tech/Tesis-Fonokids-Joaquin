import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ProfesionalGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    const profesional = localStorage.getItem('fonokids_profesional');
    const token = localStorage.getItem('fonokids_profesional_token');

    if (profesional && token) {
      // Profesional logueado, permitir acceso
      return true;
    }

    // No está logueado, redirigir al login de profesionales
    console.log('🚫 Acceso denegado: Profesional no autenticado');
    this.router.navigate(['/login-profesional']);
    return false;
  }
}