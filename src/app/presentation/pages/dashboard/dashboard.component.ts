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

// ========== 🔔 INTERFACE DE NOTIFICACIONES ==========
interface Notification {
  id: number;
  type: 'reminder' | 'achievement' | 'tip' | 'welcome' | 'streak';
  icon: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  action?: string;
  route?: string;
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
  
  // ========== 🔔 PROPIEDADES DE NOTIFICACIONES ==========
  showNotifications: boolean = false;
  notifications: Notification[] = [];
  unreadCount: number = 0;
  
  private timeInterval: any;
  private notificationInterval: any;
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
      secondaryAction: 'HABLAR CON ASISTENTE',
      backgroundImage: 'assets/images/hero-slide-2.jpg'
    },
    {
      title: 'Tu asistente',
      highlight: 'y Compañero de Práctica',
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
    this.initializeNotifications(); // 🔔 Inicializar notificaciones
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========================================
  // 🔔 SISTEMA DE NOTIFICACIONES - MÉTODOS
  // ========================================

  /**
   * Inicializa el sistema de notificaciones
   */
  private initializeNotifications(): void {
    // Cargar notificaciones guardadas o crear nuevas
    this.loadNotifications();
    
    // Verificar actividades del día anterior y generar notificación
    this.checkYesterdayActivities();
    
    // Verificar racha de días
    this.checkStreak();
    
    // Verificar si necesita agregar recordatorio diario
    this.checkDailyReminder();
    
    // Actualizar contador
    this.updateUnreadCount();
    
    console.log('🔔 Sistema de notificaciones inicializado');
  }

  /**
   * Carga las notificaciones desde localStorage o crea las iniciales
   */
  private loadNotifications(): void {
    const savedNotifications = localStorage.getItem('fonokids_notifications');
    const lastVisit = localStorage.getItem('fonokids_last_visit');
    const today = new Date().toDateString();
    
    if (savedNotifications) {
      this.notifications = JSON.parse(savedNotifications);
    } else {
      // Primera vez - crear notificaciones de bienvenida
      this.notifications = this.getWelcomeNotifications();
    }
    
    // Si es un nuevo día, limpiar notificaciones viejas y agregar frescas
    if (lastVisit !== today) {
      // Limpiar notificaciones de días anteriores (mantener solo las no leídas importantes)
      this.notifications = this.notifications.filter(n => !n.read).slice(0, 3);
      this.addDailyNotifications();
      localStorage.setItem('fonokids_last_visit', today);
    }
    
    this.saveNotifications();
  }

  /**
   * ✅ NUEVO: Verifica las actividades del día anterior y genera notificación
   */
  private checkYesterdayActivities(): void {
    const lastVisit = localStorage.getItem('fonokids_last_visit');
    const today = new Date().toDateString();
    
    // Solo mostrar si es un nuevo día
    if (lastVisit === today) return;
    
    // Obtener fecha de ayer
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Buscar actividades guardadas del día anterior
    const activitiesData = this.getActivitiesFromStorage(yesterdayKey);
    
    if (activitiesData && activitiesData.total > 0) {
      // ¡El usuario hizo actividades ayer!
      const total = activitiesData.total;
      const ejercicios = activitiesData.ejercicios || 0;
      const juegos = activitiesData.juegos || 0;
      
      let message = '';
      let icon = '⭐';
      let title = '';
      
      if (total >= 10) {
        icon = '🏆';
        title = 'Increíble esfuerzo ayer';
        message = `Completaste ${total} actividades. Sigue así hoy.`;
      } else if (total >= 5) {
        icon = '⭐';
        title = 'Muy bien ayer';
        message = `Realizaste ${total} actividades (${ejercicios} ejercicios, ${juegos} juegos).`;
      } else if (total >= 1) {
        icon = '👍';
        title = 'Buen comienzo ayer';
        message = `Hiciste ${total} ${total === 1 ? 'actividad' : 'actividades'}. Hoy puedes superarte.`;
      }
      
      if (title) {
        this.notifications.unshift({
          id: Date.now(),
          type: 'achievement',
          icon: icon,
          title: title,
          message: message,
          time: 'Hoy',
          read: false,
          route: '/mi-agenda'
        });
      }
    } else {
      // No hizo actividades ayer
      this.notifications.unshift({
        id: Date.now(),
        type: 'reminder',
        icon: '📋',
        title: 'Te extrañamos ayer',
        message: 'No te preocupes, hoy es un nuevo día para practicar.',
        time: 'Hoy',
        read: false,
        route: '/ejercicios'
      });
    }
  }

  /**
   * ✅ NUEVO: Obtiene las actividades del storage para una fecha específica
   */
  private getActivitiesFromStorage(dateKey: string): { total: number; ejercicios: number; juegos: number } | null {
    try {
      // Intentar obtener del formato de Mi Agenda (activityHistory)
      const activityHistory = localStorage.getItem('activityHistory');
      
      if (activityHistory) {
        const history = JSON.parse(activityHistory);
        
        // Buscar actividades de la fecha específica
        const dayActivities = history.filter((activity: any) => {
          if (activity.date) {
            const activityDate = new Date(activity.date).toISOString().split('T')[0];
            return activityDate === dateKey;
          }
          if (activity.timestamp) {
            const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
            return activityDate === dateKey;
          }
          return false;
        });
        
        if (dayActivities.length > 0) {
          // Contar por tipo
          let ejercicios = 0;
          let juegos = 0;
          
          dayActivities.forEach((act: any) => {
            const tipo = (act.type || act.tipo || '').toLowerCase();
            if (tipo.includes('ejercicio') || tipo.includes('praxia') || tipo.includes('lingual') || 
                tipo.includes('labial') || tipo.includes('mandibular')) {
              ejercicios++;
            } else if (tipo.includes('juego') || tipo.includes('game') || tipo.includes('carrera') || 
                       tipo.includes('puzzle') || tipo.includes('memoria') || tipo.includes('ruleta') ||
                       tipo.includes('sonido') || tipo.includes('pronunciación')) {
              juegos++;
            } else {
              // Por defecto contar como ejercicio
              ejercicios++;
            }
          });
          
          return {
            total: dayActivities.length,
            ejercicios: ejercicios,
            juegos: juegos
          };
        }
      }
      
      // Intentar formato alternativo (dailyActivities)
      const dailyKey = `dailyActivities_${dateKey}`;
      const dailyActivities = localStorage.getItem(dailyKey);
      
      if (dailyActivities) {
        const activities = JSON.parse(dailyActivities);
        return {
          total: activities.length || 0,
          ejercicios: activities.filter((a: any) => a.category !== 'juego').length || 0,
          juegos: activities.filter((a: any) => a.category === 'juego').length || 0
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error leyendo actividades:', error);
      return null;
    }
  }

  /**
   * ✅ NUEVO: Verifica la racha de días consecutivos
   */
  private checkStreak(): void {
    const lastVisit = localStorage.getItem('fonokids_last_visit');
    const today = new Date().toDateString();
    
    // Solo verificar si es un nuevo día
    if (lastVisit === today) return;
    
    try {
      const activityHistory = localStorage.getItem('activityHistory');
      if (!activityHistory) return;
      
      const history = JSON.parse(activityHistory);
      if (history.length === 0) return;
      
      // Obtener fechas únicas de actividades
      const uniqueDates = new Set<string>();
      history.forEach((activity: any) => {
        const date = activity.date || activity.timestamp;
        if (date) {
          uniqueDates.add(new Date(date).toISOString().split('T')[0]);
        }
      });
      
      // Calcular racha contando días consecutivos hacia atrás
      let streak = 0;
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - 1); // Empezar desde ayer
      
      for (let i = 0; i < 30; i++) { // Máximo 30 días
        const dateKey = checkDate.toISOString().split('T')[0];
        if (uniqueDates.has(dateKey)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      
      // Notificar rachas importantes
      if (streak === 3) {
        this.notifications.unshift({
          id: Date.now() + 100,
          type: 'streak',
          icon: '🔥',
          title: '3 días seguidos',
          message: 'Llevas 3 días practicando. Estás creando un gran hábito.',
          time: 'Hoy',
          read: false
        });
      } else if (streak === 7) {
        this.notifications.unshift({
          id: Date.now() + 100,
          type: 'streak',
          icon: '🔥',
          title: 'Una semana completa',
          message: '7 días seguidos practicando. Excelente dedicación.',
          time: 'Hoy',
          read: false
        });
      } else if (streak === 14) {
        this.notifications.unshift({
          id: Date.now() + 100,
          type: 'streak',
          icon: '🏅',
          title: '2 semanas de racha',
          message: '14 días sin parar. Tu dedicación es admirable.',
          time: 'Hoy',
          read: false
        });
      } else if (streak === 30) {
        this.notifications.unshift({
          id: Date.now() + 100,
          type: 'streak',
          icon: '🏆',
          title: 'Un mes completo',
          message: '30 días de práctica consecutiva.',
          time: 'Hoy',
          read: false
        });
      }
      
    } catch (error) {
      console.error('Error verificando racha:', error);
    }
  }

  /**
   * Notificaciones de bienvenida para usuarios nuevos
   */
  private getWelcomeNotifications(): Notification[] {
    return [
      {
        id: Date.now(),
        type: 'welcome',
        icon: '👋',
        title: 'Bienvenido a FonoKids',
        message: 'Explora las diferentes actividades y comienza tu aventura.',
        time: 'Ahora',
        read: false,
        route: '/ejercicios'
      },
      {
        id: Date.now() + 1,
        type: 'tip',
        icon: '💡',
        title: 'Consejo',
        message: 'Practicar 10-15 minutos al día es más efectivo que sesiones largas esporádicas.',
        time: 'Ahora',
        read: false
      }
    ];
  }

  /**
   * Agrega notificaciones diarias (tip aleatorio)
   */
  private addDailyNotifications(): void {
    const dailyTips = [
      'Respira profundo antes de cada ejercicio para relajar los músculos.',
      'Practica frente al espejo para ver mejor tus movimientos.',
      'Los ejercicios de lengua ayudan a mejorar la pronunciación.',
      'Haz pausas cortas entre ejercicios para no cansar los músculos.',
      'La constancia es más importante que la intensidad.',
      'Beber agua antes de practicar ayuda a mantener la boca hidratada.',
      'Los juegos terapéuticos son una forma divertida de ejercitar.',
      'Pregúntale a FonoBot si tienes dudas sobre algún ejercicio.'
    ];

    // Agregar un tip aleatorio
    const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
    
    this.notifications.unshift({
      id: Date.now() + 50,
      type: 'tip',
      icon: '💡',
      title: 'Consejo del día',
      message: randomTip,
      time: 'Hoy',
      read: false
    });

    // Limitar a máximo 8 notificaciones
    if (this.notifications.length > 8) {
      this.notifications = this.notifications.slice(0, 8);
    }
  }

  /**
   * Verifica y agrega recordatorio si no ha hecho ejercicios hoy
   */
  private checkDailyReminder(): void {
    // Verificar si ya hizo algo hoy
    const today = new Date().toISOString().split('T')[0];
    const todayActivities = this.getActivitiesFromStorage(today);
    
    // Si ya hizo actividades hoy, no mostrar recordatorio
    if (todayActivities && todayActivities.total > 0) {
      return;
    }
    
    // Verificar si ya tiene un recordatorio de hoy
    const hasReminderToday = this.notifications.some(
      n => n.type === 'reminder' && n.time === 'Hoy' && n.title.includes('practicar')
    );
    
    if (!hasReminderToday) {
      const reminders = [
        { title: 'Hora de practicar', message: '¿Ya hiciste tus ejercicios hoy?' },
        { title: 'Recordatorio', message: 'Un poco de práctica cada día hace una gran diferencia.' },
        { title: 'Práctica diaria', message: 'Tus ejercicios te esperan.' }
      ];
      
      const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];
      
      this.notifications.unshift({
        id: Date.now() + 200,
        type: 'reminder',
        icon: '⏰',
        title: randomReminder.title,
        message: randomReminder.message,
        time: 'Hoy',
        read: false,
        route: '/ejercicios'
      });
    }
  }

  /**
   * Guarda las notificaciones en localStorage
   */
  private saveNotifications(): void {
    localStorage.setItem('fonokids_notifications', JSON.stringify(this.notifications));
  }

  /**
   * Actualiza el contador de no leídas
   */
  private updateUnreadCount(): void {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  /**
   * Toggle del panel de notificaciones
   */
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    
    if (this.showNotifications) {
      this.closeUserMenu();
    }
    
    console.log('🔔 Panel de notificaciones:', this.showNotifications ? 'abierto' : 'cerrado');
  }

  /**
   * Cierra el panel de notificaciones
   */
  closeNotifications(): void {
    this.showNotifications = false;
  }

  /**
   * Maneja el click en una notificación
   */
  handleNotificationClick(notification: Notification, index: number): void {
    // Marcar como leída
    if (!notification.read) {
      this.notifications[index].read = true;
      this.updateUnreadCount();
      this.saveNotifications();
    }
    
    // Si tiene ruta, navegar
    if (notification.route) {
      this.closeNotifications();
      this.router.navigate([notification.route]);
    }
    
    console.log('🔔 Notificación clickeada:', notification.title);
  }

  /**
   * Descarta una notificación
   */
  dismissNotification(index: number, event: Event): void {
    event.stopPropagation();
    
    this.notifications.splice(index, 1);
    this.updateUnreadCount();
    this.saveNotifications();
    
    console.log('🔔 Notificación descartada');
  }

  /**
   * Marca todas como leídas
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.updateUnreadCount();
    this.saveNotifications();
    
    console.log('🔔 Todas las notificaciones marcadas como leídas');
  }

  /**
   * Agrega una notificación de logro (puede llamarse desde otros lugares)
   */
  addAchievementNotification(title: string, message: string): void {
    this.notifications.unshift({
      id: Date.now(),
      type: 'achievement',
      icon: '🏆',
      title: title,
      message: message,
      time: 'Ahora',
      read: false
    });
    
    this.updateUnreadCount();
    this.saveNotifications();
    
    // Limitar notificaciones
    if (this.notifications.length > 10) {
      this.notifications = this.notifications.slice(0, 10);
    }
  }

  /**
   * Agrega una notificación de racha
   */
  addStreakNotification(days: number): void {
    this.notifications.unshift({
      id: Date.now(),
      type: 'streak',
      icon: '🔥',
      title: `¡${days} días seguidos!`,
      message: `Llevas ${days} días practicando sin parar. ¡Eres increíble!`,
      time: 'Ahora',
      read: false
    });
    
    this.updateUnreadCount();
    this.saveNotifications();
  }

  // ========== FIN MÉTODOS DE NOTIFICACIONES ==========

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
    if (this.showUserMenu) {
      this.closeNotifications(); // Cerrar notificaciones si se abre el menú
    }
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
    this.closeNotifications();
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
    const notificationContainer = document.querySelector('.notification-container');
    
    // Cerrar menú de usuario
    if (userMenuContainer && !userMenuContainer.contains(target) && !themeToggle?.contains(target)) {
      this.showUserMenu = false;
    }
    
    // Cerrar panel de notificaciones
    if (notificationContainer && !notificationContainer.contains(target)) {
      this.showNotifications = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.showUserMenu) {
        this.closeUserMenu();
      }
      
      if (this.showNotifications) {
        this.closeNotifications();
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