import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  CanActivateChild, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkAuth(state.url);
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkAuth(state.url);
  }

  private checkAuth(url: string): Observable<boolean> {
    console.log(' AuthGuard: Verificando acceso a:', url);
    
    return this.authService.isAuthenticated$.pipe(
      tap(isAuthenticated => {
        if (!isAuthenticated) {
          console.log(' Usuario no autenticado, redirigiendo al login');
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: url } 
          });
        } else {
          console.log('Usuario autenticado, permitiendo acceso');
        }
      }),
      map(isAuthenticated => isAuthenticated)
    );
  }
}


@Injectable({
  providedIn: 'root'
})
export class PublicGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    console.log('PublicGuard: Verificando si usuario está deslogueado');
    
    return this.authService.isAuthenticated$.pipe(
      tap(isAuthenticated => {
        if (isAuthenticated) {
          console.log('Usuario ya autenticado, redirigiendo al dashboard');
          this.router.navigate(['/dashboard']);
        } else {
          console.log(' Usuario no autenticado, permitiendo acceso a página pública');
        }
      }),
      map(isAuthenticated => !isAuthenticated)
    );
  }
}