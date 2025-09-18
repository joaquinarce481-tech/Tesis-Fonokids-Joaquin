import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FaqModalComponent } from '../../components/faq-modal/faq-modal.component';
import { LogoutModalComponent } from '../../../presentation/components/logout-modal/logout-modal.component';
import { AuthService } from '../../services/auth.service'; // 🆕 IMPORT AUTHSERVICE

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  hoverColor: string;
  emoji: string;
  description: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FaqModalComponent, LogoutModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  selectedItem: string | null = null;
  currentTime = new Date();
  showUserMenu: boolean = false;
  isDarkMode: boolean = false;
  showFaqModal: boolean = false;
  showLogoutModal: boolean = false;
  private timeInterval: any;
  
  // 🆕 NUEVAS PROPIEDADES PARA DATOS DEL USUARIO
  userName: string = 'Usuario';
  userEmail: string = '';
  private destroy$ = new Subject<void>();
  
  // 🆕 INYECCIÓN DEL AUTHSERVICE
  private authService = inject(AuthService);

  menuItems: MenuItem[] = [
    {
      id: 'agenda',
      title: 'Mi Agenda',
      subtitle: 'Próximas sesiones',
      color: 'from-blue-400 to-blue-600',
      hoverColor: 'from-blue-500 to-blue-700',
      emoji: '📅',
      description: 'Ve tus citas programadas'
    },
    {
      id: 'juegos',
      title: 'Analisis de tus Practicas',
      subtitle: '¡A practicar!',
      color: 'from-purple-400 to-purple-600',
      hoverColor: 'from-purple-500 to-purple-700',
      emoji: '🎥',
      description: 'Haz tus movimientos de practicas'
    },
    {
      id: 'practicas',
      title: 'Preguntas con la IA',
      subtitle: 'Practica con la IA para mejorar',
      color: 'from-green-400 to-green-600',
      hoverColor: 'from-green-500 to-green-700',
      emoji: '🤖💻',
      description: 'Charla con la Inteligencia Artificial'
    },
    {
      id: 'contacto',
      title: 'Hablar con mi Fonoaudióloga',
      subtitle: 'Siempre aquí para ayudarte',
      color: 'from-orange-400 to-orange-600',
      hoverColor: 'from-orange-500 to-orange-700',
      emoji: '👩‍⚕️',
      description: 'Contacta a tu especialista'
    }
  ];

  constructor(private router: Router) {
    this.updateTime();
    this.timeInterval = setInterval(() => {
      this.updateTime();
    }, 1000);
  }

  ngOnInit() {
    this.loadDarkModePreference();
    this.loadUserData(); // 🆕 CARGAR DATOS DEL USUARIO
  }

  // 🆕 NUEVO MÉTODO PARA CARGAR DATOS DEL USUARIO
  private loadUserData(): void {
    // Suscribirse a los cambios del usuario actual
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          // Si hay un usuario, usar su nombre
          this.userName = user.name || user.username || 'Usuario';
          this.userEmail = user.email || '';
          console.log('✅ Usuario cargado:', this.userName);
        } else {
          // Si no hay usuario, valores por defecto
          this.userName = 'Usuario';
          this.userEmail = '';
        }
      });
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    // 🆕 CLEANUP DE SUSCRIPCIONES
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateTime() {
    this.currentTime = new Date();
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    this.saveDarkModePreference();
    
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    console.log(`Modo ${this.isDarkMode ? 'oscuro' : 'claro'} activado`);
  }

  private saveDarkModePreference() {
    localStorage.setItem('darkMode', JSON.stringify(this.isDarkMode));
  }

  private loadDarkModePreference() {
    const savedPreference = localStorage.getItem('darkMode');
    if (savedPreference !== null) {
      this.isDarkMode = JSON.parse(savedPreference);
    } else {
      this.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }

  handleItemClick(item: MenuItem) {
    this.selectedItem = item.id;
    console.log(`Navegando a: ${item.title}`);
    
    switch(item.id) {
      case 'contacto':
        console.log('Función de contacto aún no implementada');
        break;
      
      case 'agenda':
        console.log('Función de agenda aún no implementada');
        break;
      
      case 'juegos':
        this.router.navigate(['/ejercicios']);
        break;
      
      case 'practicas':
        this.router.navigate(['/chat/assistant']);
        break;
    }
    
    setTimeout(() => {
      this.selectedItem = null;
    }, 1000);
  }

  formatTime(): string {
    return this.currentTime.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  getGreeting(): string {
    const hour = this.currentTime.getHours();
    if (hour < 12) return '¡Buenos días!';
    if (hour < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  goToProfile() {
    this.closeUserMenu();
    console.log('Navegando a perfil...');
    this.router.navigate(['/mi-perfil']);
  }

  goToSettings() {
    this.closeUserMenu();
    console.log('Navegando a configuración...');
    // this.router.navigate(['/settings']);
  }

  goToHelp() {
    this.showFaqModal = true;
    this.closeUserMenu();
    console.log('Abriendo preguntas frecuentes...');
  }

  closeFaqModal() {
    this.showFaqModal = false;
  }

  // MÉTODOS PARA EL MODAL DE LOGOUT
  showLogoutConfirmation() {
    this.showLogoutModal = true;
    this.closeUserMenu();
    console.log('Mostrando confirmación de logout...');
  }

  onLogoutCancel() {
    this.showLogoutModal = false;
    console.log('Logout cancelado');
  }

  onLogoutConfirm() {
    this.showLogoutModal = false;
    console.log('Logout confirmado - el modal maneja la navegación automáticamente');
    // El modal ya maneja el logout automáticamente en su componente
  }

  // MÉTODO LEGACY (mantener por compatibilidad)
  logout() {
    this.closeUserMenu();
    console.log('Cerrando sesión directamente...');
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any) {
    const target = event.target;
    const userMenuContainer = document.querySelector('.user-menu-container');
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (userMenuContainer && !userMenuContainer.contains(target) && !themeToggle?.contains(target)) {
      this.showUserMenu = false;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.showUserMenu) {
      this.closeUserMenu();
    }
    
    if (this.showFaqModal) {
      this.closeFaqModal();
    }
    
    if (this.showLogoutModal) {
      this.onLogoutCancel();
    }
  }

  @HostListener('window:matchMedia', ['(prefers-color-scheme: dark)'])
  onSystemThemeChange(event: MediaQueryListEvent) {
    const savedPreference = localStorage.getItem('darkMode');
    if (savedPreference === null) {
      this.isDarkMode = event.matches;
    }
  }
}