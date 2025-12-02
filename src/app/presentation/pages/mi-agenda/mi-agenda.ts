import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Actividad {
  id_actividad: number;
  fecha: string;
  tipo_actividad: string;
  nombre_actividad: string;
}

interface ActividadesPorFecha {
  fecha: string;
  fechaFormateada: string;
  actividades: Actividad[];
}

@Component({
  selector: 'app-mi-agenda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mi-agenda.html',
  styleUrls: ['./mi-agenda.css']
})
export class MiAgendaComponent implements OnInit {
  actividadesPorFecha: ActividadesPorFecha[] = [];
  cargando: boolean = true;
  error: string = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    console.log('📅 Mi Agenda iniciada');
    
    // 🔝 SCROLL AUTOMÁTICO AL INICIO
    window.scrollTo(0, 0);
    
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.cargando = true;
    this.error = '';

    // Obtener el ID del paciente del localStorage
    const userData = localStorage.getItem('fonokids_user');
    if (!userData) {
      this.error = 'No se encontró información del usuario';
      this.cargando = false;
      return;
    }

    const user = JSON.parse(userData);
    const idPaciente = user.id_paciente || user.id;

    if (!idPaciente) {
      this.error = 'No se pudo identificar al paciente';
      this.cargando = false;
      return;
    }

    // ✅ CORREGIDO: Agregado /api/ en la URL
    console.log('🔍 Cargando historial del paciente:', idPaciente);
    console.log('🔗 URL:', `${environment.backendApi}/api/historial-actividades/paciente/${idPaciente}`);
    
    this.http.get<any>(`${environment.backendApi}/api/historial-actividades/paciente/${idPaciente}`)
      .subscribe({
        next: (response) => {
          console.log('✅ Actividades cargadas:', response);
          this.agruparPorFecha(response.data || []);
          this.cargando = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar actividades:', error);
          this.error = 'No se pudo cargar el historial de actividades';
          this.cargando = false;
        }
      });
  }

  agruparPorFecha(actividades: Actividad[]): void {
    // Agrupar actividades por fecha
    const actividadesPorFechaMap = new Map<string, Actividad[]>();

    actividades.forEach(actividad => {
      const fecha = actividad.fecha;
      if (!actividadesPorFechaMap.has(fecha)) {
        actividadesPorFechaMap.set(fecha, []);
      }
      actividadesPorFechaMap.get(fecha)!.push(actividad);
    });

    // Convertir a array y ordenar por fecha (más reciente primero)
    this.actividadesPorFecha = Array.from(actividadesPorFechaMap.entries())
      .map(([fecha, actividades]) => ({
        fecha,
        fechaFormateada: this.formatearFecha(fecha),
        actividades
      }))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    console.log('📊 Actividades agrupadas:', this.actividadesPorFecha);
  }

  formatearFecha(fechaStr: string): string {
    // Parsear fecha correctamente desde formato YYYY-MM-DD
    const [year, month, day] = fechaStr.split('-');
    const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    // Resetear horas para comparación
    hoy.setHours(0, 0, 0, 0);
    ayer.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);

    if (fecha.getTime() === hoy.getTime()) {
      return ' Hoy';
    } else if (fecha.getTime() === ayer.getTime()) {
      return '📆 Ayer';
    } else {
      const opciones: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      return fecha.toLocaleDateString('es-ES', opciones);
    }
  }

  getIconoActividad(tipo: string): string {
    return tipo === 'juego_terapeutico' ? '🎮' : '🎥';
  }

  getTituloTipo(tipo: string): string {
    return tipo === 'juego_terapeutico' ? 'Juegos Terapéuticos' : 'Análisis de Prácticas';
  }

  getColorTipo(tipo: string): string {
    return tipo === 'juego_terapeutico' ? 'juego' : 'ejercicio';
  }

  volverAlDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  get totalActividades(): number {
    return this.actividadesPorFecha.reduce((total, dia) => total + dia.actividades.length, 0);
  }

  get diasRegistrados(): number {
    return this.actividadesPorFecha.length;
  }
}