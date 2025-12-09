import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './mi-agenda.html',
  styleUrls: ['./mi-agenda.css']
})
export class MiAgendaComponent implements OnInit {
  actividadesPorFecha: ActividadesPorFecha[] = [];
  cargando: boolean = true;
  error: string = '';
  
  // Variables para el modal de PDF
  mostrarModalPDF: boolean = false;
  tipoReporte: 'hoy' | 'especifica' | 'rango' | 'todos' = 'hoy';
  fechaEspecifica: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  
  // Variables para modal de alerta personalizado
  mostrarModalAlerta: boolean = false;
  mensajeAlerta: string = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    console.log('📅 Mi Agenda iniciada');
    window.scrollTo(0, 0);
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.cargando = true;
    this.error = '';

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

    console.log('🔍 Cargando historial del paciente:', idPaciente);
    
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
    const actividadesPorFechaMap = new Map<string, Actividad[]>();

    actividades.forEach(actividad => {
      const fecha = actividad.fecha;
      if (!actividadesPorFechaMap.has(fecha)) {
        actividadesPorFechaMap.set(fecha, []);
      }
      actividadesPorFechaMap.get(fecha)!.push(actividad);
    });

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

  // ========== FUNCIONES PARA PDF ==========

  abrirModalPDF(): void {
    this.mostrarModalPDF = true;
    this.tipoReporte = 'hoy';
    const hoy = new Date().toISOString().split('T')[0];
    this.fechaEspecifica = hoy;
    this.fechaInicio = hoy;
    this.fechaFin = hoy;
  }

  cerrarModalPDF(): void {
    this.mostrarModalPDF = false;
  }

  // Funciones para modal de alerta
  mostrarAlerta(mensaje: string): void {
    this.mensajeAlerta = mensaje;
    this.mostrarModalAlerta = true;
  }

  cerrarModalAlerta(): void {
    this.mostrarModalAlerta = false;
    this.mensajeAlerta = '';
  }

  generarPDF(): void {
    let actividadesFiltradas: ActividadesPorFecha[] = [];
    let tituloReporte = '';

    // Filtrar según el tipo de reporte
    if (this.tipoReporte === 'hoy') {
      const hoy = new Date().toISOString().split('T')[0];
      actividadesFiltradas = this.actividadesPorFecha.filter(grupo => 
        this.normalizarFecha(grupo.fecha) === this.normalizarFecha(hoy)
      );
      
      if (actividadesFiltradas.length === 0) {
        this.mostrarAlerta('No hay actividades registradas para el día de hoy.');
        return;
      }
      
      tituloReporte = 'Reporte de Actividades - Hoy';
      
    } else if (this.tipoReporte === 'especifica') {
      if (!this.fechaEspecifica) {
        this.mostrarAlerta('Por favor selecciona una fecha.');
        return;
      }
      
      console.log('🔍 Buscando actividades para fecha:', this.fechaEspecifica);
      console.log('📅 Fechas disponibles:', this.actividadesPorFecha.map(g => g.fecha));
      
      // Normalizar ambas fechas para comparación
      const fechaBuscada = this.normalizarFecha(this.fechaEspecifica);
      
      actividadesFiltradas = this.actividadesPorFecha.filter(grupo => {
        const fechaGrupo = this.normalizarFecha(grupo.fecha);
        const coincide = fechaGrupo === fechaBuscada;
        console.log(`  Comparando: ${fechaGrupo} === ${fechaBuscada} → ${coincide}`);
        return coincide;
      });
      
      console.log('✅ Actividades encontradas:', actividadesFiltradas.length);
      
      if (actividadesFiltradas.length === 0) {
        this.mostrarAlerta('No hay actividades registradas en la fecha seleccionada.');
        return;
      }
      
      tituloReporte = `Reporte de Actividades - ${this.formatearFechaPDF(this.fechaEspecifica)}`;
      
    } else if (this.tipoReporte === 'rango') {
      if (!this.fechaInicio || !this.fechaFin) {
        this.mostrarAlerta('Por favor selecciona ambas fechas (inicio y fin).');
        return;
      }
      
      // Normalizar fechas para comparación
      const fechaInicioNorm = this.normalizarFecha(this.fechaInicio);
      const fechaFinNorm = this.normalizarFecha(this.fechaFin);
      
      if (fechaInicioNorm > fechaFinNorm) {
        this.mostrarAlerta('La fecha de inicio no puede ser posterior a la fecha fin.');
        return;
      }
      
      actividadesFiltradas = this.actividadesPorFecha.filter(grupo => {
        const fechaGrupo = this.normalizarFecha(grupo.fecha);
        return fechaGrupo >= fechaInicioNorm && fechaGrupo <= fechaFinNorm;
      });
      
      if (actividadesFiltradas.length === 0) {
        this.mostrarAlerta('No hay actividades registradas en el rango de fechas seleccionado.');
        return;
      }
      
      tituloReporte = `Reporte de Actividades - Del ${this.formatearFechaPDF(this.fechaInicio)} al ${this.formatearFechaPDF(this.fechaFin)}`;
      
    } else {
      actividadesFiltradas = this.actividadesPorFecha;
      
      if (actividadesFiltradas.length === 0) {
        this.mostrarAlerta('No hay actividades registradas en tu historial.');
        return;
      }
      
      tituloReporte = 'Reporte Completo de Actividades';
    }

    this.crearPDF(actividadesFiltradas, tituloReporte);
    this.cerrarModalPDF();
  }

  // Función auxiliar para normalizar fechas y asegurar comparación correcta
  normalizarFecha(fecha: string): string {
    // Asegura que la fecha esté en formato YYYY-MM-DD sin zona horaria
    const partes = fecha.split('T')[0].split('-');
    return `${partes[0]}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
  }

  formatearFechaPDF(fechaStr: string): string {
    const [year, month, day] = fechaStr.split('-');
    const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const opciones: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return fecha.toLocaleDateString('es-ES', opciones);
  }

  crearPDF(actividades: ActividadesPorFecha[], titulo: string): void {
    const doc = new jsPDF();
    
    // Obtener datos del usuario
    const userData = localStorage.getItem('fonokids_user');
    const user = userData ? JSON.parse(userData) : {};
    
    // ✅ El servidor envía el nombre en el campo 'name'
    const nombrePaciente = user.name || user.username || 'Paciente';
    
    console.log('👤 Usuario para PDF:', user);
    console.log('📝 Nombre del paciente:', nombrePaciente);

    // === ENCABEZADO ===
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('FonoKids', 105, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de Actividades Terapeuticas', 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 105, 33, { align: 'center' });

    // === INFORMACIÓN DEL PACIENTE ===
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Informacion del Paciente:', 20, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${nombrePaciente}`, 20, 58);
    doc.text(`Fecha del reporte: ${new Date().toLocaleDateString('es-ES')}`, 20, 65);

    // === TÍTULO DEL REPORTE ===
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(102, 126, 234);
    doc.text(titulo, 20, 78);

    // === ESTADÍSTICAS GENERALES ===
    const totalActividadesReporte = actividades.reduce((sum, grupo) => sum + grupo.actividades.length, 0);
    const totalJuegos = actividades.reduce((sum, grupo) => 
      sum + grupo.actividades.filter(a => a.tipo_actividad === 'juego_terapeutico').length, 0
    );
    const totalEjercicios = totalActividadesReporte - totalJuegos;

    doc.setFillColor(240, 240, 240);
    doc.roundedRect(20, 85, 170, 25, 3, 3, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Estadisticas del Periodo:', 25, 93);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de actividades: ${totalActividadesReporte}`, 25, 100);
    doc.text(`Juegos terapeuticos: ${totalJuegos}`, 100, 100);
    doc.text(`Ejercicios orofaciales: ${totalEjercicios}`, 25, 106);
    doc.text(`Dias con actividad: ${actividades.length}`, 100, 106);

    // === DETALLE DE ACTIVIDADES POR FECHA ===
    let yPosition = 120;
    
    actividades.forEach((grupo, index) => {
      // Verificar si necesitamos una nueva página
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Fecha del día
      doc.setFillColor(102, 126, 234);
      doc.roundedRect(20, yPosition, 170, 8, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${this.formatearFechaPDF(grupo.fecha)} - ${grupo.actividades.length} actividades`, 25, yPosition + 6);
      
      yPosition += 12;

      // Tabla de actividades del día
      const datosTabla = grupo.actividades.map((act, idx) => [
        (idx + 1).toString(),
        act.tipo_actividad === 'juego_terapeutico' ? 'Juego Terapeutico' : 'Ejercicio Orofacial',
        act.nombre_actividad
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Tipo', 'Actividad']],
        body: datosTabla,
        theme: 'striped',
        headStyles: {
          fillColor: [118, 75, 162],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 9,
          cellPadding: 4
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 55 },
          2: { cellWidth: 100 }
        },
        margin: { left: 20, right: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 8;
    });

    // === PIE DE PÁGINA ===
    const totalPages = (doc as any).internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Pagina ${i} de ${totalPages} - FonoKids - Sistema de Terapia de Habla`,
        105,
        285,
        { align: 'center' }
      );
    }

    // Guardar PDF
    const fechaArchivo = new Date().toISOString().split('T')[0];
    doc.save(`FonoKids_Reporte_${nombrePaciente}_${fechaArchivo}.pdf`);
    
    console.log('✅ PDF generado exitosamente');
  }
}