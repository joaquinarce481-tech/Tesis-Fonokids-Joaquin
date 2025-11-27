import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

interface Seccion {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  imagen: string;
  ejercicios: Ejercicio[];
}

interface Ejercicio {
  id: number;
  nombre: string;
  descripcion: string;
  instrucciones: string;
  duracion: number;
  icono: string;
  imagen: string;
  color: string;
  seccionId: string;
}

interface ResultadoEjercicio {
  ejercicioId: number;
  puntuacion: number;
  completado: boolean;
  tiempoRealizado: number;
  errores: number;
  repeticionesHoy: number;      // Cuántas veces se hizo hoy
  fechaUltimaRepeticion: string; // Fecha de la última vez que se hizo
  repeticionesRequeridas: number; // Cuántas repeticiones se necesitan (3 por defecto)
}

@Component({
  selector: 'app-ejercicios-orofaciales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ejercicios-orofaciales.component.html',
  styleUrls: ['./ejercicios-orofaciales.component.css']
})
export class EjerciciosOrofacialesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  private faceMesh!: FaceMesh;
  private camera!: Camera;
  private canvasCtx!: CanvasRenderingContext2D;
  private mediaPipeReady = false;
  private intervalTimer: any;
  private animationFrame = 0; // Para animaciones de pulso

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  isRecording = false;
  ejercicioActivo: Ejercicio | null = null;
  mostrarResultados = false;
  ultimoResultado: ResultadoEjercicio | null = null;

  tiempoRestante = 0;
  puntuacionActual = 0;
  progresoEjercicio = 0;
  mensajeFeedback = '';
  feedbackTipo: 'success' | 'warning' | 'error' | '' = '';
  
  private landmarksAnteriores: any[] = [];
  private contadorFramesCorrectos = 0;
  private contadorFramesTotales = 0;
  private ejercicioIniciado = false;
  private ultimoTiempoFeedback = 0;
  private feedbackTimeout: any = null;

  resultados: {[key: number]: ResultadoEjercicio} = {};

  seccionActiva: Seccion | null = null;
  vistaActual: 'secciones' | 'ejercicios' | 'activo' | 'resultados' = 'secciones';

  secciones: Seccion[] = [
    {
      id: 'linguales',
      nombre: 'Linguales',
      descripcion: 'Ejercicios para mejorar la fuerza, coordinación y movilidad de la lengua',
      icono: '👅',
      color: '#FF1493',
      imagen: 'assets/images/LabialesRojo.png',
      ejercicios: []
    },
    {
      id: 'labiales',
      nombre: 'Labiales',
      descripcion: 'Ejercicios para fortalecer el cierre, tono y movilidad de los labios',
      icono: '👄', 
      color: '#FFD700',
      imagen: 'assets/images/Labiales.png',
      ejercicios: []
    },
    {
      id: 'mandibulares',
      nombre: 'Mandibulares',
      descripcion: 'Ejercicios para estimular la movilidad y control de la mandíbula',
      icono: '🦷',
      color: '#32CD32',
      imagen: 'assets/images/Mandibulares.png',
      ejercicios: []
    }
  ];

  ejercicios: Ejercicio[] = [
    {
      id: 5,
      nombre: 'Lengua Arriba',
      descripcion: 'Saca la lengua hacia arriba',
      instrucciones: '👅 ¡Saca la lengua! Trata de tocar tu nariz',
      duracion: 8,
      icono: '👅',
      imagen: 'assets/images/LenguaArriba.png',
      color: '#FF1493',
      seccionId: 'linguales'
    },
    {
      id: 11,
      nombre: 'Lengua Circular',
      descripcion: 'Haz movimientos circulares con la lengua',
      instrucciones: '🔄 ¡Gira la lengua! Haz círculos alrededor de tus labios',
      duracion: 10,
      icono: '🔄',
      imagen: 'assets/images/LenguaCircular.png',
      color: '#FF1493',
      seccionId: 'linguales'
    },
    {
      id: 12,
      nombre: 'Lengua Lateral',
      descripcion: 'Mueve la lengua de lado a lado',
      instrucciones: '↔️ ¡Toca las comisuras! Lengua de izquierda a derecha',
      duracion: 8,
      icono: '↔️',
      imagen: 'assets/images/LenguaLateral.png',
      color: '#FF1493',
      seccionId: 'linguales'
    },
    {
      id: 13,
      nombre: 'Vibración Lingual',
      descripcion: 'Haz vibrar la lengua como una "RR"',
      instrucciones: '🎵 ¡Vibra la lengua! Como cuando dices "RRRR"',
      duracion: 6,
      icono: '🎵',
      imagen:'assets/images/LenguaRR.png',
      color: '#FF1493',
      seccionId: 'linguales'
    },
    {
      id: 1,
      nombre: 'Sonrisa Grande',
      descripcion: 'Haz la sonrisa más grande que puedas',
      instrucciones: '😄 ¡Sonríe muy grande! Estira las comisuras hacia arriba',
      duracion: 10,
      icono: '😄',
      imagen: 'assets/images/SonrisaGrande.png',
      color: '#FFD700',
      seccionId: 'labiales'
    },
    {
      id: 2,
      nombre: 'Beso de Pez',
      descripcion: 'Haz como un pez con los labios',
      instrucciones: '🐠 ¡Haz un beso de pez! Junta y empuja los labios hacia adelante',
      duracion: 8,
      icono: '🐠',
      imagen: 'assets/images/BesoPez.png',
      color: '#FFD700',
      seccionId: 'labiales'
    },
    {
      id: 9,
      nombre: 'Vibrar Labios',
      descripcion: 'Haz vibrar los labios como un caballo',
      instrucciones: '🐴 ¡Como un caballo! Haz vibrar los labios "brrr"',
      duracion: 8,
      icono: '🐴',
      imagen: 'assets/images/VibrarLabiosVerdadero.png',
      color: '#FFD700',
      seccionId: 'labiales'
    },
    {
      id: 14,
      nombre: 'Sostener Lápiz',
      descripcion: 'Sostén un lápiz imaginario con los labios',
      instrucciones: '✏️ ¡Sostén fuerte! Imagina un lápiz entre tus labios',
      duracion: 12,
      icono: '✏️',
      imagen: 'assets/images/LabiosLapiz.png',
      color: '#FFD700',
      seccionId: 'labiales'
    },
    {
      id: 15,
      nombre: 'Besitos al Aire',
      descripcion: 'Haz besitos repetidos al aire',
      instrucciones: '💋 ¡Manda besitos! Repetidos y exagerados',
      duracion: 8,
      icono: '💋',
      imagen: 'assets/images/BesosAire.png',
      color: '#FFD700',
      seccionId: 'labiales'
    },
    {
      id: 6,
      nombre: 'Mejillas de Globo',
      descripcion: 'Infla las mejillas como un globo',
      instrucciones: '🎈 ¡Infla las mejillas! Llena de aire como un globo',
      duracion: 10,
      icono: '🎈',
      imagen: 'assets/images/MejillaDeGlobo.png',
      color: '#FFD700',
      seccionId: 'labiales'
    },
    {
      id: 3,
      nombre: 'Abrir la Boca',
      descripcion: 'Abre la boca lo más que puedas',
      instrucciones: '😮 ¡Abre grande la boca! Como si fueras a gritar "¡AAAA!"',
      duracion: 6,
      icono: '😮',
      imagen: 'assets/images/AbrirBoca.png',
      color: '#32CD32',
      seccionId: 'mandibulares'
    },
    {
      id: 8,
      nombre: 'Masticar Chicle',
      descripcion: 'Simula masticar chicle',
      instrucciones: '🍬 ¡Mastica chicle imaginario! Mueve la mandíbula',
      duracion: 15,
      icono: '🍬',
      imagen: 'assets/images/ChicleNiño.png',
      color: '#32CD32',
      seccionId: 'mandibulares'
    },
    {
      id: 16,
      nombre: 'Mandíbula Lateral',
      descripcion: 'Mueve la mandíbula hacia los lados',
      instrucciones: '↔️ ¡Lado a lado! Mueve la mandíbula izquierda-derecha',
      duracion: 10,
      icono: '↔️',
      imagen: 'assets/images/MandiLateral.png',
      color: '#32CD32',
      seccionId: 'mandibulares'
    },
    {
      id: 17,
      nombre: 'Bostezo Grande',
      descripcion: 'Simula un bostezo exagerado',
      instrucciones: '🥱 ¡Gran bostezo! Abre bien la boca y estira',
      duracion: 8,
      icono: '🥱',
      imagen: 'assets/images/Bostezo.png',
      color: '#32CD32',
      seccionId: 'mandibulares'
    },
    {
      id: 4,
      nombre: 'Guiño Alternado',
      descripcion: 'Guiña un ojo, luego el otro',
      instrucciones: '😉 ¡Guiña! Primero un ojo, luego el otro. ¡Alterna!',
      duracion: 12,
      icono: '😉',
      imagen: 'assets/images/Guiño.png',
      color: '#32CD32',
      seccionId: 'mandibulares'
    },
    {
      id: 7,
      nombre: 'Cara de Sorpresa',
      descripcion: 'Pon cara de mucha sorpresa',
      instrucciones: '😲 ¡Sorpréndete! Abre grande los ojos y la boca',
      duracion: 6,
      icono: '😲',
      imagen: 'assets/images/CaraSorpresa.png',
      color: '#32CD32',
      seccionId: 'mandibulares'
    },
    {
      id: 10,
      nombre: 'Inflar Globo',
      descripcion: 'Sopla como si inflaras un globo',
      instrucciones: '🎈 ¡Infla el globo! Sopla con fuerza hacia adelante',
      duracion: 10,
      icono: '🎈',
      imagen: 'assets/images/InflarGlobo.png',
      color: '#32CD32',
      seccionId: 'mandibulares'
    }
  ];

  get colorPuntuacion(): string {
    if (!this.ultimoResultado) return '#666';
    const puntuacion = this.ultimoResultado.puntuacion;
    if (puntuacion >= 80) return '#28a745';
    if (puntuacion >= 60) return '#ffc107';
    return '#dc3545';
  }

  get mensajeResultado(): string {
    if (!this.ultimoResultado) return '';
    const puntuacion = this.ultimoResultado.puntuacion;
    if (puntuacion >= 90) return '¡Excelente! ⭐⭐⭐';
    if (puntuacion >= 80) return '¡Muy bien! ⭐⭐';
    if (puntuacion >= 60) return '¡Bien! ⭐';
    return '¡Sigue practicando!';
  }

  ngOnInit() {
    this.cargarResultados();
    this.organizarEjerciciosPorSeccion();
  }

  ngAfterViewInit() {
    console.log('✅ ViewChild elementos disponibles');
  }

  ngOnDestroy() {
    if (this.camera) {
      this.camera.stop();
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
  }

  volverAlDashboard() {
    console.log('🏠 Volviendo al dashboard principal');
    this.router.navigate(['/dashboard']);
  }

  private organizarEjerciciosPorSeccion() {
    this.secciones.forEach(seccion => {
      seccion.ejercicios = this.ejercicios.filter(ej => ej.seccionId === seccion.id);
    });
  }

  seleccionarSeccion(seccion: Seccion) {
    console.log('📂 Seleccionando sección:', seccion.nombre);
    this.seccionActiva = seccion;
    this.vistaActual = 'ejercicios';
  }

  volverASecciones() {
    console.log('🏠 Volviendo a vista de secciones');
    this.cerrarModal(); // Cierra el modal primero
    this.seccionActiva = null;
    this.vistaActual = 'secciones';
  }

  // Función para cerrar el modal de resultados
  cerrarModal() {
    this.mostrarResultados = false;
    this.vistaActual = this.seccionActiva ? 'ejercicios' : 'secciones';
  }

  // Función para ajustar el brillo de un color (usado en el badge)
  ajustarBrillo(color: string, porcentaje: number): string {
    // Extrae los valores RGB del color hex
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Ajusta cada componente
    const ajustar = (valor: number) => {
      const nuevo = valor + (valor * porcentaje / 100);
      return Math.max(0, Math.min(255, Math.round(nuevo)));
    };
    
    const rNuevo = ajustar(r);
    const gNuevo = ajustar(g);
    const bNuevo = ajustar(b);
    
    // Convierte de vuelta a hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(rNuevo)}${toHex(gNuevo)}${toHex(bNuevo)}`;
  }

  getEjerciciosPorSeccion(seccionId: string): Ejercicio[] {
    return this.ejercicios.filter(ej => ej.seccionId === seccionId);
  }

  getEjerciciosCompletadosPorSeccion(seccionId: string): number {
    const ejerciciosSeccion = this.getEjerciciosPorSeccion(seccionId);
    return ejerciciosSeccion.filter(ej => 
      this.resultados[ej.id] && this.resultados[ej.id].completado
    ).length;
  }

  getProgresoSeccion(seccionId: string): number {
    const ejerciciosSeccion = this.getEjerciciosPorSeccion(seccionId);
    const completados = this.getEjerciciosCompletadosPorSeccion(seccionId);
    return ejerciciosSeccion.length > 0 ? Math.round((completados / ejerciciosSeccion.length) * 100) : 0;
  }

  // 📅 FUNCIONES PARA MANEJO DE REPETICIONES DIARIAS
  
  // Obtiene la fecha de hoy en formato YYYY-MM-DD
  private obtenerFechaHoy(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  // Verifica si una fecha es hoy
  private esFechaHoy(fecha: string): boolean {
    return fecha === this.obtenerFechaHoy();
  }

  // Obtiene las repeticiones del ejercicio para hoy
  getRepeticionesHoy(ejercicioId: number): number {
    const resultado = this.resultados[ejercicioId];
    if (!resultado) return 0;
    
    // Si la última repetición fue hoy, retorna el contador
    if (this.esFechaHoy(resultado.fechaUltimaRepeticion)) {
      return resultado.repeticionesHoy;
    }
    
    // Si fue otro día, el contador se reinicia
    return 0;
  }

  // Verifica si el ejercicio está completado HOY (3 repeticiones)
  isEjercicioCompletadoHoy(ejercicioId: number): boolean {
    const repeticiones = this.getRepeticionesHoy(ejercicioId);
    return repeticiones >= 3;
  }

  // Obtiene cuántas repeticiones faltan para completar hoy
  getRepeticionesFaltantes(ejercicioId: number): number {
    const repeticiones = this.getRepeticionesHoy(ejercicioId);
    return Math.max(0, 3 - repeticiones);
  }

  private async initializeMediaPipe() {
    try {
      console.log('🚀 Inicializando MediaPipe para ejercicios...');
      
      if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
        console.error('❌ Elementos de video/canvas no disponibles');
        return;
      }
      
      this.canvasCtx = this.canvasElement.nativeElement.getContext('2d')!;
      
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      // ⚡ CONFIGURACIÓN OPTIMIZADA PARA MEJOR RENDIMIENTO Y CALIDAD
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,  // ⚡ Aumentado para mejor detección
        minTrackingConfidence: 0.5    // ⚡ Aumentado para tracking más estable
      });

      this.faceMesh.onResults((results) => {
        this.onResults(results);
      });

      this.mediaPipeReady = true;
      console.log('✅ MediaPipe listo para ejercicios');
    } catch (error) {
      console.error('❌ Error inicializando MediaPipe:', error);
      this.mediaPipeReady = false;
    }
  }

  // ✨ Variable para rastrear detección en tiempo real
  private ejercicioDetectadoAhora = false;
  
  // 👁️ Variable para mostrar/ocultar landmarks
  mostrarLandmarks = true;

  private onResults(results: any) {
    if (!this.canvasCtx || !this.ejercicioActivo) return;

    const canvas = this.canvasElement.nativeElement;
    
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // ⚡ Mantener calidad de imagen original
    this.canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // ✨ Incrementar frame de animación
      this.animationFrame++;
      
      // ✅ Verificar detección ANTES de dibujar para usar el color correcto
      this.ejercicioDetectadoAhora = this.verificarDeteccionEjercicio(landmarks);
      
      // ✅ Solo dibujar si el usuario quiere ver los landmarks
      if (this.mostrarLandmarks) {
        this.dibujarVisualizacionMinimalista(landmarks);
      }
      
      this.analizarEjercicio(landmarks);
    }

    this.canvasCtx.restore();
  }

  // ✨ VERIFICAR DETECCIÓN DEL EJERCICIO (sin contar frames)
  private verificarDeteccionEjercicio(landmarks: any[]): boolean {
    if (!this.ejercicioActivo || !this.ejercicioIniciado) return false;

    switch (this.ejercicioActivo.id) {
      case 1: return this.detectarSonrisa(landmarks);
      case 2: return this.detectarBesoPez(landmarks);
      case 3: return this.detectarBocaAbierta(landmarks);
      case 4: return this.detectarGuino(landmarks);
      case 5: return this.detectarLenguaArriba(landmarks);
      case 6: return this.detectarMejillasInfladas(landmarks);
      case 7: return this.detectarSorpresa(landmarks);
      case 8: return this.detectarMasticado(landmarks);
      case 9: return this.detectarVibracionLabios(landmarks);
      case 10: return this.detectarInflarGlobo(landmarks);
      case 11: return this.detectarLenguaCircular(landmarks);
      case 12: return this.detectarLenguaLateral(landmarks);
      case 13: return this.detectarVibracionLingual(landmarks);
      case 14: return this.detectarSostenerLapiz(landmarks);
      case 15: return this.detectarBesitosAire(landmarks);
      case 16: return this.detectarMandibularLateral(landmarks);
      case 17: return this.detectarBostezo(landmarks);
      default: return false;
    }
  }

  // ✨ OBTENER COLOR DINÁMICO SEGÚN ESTADO
  private getColorDinamico(): string {
    if (!this.ejercicioActivo) return '#666';
    
    // Si el ejercicio se está detectando correctamente = VERDE SUAVE
    if (this.ejercicioDetectadoAhora) {
      return '#28a745'; // Verde suave (éxito)
    }
    
    // Si no se detecta = Color original del ejercicio
    return this.ejercicioActivo.color;
  }

  // ✨ NUEVO SISTEMA DE VISUALIZACIÓN MINIMALISTA
  private dibujarVisualizacionMinimalista(landmarks: any[]) {
    if (!this.ejercicioActivo) return;
    
    // ✅ Usar color dinámico en lugar de color fijo
    const color = this.getColorDinamico();
    
    switch (this.ejercicioActivo.id) {
      case 5: // Lengua Arriba
        this.dibujarLenguaArribaMinimalista(landmarks, color);
        break;
      case 1: // Sonrisa Grande
        this.dibujarSonrisaMinimalista(landmarks, color);
        break;
      case 2: // Beso de Pez
        this.dibujarBesoPezMinimalista(landmarks, color);
        break;
      case 3: // Abrir la Boca
        this.dibujarAperturaBocaMinimalista(landmarks, color);
        break;
      case 4: // Guiño Alternado
        this.dibujarGuinoMinimalista(landmarks, color);
        break;
      case 6: // Mejillas de Globo
        this.dibujarMejillasInfladasMinimalista(landmarks, color);
        break;
      case 7: // Cara de Sorpresa
        this.dibujarSorpresaMinimalista(landmarks, color);
        break;
      case 8: // Masticar Chicle
        this.dibujarMasticadoMinimalista(landmarks, color);
        break;
      case 9: // Vibrar Labios
        this.dibujarVibracionLabiosMinimalista(landmarks, color);
        break;
      case 10: // Inflar Globo
        this.dibujarInflarGloboMinimalista(landmarks, color);
        break;
      case 11: // Lengua Circular
        this.dibujarLenguaCircularMinimalista(landmarks, color);
        break;
      case 12: // Lengua Lateral
        this.dibujarLenguaLateralMinimalista(landmarks, color);
        break;
      case 13: // Vibración Lingual
        this.dibujarVibracionLingualMinimalista(landmarks, color);
        break;
      case 14: // Sostener Lápiz
        this.dibujarSostenerLapizMinimalista(landmarks, color);
        break;
      case 15: // Besitos al Aire
        this.dibujarBesitosAireMinimalista(landmarks, color);
        break;
      case 16: // Mandíbula Lateral
        this.dibujarMandibulaLateralMinimalista(landmarks, color);
        break;
      case 17: // Bostezo Grande
        this.dibujarBostezoMinimalista(landmarks, color);
        break;
    }
  }

  // ✨ LENGUA ARRIBA - VISUALIZACIÓN MINIMALISTA CON FEEDBACK
  private dibujarLenguaArribaMinimalista(landmarks: any[], color: string) {
    const canvas = this.canvasElement.nativeElement;
    const ctx = this.canvasCtx;
    
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const nariz = landmarks[1];
    
    if (!labioSuperior || !labioInferior || !nariz) return;
    
    // Punto principal animado en el labio superior
    const puntoX = labioSuperior.x * canvas.width;
    const puntoY = labioSuperior.y * canvas.height;
    
    // Punto más pequeño cuando está correcto
    const pulsoBase = this.ejercicioDetectadoAhora ? 4.5 : 5;
    const pulsoVariacion = this.ejercicioDetectadoAhora ? 1 : 1.5;
    const pulso = Math.sin(this.animationFrame * 0.15) * pulsoVariacion + pulsoBase;
    
    // Sombra moderada cuando está correcto
    const shadowBlur = this.ejercicioDetectadoAhora ? 12 : 10;
    
    // Sombra del punto
    ctx.shadowColor = color;
    ctx.shadowBlur = shadowBlur;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(puntoX, puntoY, pulso, 0, 2 * Math.PI);
    ctx.fill();
    
    // Punto interior más brillante
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(puntoX, puntoY, pulso * 0.35, 0, 2 * Math.PI);
    ctx.fill();
    
    // Línea guía vertical desde labio inferior hasta nariz
    const lineaInicioX = labioInferior.x * canvas.width;
    const lineaInicioY = labioInferior.y * canvas.height;
    const lineaFinX = nariz.x * canvas.width;
    const lineaFinY = nariz.y * canvas.height;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = color;
    ctx.shadowBlur = this.ejercicioDetectadoAhora ? 10 : 8;
    
    ctx.beginPath();
    ctx.moveTo(lineaInicioX, lineaInicioY);
    ctx.lineTo(lineaFinX, lineaFinY);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }

  // ✨ SONRISA GRANDE - VISUALIZACIÓN MINIMALISTA CON FEEDBACK
  private dibujarSonrisaMinimalista(landmarks: any[], color: string) {
    const canvas = this.canvasElement.nativeElement;
    const ctx = this.canvasCtx;
    
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    
    if (!comisuraIzq || !comisuraDer) return;
    
    // Puntos más pequeños cuando está correcto
    const pulsoBase = this.ejercicioDetectadoAhora ? 3.5 : 4;
    const pulsoVariacion = this.ejercicioDetectadoAhora ? 1 : 1.5;
    const pulso = Math.sin(this.animationFrame * 0.15) * pulsoVariacion + pulsoBase;
    const shadowBlur = this.ejercicioDetectadoAhora ? 12 : 10;
    
    [comisuraIzq, comisuraDer].forEach(punto => {
      const x = punto.x * canvas.width;
      const y = punto.y * canvas.height;
      
      ctx.shadowColor = color;
      ctx.shadowBlur = shadowBlur;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, pulso, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, pulso * 0.35, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Línea suave conectando comisuras
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = this.ejercicioDetectadoAhora ? 10 : 8;
    
    ctx.beginPath();
    ctx.moveTo(comisuraIzq.x * canvas.width, comisuraIzq.y * canvas.height);
    ctx.lineTo(comisuraDer.x * canvas.width, comisuraDer.y * canvas.height);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
  }

  // ✨ BESO DE PEZ - VISUALIZACIÓN MINIMALISTA CON FEEDBACK
  private dibujarBesoPezMinimalista(landmarks: any[], color: string) {
    const canvas = this.canvasElement.nativeElement;
    const ctx = this.canvasCtx;
    
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    
    if (!labioSuperior || !labioInferior || !comisuraIzq || !comisuraDer) return;
    
    // Punto central más pequeño cuando está correcto
    const centroX = (labioSuperior.x + labioInferior.x) / 2 * canvas.width;
    const centroY = (labioSuperior.y + labioInferior.y) / 2 * canvas.height;
    const pulsoBase = this.ejercicioDetectadoAhora ? 4.5 : 5;
    const pulsoVariacion = this.ejercicioDetectadoAhora ? 1 : 1.5;
    const pulso = Math.sin(this.animationFrame * 0.15) * pulsoVariacion + pulsoBase;
    const shadowBlur = this.ejercicioDetectadoAhora ? 12 : 10;
    
    ctx.shadowColor = color;
    ctx.shadowBlur = shadowBlur;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centroX, centroY, pulso, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(centroX, centroY, pulso * 0.35, 0, 2 * Math.PI);
    ctx.fill();
    
    // Líneas horizontales mostrando fruncido
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.shadowColor = color;
    ctx.shadowBlur = this.ejercicioDetectadoAhora ? 10 : 6;
    
    ctx.beginPath();
    ctx.moveTo(comisuraIzq.x * canvas.width, comisuraIzq.y * canvas.height);
    ctx.lineTo(comisuraDer.x * canvas.width, comisuraDer.y * canvas.height);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }

  // ✨ ABRIR BOCA - VISUALIZACIÓN MINIMALISTA CON FEEDBACK
  private dibujarAperturaBocaMinimalista(landmarks: any[], color: string) {
    const canvas = this.canvasElement.nativeElement;
    const ctx = this.canvasCtx;
    
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    
    if (!labioSup || !labioInf) return;
    
    // Línea vertical con grosor moderado
    const x = (labioSup.x + labioInf.x) / 2 * canvas.width;
    const yInicio = labioSup.y * canvas.height;
    const yFin = labioInf.y * canvas.height;
    
    const lineWidth = this.ejercicioDetectadoAhora ? 3 : 3;
    const shadowBlur = this.ejercicioDetectadoAhora ? 10 : 10;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = shadowBlur;
    
    ctx.beginPath();
    ctx.moveTo(x, yInicio);
    ctx.lineTo(x, yFin);
    ctx.stroke();
    
    // Puntos en extremos más pequeños cuando está correcto
    const pulsoBase = this.ejercicioDetectadoAhora ? 4.5 : 5;
    const pulsoVariacion = this.ejercicioDetectadoAhora ? 1 : 1.5;
    const pulso = Math.sin(this.animationFrame * 0.15) * pulsoVariacion + pulsoBase;
    
    [labioSup, labioInf].forEach(punto => {
      const px = punto.x * canvas.width;
      const py = punto.y * canvas.height;
      
      ctx.shadowBlur = this.ejercicioDetectadoAhora ? 12 : 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, pulso, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(px, py, pulso * 0.35, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    ctx.shadowBlur = 0;
  }

  // ✨ FUNCIONES MINIMALISTAS PARA OTROS EJERCICIOS
  private dibujarGuinoMinimalista(landmarks: any[], color: string) {
    const ojoIzqSuperior = landmarks[159];
    const ojoIzqInferior = landmarks[145];
    const ojoDerSuperior = landmarks[386];
    const ojoDerInferior = landmarks[374];
    
    if (!ojoIzqSuperior || !ojoIzqInferior || !ojoDerSuperior || !ojoDerInferior) return;
    
    this.dibujarPuntoAnimado(ojoIzqSuperior, color);
    this.dibujarPuntoAnimado(ojoDerSuperior, color);
  }

  private dibujarMejillasInfladasMinimalista(landmarks: any[], color: string) {
    const mejillaIzq = landmarks[234];
    const mejillaDer = landmarks[454];
    
    if (!mejillaIzq || !mejillaDer) return;
    
    this.dibujarPuntoAnimado(mejillaIzq, color, 6);
    this.dibujarPuntoAnimado(mejillaDer, color, 6);
  }

  private dibujarSorpresaMinimalista(landmarks: any[], color: string) {
    this.dibujarAperturaBocaMinimalista(landmarks, color);
    this.dibujarGuinoMinimalista(landmarks, color);
  }

  private dibujarMasticadoMinimalista(landmarks: any[], color: string) {
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    
    if (!labioSup || !labioInf) return;
    
    this.dibujarPuntoAnimado(labioSup, color);
    this.dibujarPuntoAnimado(labioInf, color);
  }

  private dibujarVibracionLabiosMinimalista(landmarks: any[], color: string) {
    this.dibujarSonrisaMinimalista(landmarks, color);
  }

  private dibujarInflarGloboMinimalista(landmarks: any[], color: string) {
    this.dibujarBesoPezMinimalista(landmarks, color);
  }

  private dibujarLenguaCircularMinimalista(landmarks: any[], color: string) {
    this.dibujarSonrisaMinimalista(landmarks, color);
  }

  private dibujarLenguaLateralMinimalista(landmarks: any[], color: string) {
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    
    if (!comisuraIzq || !comisuraDer) return;
    
    this.dibujarPuntoAnimado(comisuraIzq, color, 5);
    this.dibujarPuntoAnimado(comisuraDer, color, 5);
  }

  private dibujarVibracionLingualMinimalista(landmarks: any[], color: string) {
    this.dibujarLenguaArribaMinimalista(landmarks, color);
  }

  private dibujarSostenerLapizMinimalista(landmarks: any[], color: string) {
    this.dibujarBesoPezMinimalista(landmarks, color);
  }

  private dibujarBesitosAireMinimalista(landmarks: any[], color: string) {
    this.dibujarBesoPezMinimalista(landmarks, color);
  }

  private dibujarMandibulaLateralMinimalista(landmarks: any[], color: string) {
    const barbilla = landmarks[152];
    if (!barbilla) return;
    this.dibujarPuntoAnimado(barbilla, color, 6);
  }

  private dibujarBostezoMinimalista(landmarks: any[], color: string) {
    this.dibujarAperturaBocaMinimalista(landmarks, color);
  }

  // ✨ FUNCIÓN HELPER PARA DIBUJAR PUNTO ANIMADO CON FEEDBACK
  private dibujarPuntoAnimado(landmark: any, color: string, tamañoBase: number = 5) {
    const canvas = this.canvasElement.nativeElement;
    const ctx = this.canvasCtx;
    
    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;
    
    // Punto más pequeño y pulso más sutil cuando está correcto
    const pulsoVariacion = this.ejercicioDetectadoAhora ? 1 : 1.5;
    const pulsoBaseAjustado = this.ejercicioDetectadoAhora ? tamañoBase - 0.5 : tamañoBase;
    const pulso = Math.sin(this.animationFrame * 0.15) * pulsoVariacion + pulsoBaseAjustado;
    const shadowBlur = this.ejercicioDetectadoAhora ? 12 : 10;
    
    // Sombra y punto principal
    ctx.shadowColor = color;
    ctx.shadowBlur = shadowBlur;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, pulso, 0, 2 * Math.PI);
    ctx.fill();
    
    // Punto interior brillante
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(x, y, pulso * 0.35, 0, 2 * Math.PI);
    ctx.fill();
  }

  private analizarEjercicio(landmarks: any[]) {
    if (!this.ejercicioActivo || !this.ejercicioIniciado) return;

    this.contadorFramesTotales++;
    let esCorrectoFrame = false;

    switch (this.ejercicioActivo.id) {
      case 1: esCorrectoFrame = this.detectarSonrisa(landmarks); break;
      case 2: esCorrectoFrame = this.detectarBesoPez(landmarks); break;
      case 3: esCorrectoFrame = this.detectarBocaAbierta(landmarks); break;
      case 4: esCorrectoFrame = this.detectarGuino(landmarks); break;
      case 5: esCorrectoFrame = this.detectarLenguaArriba(landmarks); break;
      case 6: esCorrectoFrame = this.detectarMejillasInfladas(landmarks); break;
      case 7: esCorrectoFrame = this.detectarSorpresa(landmarks); break;
      case 8: esCorrectoFrame = this.detectarMasticado(landmarks); break;
      case 9: esCorrectoFrame = this.detectarVibracionLabios(landmarks); break;
      case 10: esCorrectoFrame = this.detectarInflarGlobo(landmarks); break;
      case 11: esCorrectoFrame = this.detectarLenguaCircular(landmarks); break;
      case 12: esCorrectoFrame = this.detectarLenguaLateral(landmarks); break;
      case 13: esCorrectoFrame = this.detectarVibracionLingual(landmarks); break;
      case 14: esCorrectoFrame = this.detectarSostenerLapiz(landmarks); break;
      case 15: esCorrectoFrame = this.detectarBesitosAire(landmarks); break;
      case 16: esCorrectoFrame = this.detectarMandibularLateral(landmarks); break;
      case 17: esCorrectoFrame = this.detectarBostezo(landmarks); break;
    }

    if (esCorrectoFrame) {
      this.contadorFramesCorrectos++;
      this.mostrarFeedback('¡Muy bien! ¡Sigue así! 😊', 'success');
    } else {
      this.mostrarFeedback('¡Vamos, tú puedes! 💪', 'warning');
    }

    this.landmarksAnteriores = landmarks;
  }

  private detectarSonrisa(landmarks: any[]): boolean {
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    const centroSuperior = landmarks[13];
    const centroInferior = landmarks[14];
    
    if (!comisuraIzq || !comisuraDer || !centroSuperior || !centroInferior) return false;
    
    const alturaComisuras = (comisuraIzq.y + comisuraDer.y) / 2;
    const alturaCentro = (centroSuperior.y + centroInferior.y) / 2;
    const anchoLabios = Math.abs(comisuraDer.x - comisuraIzq.x);
    
    return (alturaCentro > alturaComisuras) && (anchoLabios > 0.03);
  }

  private detectarBesoPez(landmarks: any[]): boolean {
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    const labioSupExt = landmarks[0];
    const labioInfExt = landmarks[17];
    
    if (!labioSuperior || !labioInferior || !comisuraIzq || !comisuraDer || !labioSupExt || !labioInfExt) return false;
    
    const aperturaLabial = Math.abs(labioSuperior.y - labioInferior.y);
    const labiosCerrados = aperturaLabial < 0.022;
    
    const anchoLabios = Math.abs(comisuraDer.x - comisuraIzq.x);
    const labiosFruncidos = anchoLabios < 0.045;
    
    const proyeccionSuperior = Math.abs(labioSupExt.y - labioSuperior.y);
    const proyeccionInferior = Math.abs(labioInfExt.y - labioInferior.y);
    const labiosProyectados = (proyeccionSuperior + proyeccionInferior) > 0.015;
    
    return labiosCerrados && labiosFruncidos && labiosProyectados;
  }

  private detectarBocaAbierta(landmarks: any[]): boolean {
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    
    if (!labioSuperior || !labioInferior) return false;
    
    const apertura = Math.abs(labioSuperior.y - labioInferior.y);
    return apertura > 0.04;
  }

  private detectarGuino(landmarks: any[]): boolean {
    const ojoIzqSuperior = landmarks[159];
    const ojoIzqInferior = landmarks[145];
    const ojoDerSuperior = landmarks[386];
    const ojoDerInferior = landmarks[374];
    
    if (!ojoIzqSuperior || !ojoIzqInferior || !ojoDerSuperior || !ojoDerInferior) return false;
    
    const aperturaIzq = Math.abs(ojoIzqSuperior.y - ojoIzqInferior.y);
    const aperturaDer = Math.abs(ojoDerSuperior.y - ojoDerInferior.y);
    
    const diferencia = Math.abs(aperturaIzq - aperturaDer);
    const hayGuino = diferencia > 0.006;
    
    const ojoIzqCerrado = aperturaIzq < 0.012;
    const ojoDerCerrado = aperturaDer < 0.012;
    const unOjoCerrado = ojoIzqCerrado || ojoDerCerrado;
    
    const ojoIzqAbierto = aperturaIzq > 0.015;
    const ojoDerAbierto = aperturaDer > 0.015;
    const unOjoAbierto = ojoIzqAbierto || ojoDerAbierto;
    
    return hayGuino && unOjoCerrado && unOjoAbierto;
  }

  private detectarLenguaArriba(landmarks: any[]): boolean {
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const barbilla = landmarks[18];
    const nariz = landmarks[1];
    
    if (!labioSuperior || !labioInferior || !barbilla || !nariz) return false;
    
    const aperturaBoca = Math.abs(labioSuperior.y - labioInferior.y);
    const bocaAbierta = aperturaBoca > 0.025;
    
    const centroLabios = (labioSuperior.y + labioInferior.y) / 2;
    const lenguaAlta = centroLabios < (labioSuperior.y + 0.010);
    
    const desplazamientoZ = Math.abs(labioInferior.z - labioSuperior.z);
    const lenguaVisible = desplazamientoZ > 0.005;
    
    return bocaAbierta && (lenguaAlta || lenguaVisible);
  }

  private detectarMejillasInfladas(landmarks: any[]): boolean {
    const mejillaIzq = landmarks[234];
    const mejillaDer = landmarks[454];
    const nariz = landmarks[1];
    
    if (!mejillaIzq || !mejillaDer || !nariz) return false;
    
    const anchoNormal = Math.abs(mejillaDer.x - mejillaIzq.x);
    return anchoNormal > 0.20;
  }

  private detectarSorpresa(landmarks: any[]): boolean {
    const ojoIzqSup = landmarks[159];
    const ojoIzqInf = landmarks[145];
    const ojoDerSup = landmarks[386];
    const ojoDerInf = landmarks[374];
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    
    if (!ojoIzqSup || !ojoIzqInf || !ojoDerSup || !ojoDerInf || !labioSup || !labioInf) return false;
    
    const aperturaOjoIzq = Math.abs(ojoIzqSup.y - ojoIzqInf.y);
    const aperturaOjoDer = Math.abs(ojoDerSup.y - ojoDerInf.y);
    const aperturaBoca = Math.abs(labioSup.y - labioInf.y);
    
    const ojosAbiertos = (aperturaOjoIzq > 0.020) && (aperturaOjoDer > 0.020);
    const bocaAbierta = aperturaBoca > 0.035;
    
    return ojosAbiertos && bocaAbierta;
  }

  private detectarMasticado(landmarks: any[]): boolean {
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    
    if (!labioSup || !labioInf || !comisuraIzq || !comisuraDer) return false;
    
    const apertura = Math.abs(labioSup.y - labioInf.y);
    const movimientoLateral = Math.abs(comisuraIzq.y - comisuraDer.y);
    
    return (apertura > 0.015) && (movimientoLateral > 0.008);
  }

  private detectarVibracionLabios(landmarks: any[]): boolean {
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    
    if (!labioSup || !labioInf) return false;
    
    const apertura = Math.abs(labioSup.y - labioInf.y);
    return apertura > 0.008 && apertura < 0.025;
  }

  private detectarInflarGlobo(landmarks: any[]): boolean {
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    
    if (!labioSup || !labioInf || !comisuraIzq || !comisuraDer) return false;
    
    const apertura = Math.abs(labioSup.y - labioInf.y);
    const proyeccion = Math.abs(labioSup.z - labioInf.z);
    
    return (apertura < 0.015) && (proyeccion > 0.008);
  }

  private detectarLenguaCircular(landmarks: any[]): boolean {
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    
    if (!labioSup || !labioInf || !comisuraIzq || !comisuraDer) return false;
    
    const apertura = Math.abs(labioSup.y - labioInf.y);
    const movimiento = Math.abs(comisuraIzq.x - comisuraDer.x);
    
    return (apertura > 0.020) && (movimiento > 0.04);
  }

  private detectarLenguaLateral(landmarks: any[]): boolean {
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    const centroLabios = landmarks[13];
    
    if (!comisuraIzq || !comisuraDer || !centroLabios) return false;
    
    const desplazamientoX = Math.abs(centroLabios.x - ((comisuraIzq.x + comisuraDer.x) / 2));
    return desplazamientoX > 0.015;
  }

  private detectarVibracionLingual(landmarks: any[]): boolean {
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    
    if (!labioSup || !labioInf) return false;
    
    const apertura = Math.abs(labioSup.y - labioInf.y);
    return apertura > 0.015 && apertura < 0.045;
  }

  private detectarSostenerLapiz(landmarks: any[]): boolean {
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    
    if (!labioSup || !labioInf || !comisuraIzq || !comisuraDer) return false;
    
    const apertura = Math.abs(labioSup.y - labioInf.y);
    const anchoLabios = Math.abs(comisuraDer.x - comisuraIzq.x);
    
    return (apertura < 0.012) && (anchoLabios < 0.045);
  }

  private detectarBesitosAire(landmarks: any[]): boolean {
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    
    if (!labioSup || !labioInf || !comisuraIzq || !comisuraDer) return false;
    
    const apertura = Math.abs(labioSup.y - labioInf.y);
    const anchoLabios = Math.abs(comisuraDer.x - comisuraIzq.x);
    
    return (apertura < 0.020) && (anchoLabios < 0.050);
  }

  private detectarMandibularLateral(landmarks: any[]): boolean {
    const barbilla = landmarks[152];
    const nariz = landmarks[1];
    
    if (!barbilla || !nariz) return false;
    
    const desplazamientoX = Math.abs(barbilla.x - nariz.x);
    return desplazamientoX > 0.015;
  }

  private detectarBostezo(landmarks: any[]): boolean {
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    const ojoIzqSup = landmarks[159];
    const ojoIzqInf = landmarks[145];
    
    if (!labioSup || !labioInf || !ojoIzqSup || !ojoIzqInf) return false;
    
    const aperturaBoca = Math.abs(labioSup.y - labioInf.y);
    const aperturaOjo = Math.abs(ojoIzqSup.y - ojoIzqInf.y);
    
    return (aperturaBoca > 0.050) && (aperturaOjo < 0.015);
  }

  private mostrarFeedback(mensaje: string, tipo: 'success' | 'warning' | 'error') {
    const ahora = Date.now();
    
    if (ahora - this.ultimoTiempoFeedback < 1000) {
      return;
    }
    
    this.ultimoTiempoFeedback = ahora;
    this.mensajeFeedback = mensaje;
    this.feedbackTipo = tipo;
    
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    
    this.feedbackTimeout = setTimeout(() => {
      this.mensajeFeedback = '';
      this.feedbackTipo = '';
    }, 3000);
  }

  iniciarEjercicio(ejercicio: Ejercicio) {
    console.log('🎮 Iniciando ejercicio:', ejercicio.nombre);
    this.ejercicioActivo = ejercicio;
    this.vistaActual = 'activo';
    this.mostrarResultados = false;
    this.ultimoResultado = null;
    
    this.tiempoRestante = 0;
    this.puntuacionActual = 0;
    this.progresoEjercicio = 0;
    this.mensajeFeedback = '';
    this.feedbackTipo = '';
    this.contadorFramesCorrectos = 0;
    this.contadorFramesTotales = 0;
    this.ejercicioIniciado = false;
    this.ultimoTiempoFeedback = 0;
    this.animationFrame = 0;
    
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.startCamera();
    }, 1000);
  }

  private async startCamera() {
    try {
      console.log('🎥 Iniciando cámara...');
      
      if (this.isRecording) {
        console.log('⚠️ Cámara ya estaba activa, reiniciando...');
        this.stopCamera();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      this.landmarksAnteriores = [];
      this.contadorFramesCorrectos = 0;
      this.contadorFramesTotales = 0;
      this.animationFrame = 0;
      
      this.mediaPipeReady = false;
      
      let intentos = 0;
      while ((!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) && intentos < 10) {
        console.log(`⏳ Esperando elementos DOM (intento ${intentos + 1}/10)...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        intentos++;
      }
      
      if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
        console.error('❌ Elementos de video/canvas no disponibles después de espera');
        return;
      }

      console.log('✅ Elementos DOM disponibles');

      console.log('📋 Reinicializando MediaPipe...');
      await this.initializeMediaPipe();
      
      if (!this.mediaPipeReady) {
        console.error('❌ MediaPipe no se pudo inicializar');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('📷 Creando instancia de cámara...');
      this.camera = new Camera(this.videoElement.nativeElement, {
        onFrame: async () => {
          try {
            await this.faceMesh.send({ image: this.videoElement.nativeElement });
          } catch (error) {
            console.error('❌ Error enviando frame:', error);
          }
        },
        width: 640,
        height: 480
      });
      
      console.log('▶️ Iniciando stream de cámara...');
      await this.camera.start();
      this.isRecording = true;
      this.iniciarContadorEjercicio();
      
      console.log('✅ Cámara iniciada correctamente');
    } catch (error) {
      console.error('❌ Error starting camera:', error);
      this.isRecording = false;
      alert('Error al acceder a la cámara. Verifica los permisos.');
    }
  }

  private iniciarContadorEjercicio() {
    if (!this.ejercicioActivo) return;
    
    this.tiempoRestante = this.ejercicioActivo.duracion;
    this.puntuacionActual = 0;
    this.progresoEjercicio = 0;
    this.contadorFramesCorrectos = 0;
    this.contadorFramesTotales = 0;
    this.ejercicioIniciado = true;
    
    this.intervalTimer = setInterval(() => {
      this.tiempoRestante--;
      this.progresoEjercicio = ((this.ejercicioActivo!.duracion - this.tiempoRestante) / this.ejercicioActivo!.duracion) * 100;
      
      if (this.tiempoRestante <= 0) {
        this.finalizarEjercicio();
      }
    }, 1000);
  }

  private finalizarEjercicio() {
    console.log('🏁 Finalizando ejercicio...');
    
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    
    this.ejercicioIniciado = false;
    
    if (this.ejercicioActivo) {
      let puntuacionCalculada = 0;
      
      if (this.contadorFramesTotales > 0) {
        puntuacionCalculada = Math.round(
          (this.contadorFramesCorrectos / this.contadorFramesTotales) * 100
        );
      }
      
      this.puntuacionActual = puntuacionCalculada;
      
      console.log('📊 Frames correctos:', this.contadorFramesCorrectos);
      console.log('📊 Frames totales:', this.contadorFramesTotales);
      console.log('📊 Puntuación final:', puntuacionCalculada + '%');
      
      // 📅 SISTEMA DE REPETICIONES DIARIAS
      const ejercicioId = this.ejercicioActivo.id;
      const resultadoAnterior = this.resultados[ejercicioId];
      const fechaHoy = this.obtenerFechaHoy();
      
      let repeticionesHoy = 1; // Esta es la primera repetición
      
      // Si ya existe un resultado anterior
      if (resultadoAnterior) {
        // Si la última repetición fue hoy, incrementa el contador
        if (this.esFechaHoy(resultadoAnterior.fechaUltimaRepeticion)) {
          repeticionesHoy = resultadoAnterior.repeticionesHoy + 1;
        }
        // Si fue otro día, reinicia el contador a 1
      }
      
      // El ejercicio está completado si tiene 3 o más repeticiones HOY
      const completadoHoy = repeticionesHoy >= 3;
      
      const resultado: ResultadoEjercicio = {
        ejercicioId: ejercicioId,
        puntuacion: puntuacionCalculada,
        completado: completadoHoy, // ✅ Ahora se basa en repeticiones, no en puntuación
        tiempoRealizado: this.ejercicioActivo.duracion,
        errores: this.contadorFramesTotales - this.contadorFramesCorrectos,
        repeticionesHoy: repeticionesHoy,
        fechaUltimaRepeticion: fechaHoy,
        repeticionesRequeridas: 3
      };
      
      this.resultados[ejercicioId] = resultado;
      this.ultimoResultado = resultado;
      this.guardarResultados();
      
      console.log('📊 Resultado final:', resultado);
      console.log('🔄 Repeticiones hoy:', repeticionesHoy);
      console.log('✅ Completado hoy:', completadoHoy);
    }
    
    this.stopCamera();
    
    setTimeout(() => {
      this.mostrarResultados = true;
      this.vistaActual = 'resultados';
      this.cdr.detectChanges();
      console.log('🎉 Mostrando pantalla de resultados');
    }, 500);
  }

  detenerEjercicio() {
    this.finalizarEjercicio();
  }

  reiniciarEjercicio() {
    if (this.ejercicioActivo) {
      this.iniciarEjercicio(this.ejercicioActivo);
    }
  }

  volverAlMenu() {
    console.log('🏠 Volviendo al menú de ejercicios...');
    this.ejercicioActivo = null;
    this.mostrarResultados = false; // Cierra el modal
    this.vistaActual = this.seccionActiva ? 'ejercicios' : 'secciones';
    this.stopCamera();
    
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    
    this.tiempoRestante = 0;
    this.puntuacionActual = 0;
    this.progresoEjercicio = 0;
    this.mensajeFeedback = '';
    this.feedbackTipo = '';
    this.contadorFramesCorrectos = 0;
    this.contadorFramesTotales = 0;
    this.ejercicioIniciado = false;
    this.ultimoTiempoFeedback = 0;
    this.animationFrame = 0;
  }

  repetirEjercicio() {
    console.log('🔄 Repitiendo ejercicio...');
    
    this.stopCamera();
    
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    
    this.mostrarResultados = false;
    this.tiempoRestante = 0;
    this.puntuacionActual = 0;
    this.progresoEjercicio = 0;
    this.mensajeFeedback = '';
    this.feedbackTipo = '';
    this.contadorFramesCorrectos = 0;
    this.contadorFramesTotales = 0;
    this.ejercicioIniciado = false;
    this.isRecording = false;
    this.landmarksAnteriores = [];
    this.ultimoTiempoFeedback = 0;
    this.animationFrame = 0;
    
    this.vistaActual = 'activo';
    this.cdr.detectChanges();
    
    setTimeout(() => {
      if (this.ejercicioActivo) {
        this.startCamera();
      }
    }, 800);
  }

  private stopCamera() {
    console.log('🛑 Deteniendo cámara...');
    
    if (this.camera) {
      try {
        this.camera.stop();
      } catch (error) {
        console.warn('⚠️ Error deteniendo cámara:', error);
      }
      this.camera = null as any;
    }
    
    if (this.faceMesh) {
      try {
        this.faceMesh.close();
        console.log('🛑 FaceMesh cerrado');
      } catch (error) {
        console.warn('⚠️ Error cerrando FaceMesh:', error);
      }
    }
    
    if (this.canvasCtx && this.canvasElement?.nativeElement) {
      const canvas = this.canvasElement.nativeElement;
      this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      this.canvasCtx.fillStyle = '#000000';
      this.canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    if (this.videoElement?.nativeElement?.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track detenido:', track.kind);
      });
      this.videoElement.nativeElement.srcObject = null;
    }
    
    this.isRecording = false;
    this.landmarksAnteriores = [];
    this.mediaPipeReady = false;
    this.animationFrame = 0;
    this.ejercicioDetectadoAhora = false;
    
    console.log('✅ Cámara detenida completamente');
  }

  private cargarResultados() {
    const guardado = localStorage.getItem('ejercicios_orofaciales_resultados');
    if (guardado) {
      this.resultados = JSON.parse(guardado);
    }
  }

  private guardarResultados() {
    localStorage.setItem('ejercicios_orofaciales_resultados', JSON.stringify(this.resultados));
  }
}