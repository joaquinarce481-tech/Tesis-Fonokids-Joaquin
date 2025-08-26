import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FaqModalComponent } from '../../components/faq-modal/faq-modal.component'; // ✅ AGREGAR

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
  imports: [CommonModule, FaqModalComponent], // ✅ AGREGAR FaqModalComponent
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  selectedItem: string | null = null;
  currentTime = new Date();
  showUserMenu: boolean = false;
  isDarkMode: boolean = false;
  showFaqModal: boolean = false; // ✅ AGREGAR ESTA PROPIEDAD
  private timeInterval: any;

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
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
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

  // 🔥 MÉTODO ACTUALIZADO CON LA RUTA CORRECTA
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
        // Navegar a ejercicios orofaciales
        this.router.navigate(['/ejercicios']);
        break;
      
      case 'practicas':
        // 🔥 NAVEGAR AL CHATBOT FONOKIDS CON EL LAYOUT COMPLETO
        this.router.navigate(['/chat/assistant']);  // 🔥 CAMBIÉ DE '/assistant' a '/chat/assistant'
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
    // this.router.navigate(['/profile']);
  }

  goToSettings() {
    this.closeUserMenu();
    console.log('Navegando a configuración...');
    // this.router.navigate(['/settings']);
  }

  // ✅ MÉTODO ACTUALIZADO PARA ABRIR EL MODAL
  goToHelp() {
    this.showFaqModal = true; // ✅ CAMBIAR PARA ABRIR EL MODAL
    this.closeUserMenu();
    console.log('Abriendo preguntas frecuentes...');
  }

  // ✅ NUEVO MÉTODO PARA CERRAR EL MODAL
  closeFaqModal() {
    this.showFaqModal = false;
  }

  logout() {
    this.closeUserMenu();
    console.log('Cerrando sesión...');
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
    // ✅ AGREGAR SOPORTE PARA CERRAR EL MODAL FAQ CON ESC
    if (this.showFaqModal) {
      this.closeFaqModal();
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