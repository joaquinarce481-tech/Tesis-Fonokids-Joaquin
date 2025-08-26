import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarMenuItemComponent } from '../../components/sidebarMenuItem/sidebarMenuItem.component';
import { routes } from '../../../app.routes';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarMenuItemComponent,
  ],
  templateUrl: './dashboardLayout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutComponent implements OnInit {
  // 🔥 Obtener las rutas hijas del DashboardLayout
  public routes = routes
    .find(route => route.component === DashboardLayoutComponent)
    ?.children
    ?.filter((route) => route.data) || [];

  constructor(private router: Router) {}

  ngOnInit() {
    // 🔥 DEBUG: Imprimir la URL actual
    console.log('URL actual:', this.router.url);
    
    // 🔥 FORZAR NAVEGACIÓN A ORTOGRAFÍA POR DEFECTO
    // Verificar múltiples condiciones posibles
    const currentUrl = this.router.url;
    
    if (currentUrl === '/chat' || 
        currentUrl === '/chat/' || 
        currentUrl === '/chat/assistant' ||
        currentUrl.includes('/chat') && !currentUrl.includes('orthography')) {
      
      console.log('Redirigiendo a ortografía...');
      
      // Usar setTimeout para asegurar que la navegación ocurra después del ciclo de renderizado
      setTimeout(() => {
        this.router.navigate(['/chat/orthography']);
      }, 0);
    }
  }
}