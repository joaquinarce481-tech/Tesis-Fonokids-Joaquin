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
      
      return true;
    }

   
    console.log('Acceso denegado: Profesional no autenticado');
    this.router.navigate(['/login-profesional']);
    return false;
  }
}