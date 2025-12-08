import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FaqModalComponent } from '../../components/faq-modal/faq-modal.component';
import { LogoutModalComponent } from '../../components/logout-modal/logout-modal.component';
import { AuthService } from '../../services/auth.service';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  hoverColor: string;
  emoji: string;
  description: string;
}

interface CarouselSlide {
  title: string;
  highlight: string;
  tag: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
  backgroundImage: string;
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
  
  // Carousel properties
  currentSlide: number = 0;
  isTransitioning: boolean = false;
  autoPlayInterval: any;
  
  private timeInterval: any;
  userName: string = 'Usuario';
  userEmail: string = '';
  private destroy$ = new Subject<void>();
  
  private authService = inject(AuthService);

  // Carousel slides configuration
  carouselSlides: CarouselSlide[] = [
    {
      title: 'Tu Viaje Hacia una',
      highlight: 'Mejor Comunicación',
      tag: 'NUEVO ENFOQUE',
      description: 'Ejercicios personalizados y divertidos que te ayudarán a mejorar tu habla día a día',
      primaryAction: 'COMENZAR AHORA',
      secondaryAction: 'VER JUEGOS',
      backgroundImage: 'assets/images/hero-slide-1.jpg'
    },
    {
      title: 'Aprende Jugando con',
      highlight: 'Juegos Terapéuticos',
      tag: 'PRÁCTICA DIVERTIDA',
      description: 'Juegos especialmente diseñados para fortalecer los músculos de tu boca mientras te diviertes',
      primaryAction: 'JUGAR AHORA',
      secondaryAction: 'HABLAR CON IA',
      backgroundImage: 'assets/images/hero-slide-2.jpg'
    },
    {
      title: 'Tu Compañero de',
      highlight: 'Práctica con IA',
      tag: 'ASISTENTE INTELIGENTE',
      description: 'Practica conversaciones y mejora tu pronunciación con nuestro asistente de inteligencia artificial',
      primaryAction: 'CHATEAR CON IA',
      secondaryAction: 'VER EJERCICIOS',
      backgroundImage: 'assets/images/hero-slide-3.jpg'
    }
  ];

  // Menu items configuration
  menuItems: MenuItem[] = [
    {
      id: 'agenda',
      title: 'Mis Actividades',
      subtitle: 'Ejercicios completados',
      color: 'from-blue-400 to-blue-600',
      hoverColor: 'from-blue-500 to-blue-700',
      emoji: '📅',
      description: 'Ve tus ejercicios realizados'
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
      id: 'juegos-terapeuticos',
      title: 'Juegos Terapéuticos',
      subtitle: '¡Diviértete mientras entrenas!',
      color: 'from-pink-400 to-pink-600',
      hoverColor: 'from-pink-500 to-pink-700',
      emoji: '🎮',
      description: 'Juegos para fortalecer tu boca'
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
      id: 'guia-tutores',
      title: 'Guía para Padres',
      subtitle: 'Recursos y apoyo',
      color: 'from-orange-400 to-orange-600',
      hoverColor: 'from-orange-500 to-orange-700',
      emoji: '👨‍👩‍👧',
      description: 'Información para apoyar la terapia'
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
    this.loadUserData();
    this.startAutoPlay();
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Carousel methods
  startAutoPlay(): void {
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  nextSlide(): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.currentSlide = (this.currentSlide + 1) % this.carouselSlides.length;
    
    setTimeout(() => {
      this.isTransitioning = false;
    }, 600);
  }

  previousSlide(): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.currentSlide = this.currentSlide === 0 
      ? this.carouselSlides.length - 1 
      : this.currentSlide - 1;
    
    setTimeout(() => {
      this.isTransitioning = false;
    }, 600);
  }

  goToSlide(index: number): void {
    if (this.isTransitioning || this.currentSlide === index) return;
    
    this.isTransitioning = true;
    this.currentSlide = index;
    
    this.stopAutoPlay();
    this.startAutoPlay();
    
    setTimeout(() => {
      this.isTransitioning = false;
    }, 600);
  }

  private loadUserData(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.userName = user.name || user.username || 'Usuario';
          this.userEmail = user.email || '';
          console.log('✅ Usuario cargado:', this.userName);
        } else {
          this.userName = 'Usuario';
          this.userEmail = '';
        }
      });
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
    
    this.stopAutoPlay();
    
    switch(item.id) {
      case 'agenda':
        this.router.navigate(['/mi-agenda']);
        console.log('📅 Navegando a Mi Agenda...');
        break;
      
      case 'juegos':
        this.router.navigate(['/ejercicios']);
        break;

      case 'juegos-terapeuticos':
        this.router.navigate(['/juegos-terapeuticos']);
        console.log('🎮 Navegando a Juegos Terapéuticos...');
        break;
      
      case 'practicas':
        this.router.navigate(['/chat/assistant-page']);
        console.log('🤖 Navegando a FonoBot...');
        break;
      
      // ========== ✅ NAVEGACIÓN A GUÍA PARA TUTORES ==========
      case 'guia-tutores':
        this.router.navigate(['/guia-tutores']);
        console.log('👨‍👩‍👧 Navegando a Guía para Padres...');
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
  }

  goToHelp() {
    this.showFaqModal = true;
    this.closeUserMenu();
    console.log('Abriendo preguntas frecuentes...');
  }

  closeFaqModal() {
    this.showFaqModal = false;
  }

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
  }

  logout() {
    this.closeUserMenu();
    console.log('Cerrando sesión directamente...');
    this.router.navigate(['/login']);
  }

  // ✅ MÉTODO PARA NAVEGAR AL CHATBOT DE FONOBOT
  goToFonoBot() {
    console.log('🤖 Navegando al chatbot FonoBot...');
    this.router.navigate(['/chat/assistant-page'], { 
      replaceUrl: true,
      skipLocationChange: false 
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const userMenuContainer = document.querySelector('.user-menu-container');
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (userMenuContainer && !userMenuContainer.contains(target) && !themeToggle?.contains(target)) {
      this.showUserMenu = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
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
  }
}