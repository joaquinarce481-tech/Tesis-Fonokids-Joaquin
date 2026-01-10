import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Actividad {
  id_actividad: number;
  fecha: string;
  tipo_actividad: string;
  nombre_actividad: string;
}

interface ResumenDiario {
  fecha: string;
  fechaFormateada: string;
  ejercicios: number;
  juegos: number;
  total: number;
  actividades: Actividad[];
}

interface Paciente {
  id_paciente: number;
  nombre_completo: string;
  username: string;
  email: string;
}

@Component({
  selector: 'app-panel-profesional',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-profesional.html',
  styleUrls: ['./panel-profesional.css']
})
export class PanelProfesionalComponent implements OnInit {
  
  // Lista de pacientes
  pacientes: Paciente[] = [];
  pacienteSeleccionado: Paciente | null = null;
  
  // Estadísticas generales
  totalEjercicios: number = 0;
  totalJuegos: number = 0;
  totalActividades: number = 0;
  diasActivos: number = 0;
  
  // Historial
  resumenPorDia: ResumenDiario[] = [];
  
  // UI
  vistaActual: 'resumen' | 'historial' | 'detalle' = 'resumen';
  diaSeleccionado: ResumenDiario | null = null;
  cargando: boolean = true;
  cargandoHistorial: boolean = false;
  error: string = '';
  
  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.cargarPacientes();
  }

  /**
   * Carga la lista de pacientes desde el backend
   */
  private cargarPacientes(): void {
    this.cargando = true;
    this.error = '';

    console.log('👥 Cargando lista de pacientes...');
    
    this.http.get<any[]>(`${environment.backendLogin}/api/pacientes`)
      .subscribe({
        next: (pacientes) => {
          console.log('✅ Pacientes cargados:', pacientes.length);
          this.pacientes = pacientes;
          this.cargando = false;
        },
        error: (error) => {
          console.error('❌ Error cargando pacientes:', error);
          this.error = 'No se pudo cargar la lista de pacientes';
          this.cargando = false;
        }
      });
  }

  /**
   * Selecciona un paciente y carga su historial
   */
  seleccionarPaciente(paciente: Paciente): void {
    this.pacienteSeleccionado = paciente;
    this.vistaActual = 'resumen';
    this.cargarHistorialPaciente(paciente.id_paciente);
  }

  /**
   * Vuelve a la lista de pacientes
   */
  volverALista(): void {
    this.pacienteSeleccionado = null;
    this.resumenPorDia = [];
    this.totalEjercicios = 0;
    this.totalJuegos = 0;
    this.totalActividades = 0;
    this.diasActivos = 0;
  }

  /**
   * Carga el historial de un paciente específico
   */
  private cargarHistorialPaciente(idPaciente: number): void {
    this.cargandoHistorial = true;

    console.log('📊 Cargando historial del paciente:', idPaciente);
    
    this.http.get<any>(`${environment.backendLogin}/api/historial-actividades/paciente/${idPaciente}`)
      .subscribe({
        next: (response) => {
          console.log('✅ Historial cargado:', response);
          this.procesarActividades(response.data || []);
          this.cargandoHistorial = false;
        },
        error: (error) => {
          console.error('❌ Error cargando historial:', error);
          this.cargandoHistorial = false;
        }
      });
  }

  /**
   * Procesa las actividades y las agrupa por día
   */
  private procesarActividades(actividades: Actividad[]): void {
    const grupos: { [key: string]: Actividad[] } = {};
    
    actividades.forEach(act => {
      const fecha = act.fecha;
      if (!grupos[fecha]) {
        grupos[fecha] = [];
      }
      grupos[fecha].push(act);
    });
    
    this.resumenPorDia = Object.keys(grupos)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(fecha => {
        const acts = grupos[fecha];
        const juegos = acts.filter(a => a.tipo_actividad === 'juego_terapeutico').length;
        const ejercicios = acts.filter(a => a.tipo_actividad !== 'juego_terapeutico').length;
        
        return {
          fecha: fecha,
          fechaFormateada: this.formatearFecha(fecha),
          ejercicios: ejercicios,
          juegos: juegos,
          total: acts.length,
          actividades: acts
        };
      });
    
    this.calcularEstadisticas();
  }

  /**
   * Formatea la fecha para mostrar
   */
  private formatearFecha(fechaStr: string): string {
    const [year, month, day] = fechaStr.split('-');
    const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    
    hoy.setHours(0, 0, 0, 0);
    ayer.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    
    if (fecha.getTime() === hoy.getTime()) {
      return 'Hoy';
    } else if (fecha.getTime() === ayer.getTime()) {
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
    this.totalEjercicios = this.resumenPorDia.reduce((sum, dia) => sum + dia.ejercicios, 0);
    this.totalJuegos = this.resumenPorDia.reduce((sum, dia) => sum + dia.juegos, 0);
    this.totalActividades = this.totalEjercicios + this.totalJuegos;
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
   * Obtiene el ícono según el tipo de actividad
   */
  getIconoActividad(tipo: string): string {
    return tipo === 'juego_terapeutico' ? '🎮' : '🎥';
  }

  /**
   * Obtiene el nombre del tipo de actividad
   */
  getTipoNombre(tipo: string): string {
    return tipo === 'juego_terapeutico' ? 'Juego' : 'Ejercicio';
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