import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface ActividadRegistro {
  fecha: string;
  tipo: string;
  nombre: string;
  categoria: string;
  completado: boolean;
  timestamp: string;
}

interface ResumenDiario {
  fecha: string;
  fechaFormateada: string;
  ejercicios: number;
  juegos: number;
  total: number;
  actividades: ActividadRegistro[];
}

@Component({
  selector: 'app-panel-profesional',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-profesional.html',
  styleUrls: ['./panel-profesional.css']
})
export class PanelProfesionalComponent implements OnInit {
  
  // Datos del paciente
  nombrePaciente: string = 'Paciente';
  
  // Estadísticas generales
  totalEjercicios: number = 0;
  totalJuegos: number = 0;
  totalActividades: number = 0;
  diasActivos: number = 0;
  
  // Historial
  resumenPorDia: ResumenDiario[] = [];
  actividadesRecientes: ActividadRegistro[] = [];
  
  // UI
  vistaActual: 'resumen' | 'historial' | 'detalle' = 'resumen';
  diaSeleccionado: ResumenDiario | null = null;
  
  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cargarDatosPaciente();
    this.cargarHistorial();
    this.calcularEstadisticas();
  }

  /**
   * Carga el nombre del paciente desde localStorage
   */
  private cargarDatosPaciente(): void {
    const userData = localStorage.getItem('fonokids_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.nombrePaciente = user.name || user.username || 'Paciente';
      } catch (e) {
        this.nombrePaciente = 'Paciente';
      }
    }
  }

  /**
   * Carga el historial de actividades desde localStorage
   */
  private cargarHistorial(): void {
    try {
      const historial = localStorage.getItem('activityHistory');
      
      if (historial) {
        const actividades: any[] = JSON.parse(historial);
        
        // Convertir a formato uniforme
        this.actividadesRecientes = actividades.map(act => ({
          fecha: this.extraerFecha(act.date || act.timestamp),
          tipo: this.determinarTipo(act),
          nombre: act.name || act.ejercicio || act.activity || 'Actividad',
          categoria: act.category || act.categoria || 'general',
          completado: act.completed !== false,
          timestamp: act.date || act.timestamp || new Date().toISOString()
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Agrupar por día
        this.agruparPorDia();
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  }

  /**
   * Extrae la fecha en formato YYYY-MM-DD
   */
  private extraerFecha(dateString: string): string {
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Determina si es ejercicio o juego
   */
  private determinarTipo(actividad: any): string {
    const tipo = (actividad.type || actividad.tipo || actividad.category || '').toLowerCase();
    const nombre = (actividad.name || actividad.ejercicio || '').toLowerCase();
    
    if (tipo.includes('juego') || tipo.includes('game') || 
        nombre.includes('carrera') || nombre.includes('puzzle') || 
        nombre.includes('memoria') || nombre.includes('ruleta') ||
        nombre.includes('sonido') || nombre.includes('parejas') ||
        nombre.includes('atrapa') || nombre.includes('arma')) {
      return 'juego';
    }
    return 'ejercicio';
  }

  /**
   * Agrupa las actividades por día
   */
  private agruparPorDia(): void {
    const grupos: { [key: string]: ActividadRegistro[] } = {};
    
    this.actividadesRecientes.forEach(act => {
      if (!grupos[act.fecha]) {
        grupos[act.fecha] = [];
      }
      grupos[act.fecha].push(act);
    });
    
    this.resumenPorDia = Object.keys(grupos)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(fecha => {
        const actividades = grupos[fecha];
        const ejercicios = actividades.filter(a => a.tipo === 'ejercicio').length;
        const juegos = actividades.filter(a => a.tipo === 'juego').length;
        
        return {
          fecha: fecha,
          fechaFormateada: this.formatearFecha(fecha),
          ejercicios: ejercicios,
          juegos: juegos,
          total: actividades.length,
          actividades: actividades
        };
      });
  }

  /**
   * Formatea la fecha para mostrar
   */
  private formatearFecha(fechaStr: string): string {
    const fecha = new Date(fechaStr + 'T12:00:00');
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    
    if (fecha.toDateString() === hoy.toDateString()) {
      return 'Hoy';
    } else if (fecha.toDateString() === ayer.toDateString()) {
      return 'Ayer';
    } else {
      return fecha.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
  }

  /**
   * Calcula las estadísticas generales
   */
  private calcularEstadisticas(): void {
    this.totalEjercicios = this.actividadesRecientes.filter(a => a.tipo === 'ejercicio').length;
    this.totalJuegos = this.actividadesRecientes.filter(a => a.tipo === 'juego').length;
    this.totalActividades = this.actividadesRecientes.length;
    this.diasActivos = this.resumenPorDia.length;
  }

  /**
   * Cambia la vista actual
   */
  cambiarVista(vista: 'resumen' | 'historial' | 'detalle'): void {
    this.vistaActual = vista;
    if (vista !== 'detalle') {
      this.diaSeleccionado = null;
    }
  }

  /**
   * Ver detalle de un día específico
   */
  verDetalleDia(dia: ResumenDiario): void {
    this.diaSeleccionado = dia;
    this.vistaActual = 'detalle';
  }

  /**
   * Obtiene el ícono según la categoría
   */
  getIconoCategoria(categoria: string): string {
    const cat = categoria.toLowerCase();
    if (cat.includes('lingual')) return '👅';
    if (cat.includes('labial')) return '👄';
    if (cat.includes('mandibular')) return '🦷';
    if (cat.includes('juego') || cat.includes('game')) return '🎮';
    return '📋';
  }

  /**
   * Volver al dashboard
   */
  volverAlDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Calcula el promedio de actividades por día
   */
  get promedioPorDia(): number {
    if (this.diasActivos === 0) return 0;
    return Math.round(this.totalActividades / this.diasActivos * 10) / 10;
  }

  /**
   * Obtiene la última fecha de actividad
   */
  get ultimaActividad(): string {
    if (this.resumenPorDia.length === 0) return 'Sin actividad';
    return this.resumenPorDia[0].fechaFormateada;
  }
}