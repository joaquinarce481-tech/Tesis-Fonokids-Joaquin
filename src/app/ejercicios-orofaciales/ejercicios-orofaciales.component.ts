import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HistorialActividadesService } from '../presentation/services/historial-actividades.service';
import * as faceapi from 'face-api.js';

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
  detectionType: 'smile' | 'kiss' | 'tongue' | 'openMouth' | 'wink' | 'cheeks' | 'surprise' | 'chew' | 'vibrateLips' | 'blow' | 'tongueLateral' | 'jawLateral' | 'yawn' | 'holdPen' | 'airKisses' | 'tongueCircular' | 'tongueVibrate';
}

interface ResultadoEjercicio {
  ejercicioId: number;
  puntuacion: number;
  completado: boolean;
  tiempoRealizado: number;
  errores: number;
  repeticionesHoy: number;
  fechaUltimaRepeticion: string;
  repeticionesRequeridas: number;
}

interface MouthPosition {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  upperLipY: number;
  lowerLipY: number;
  leftCornerX: number;
  rightCornerX: number;
  innerHeight: number;
  timestamp: number;
  jawCenterX: number;
  jawCenterY: number;
  mouthRatio: number;
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

  private stream: MediaStream | null = null;
  private detectionInterval: any = null;
  modelsLoaded = false;

  private readonly COLOR_JAW = '#00BCD4';
  private readonly COLOR_EYEBROW = '#E91E63';
  private readonly COLOR_NOSE = '#4CAF50';
  private readonly COLOR_EYE = '#E91E63';
  private readonly COLOR_MOUTH = '#00BCD4';

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router,
    private historialService: HistorialActividadesService
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
  
  private contadorFramesCorrectos = 0;
  private contadorFramesTotales = 0;
  private ejercicioIniciado = false;
  private ultimoTiempoFeedback = 0;
  private feedbackTimeout: any = null;
  private intervalTimer: any = null;

  // ✅ NUEVA BANDERA: Para evitar que el modal se muestre si se salió manualmente
  private salidaManual = false;

  private lastScores: number[] = [];
  private maxScoreHistory = 5;

  private baselineMouthRatio = 0;
  private baselineFaceRatio = 0;
  private baselineMidRatio = 0;
  private baselineBlowRatio = 0;
  private baselineMouthSize = 0;
  private baselineEyeRatio = 0;
  private baselineMouthWidth = 0;
  private baselineMouthHeight = 0;
  private baselineInnerMouthHeight = 0;
  private baselineUpperLipY = 0;
  private baselineLowerLipY = 0;
  private baselineMouthCenterX = 0;
  private baselineMouthCenterY = 0;
  private baselineNoseY = 0;
  private baselineJawCenterX = 0;
  private calibrationFrames = 0;
  isCalibrated = false;
  private readonly CALIBRATION_FRAMES_NEEDED = 15;

  private mouthPositionHistory: MouthPosition[] = [];
  private readonly POSITION_HISTORY_SIZE = 20;

  exerciseStartTime = 0;
  requiredDuration = 8000;
  isCompletingExercise = false;

  resultados: {[key: number]: ResultadoEjercicio} = {};

  seccionActiva: Seccion | null = null;
  vistaActual: 'secciones' | 'ejercicios' | 'activo' | 'resultados' = 'secciones';

  mostrarLandmarks = false;

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
    // LINGUALES
    {
      id: 5,
      nombre: 'Lengua Arriba',
      descripcion: 'Saca la lengua hacia arriba',
      instrucciones: 'Abre la boca ampliamente y saca la lengua hacia arriba, intentando tocar tu nariz. Mantén la posición.',
      duracion: 20,
      icono: '👅',
      imagen: 'assets/images/LenguaArriba.png',
      color: '#FF1493',
      seccionId: 'linguales',
      detectionType: 'tongue'
    },
    {
      id: 11,
      nombre: 'Lengua Circular',
      descripcion: 'Haz movimientos circulares con la lengua',
      instrucciones: 'Abre la boca y mueve la lengua en círculos amplios, pasando por todos los labios.',
      duracion: 20,
      icono: '🔄',
      imagen: 'assets/images/LenguaCircular.png',
      color: '#FF1493',
      seccionId: 'linguales',
      detectionType: 'tongueCircular'
    },
    {
      id: 12,
      nombre: 'Lengua Lateral',
      descripcion: 'Mueve la lengua de lado a lado',
      instrucciones: 'Saca la lengua y muévela de izquierda a derecha, tocando las comisuras de tus labios alternadamente.',
      duracion: 20,
      icono: '↔️',
      imagen: 'assets/images/LenguaLateral.png',
      color: '#FF1493',
      seccionId: 'linguales',
      detectionType: 'tongueLateral'
    },
    {
      id: 13,
      nombre: 'Vibración Lingual',
      descripcion: 'Haz vibrar la lengua como una "RR"',
      instrucciones: 'Con la boca ligeramente abierta, vibra la lengua contra el paladar produciendo "RRRR".',
      duracion: 20,
      icono: '🎵',
      imagen:'assets/images/LenguaRR.png',
      color: '#FF1493',
      seccionId: 'linguales',
      detectionType: 'tongueVibrate'
    },
    // LABIALES
    {
      id: 1,
      nombre: 'Sonrisa Grande',
      descripcion: 'Haz la sonrisa más grande que puedas',
      instrucciones: 'Sonríe lo más amplio posible, estirando las comisuras hacia arriba.',
      duracion: 20,
      icono: '😄',
      imagen: 'assets/images/SonrisaGrande.png',
      color: '#FFD700',
      seccionId: 'labiales',
      detectionType: 'smile'
    },
    {
      id: 2,
      nombre: 'Beso de Pez',
      descripcion: 'Haz como un pez con los labios',
      instrucciones: 'Junta y empuja los labios hacia adelante formando un círculo.',
      duracion: 20,
      icono: '🐠',
      imagen: 'assets/images/BesoPez.png',
      color: '#FFD700',
      seccionId: 'labiales',
      detectionType: 'kiss'
    },
    {
      id: 9,
      nombre: 'Vibrar Labios',
      descripcion: 'Haz vibrar los labios como un caballo',
      instrucciones: 'Haz vibrar los labios produciendo el sonido "brrr".',
      duracion: 20,
      icono: '🐴',
      imagen: 'assets/images/VibrarLabiosVerdadero.png',
      color: '#FFD700',
      seccionId: 'labiales',
      detectionType: 'vibrateLips'
    },
    {
      id: 14,
      nombre: 'Sostener Lápiz',
      descripcion: 'Sostén un lápiz imaginario con los labios',
      instrucciones: 'Aprieta los labios como si sostuvieras un lápiz entre ellos.',
      duracion: 20,
      icono: '✏️',
      imagen: 'assets/images/LabiosLapiz.png',
      color: '#FFD700',
      seccionId: 'labiales',
      detectionType: 'holdPen'
    },
    {
      id: 15,
      nombre: 'Besitos al Aire',
      descripcion: 'Haz besitos repetidos al aire',
      instrucciones: 'Realiza besitos repetidos y exagerados al aire.',
      duracion: 20,
      icono: '💋',
      imagen: 'assets/images/BesosAire.png',
      color: '#FFD700',
      seccionId: 'labiales',
      detectionType: 'airKisses'
    },
    {
      id: 6,
      nombre: 'Mejillas de Globo',
      descripcion: 'Infla las mejillas como un globo',
      instrucciones: 'Llena de aire las mejillas y mantenlas infladas.',
      duracion: 20,
      icono: '🎈',
      imagen: 'assets/images/MejillaDeGlobo.png',
      color: '#FFD700',
      seccionId: 'labiales',
      detectionType: 'cheeks'
    },
    // MANDIBULARES
    {
      id: 3,
      nombre: 'Abrir la Boca',
      descripcion: 'Abre la boca lo más que puedas',
      instrucciones: 'Abre la boca lo más grande posible, como diciendo "AAAA".',
      duracion: 20,
      icono: '😮',
      imagen: 'assets/images/AbrirBoca.png',
      color: '#32CD32',
      seccionId: 'mandibulares',
      detectionType: 'openMouth'
    },
    {
      id: 8,
      nombre: 'Masticar Chicle',
      descripcion: 'Simula masticar chicle',
      instrucciones: 'Mueve la mandíbula como si estuvieras masticando chicle.',
      duracion: 20,
      icono: '🍬',
      imagen: 'assets/images/ChicleNiño.png',
      color: '#32CD32',
      seccionId: 'mandibulares',
      detectionType: 'chew'
    },
    {
      id: 16,
      nombre: 'Mandíbula Lateral',
      descripcion: 'Mueve la mandíbula hacia los lados',
      instrucciones: 'Desplaza la mandíbula de izquierda a derecha alternadamente.',
      duracion: 20,
      icono: '↔️',
      imagen: 'assets/images/MandiLateral.png',
      color: '#32CD32',
      seccionId: 'mandibulares',
      detectionType: 'jawLateral'
    },
    {
      id: 17,
      nombre: 'Bostezo Grande',
      descripcion: 'Simula un bostezo exagerado',
      instrucciones: 'Realiza un bostezo amplio y exagerado.',
      duracion: 20,
      icono: '🥱',
      imagen: 'assets/images/Bostezo.png',
      color: '#32CD32',
      seccionId: 'mandibulares',
      detectionType: 'yawn'
    },
    {
      id: 4,
      nombre: 'Guiño Alternado',
      descripcion: 'Guiña un ojo, luego el otro',
      instrucciones: 'Guiña alternadamente un ojo y luego el otro.',
      duracion: 20,
      icono: '😉',
      imagen: 'assets/images/Guiño.png',
      color: '#32CD32',
      seccionId: 'mandibulares',
      detectionType: 'wink'
    },
    {
      id: 7,
      nombre: 'Cara de Sorpresa',
      descripcion: 'Pon cara de mucha sorpresa',
      instrucciones: 'Abre grande los ojos y la boca expresando sorpresa.',
      duracion: 20,
      icono: '😲',
      imagen: 'assets/images/CaraSorpresa.png',
      color: '#32CD32',
      seccionId: 'mandibulares',
      detectionType: 'surprise'
    },
    {
      id: 10,
      nombre: 'Inflar Globo',
      descripcion: 'Sopla como si inflaras un globo',
      instrucciones: 'Sopla con fuerza como si inflaras un globo.',
      duracion: 20,
      icono: '🎈',
      imagen: 'assets/images/InflarGlobo.png',
      color: '#32CD32',
      seccionId: 'mandibulares',
      detectionType: 'blow'
    }
  ];

  get Math() {
    return Math;
  }

  async ngOnInit() {
    window.scrollTo(0, 0);
    this.cargarResultados();
    this.organizarEjerciciosPorSeccion();
    await this.loadFaceApiModels();
  }

  ngAfterViewInit() {
    console.log('ViewChild elementos disponibles');
  }

  ngOnDestroy() {
    this.limpiarTodosLosTimers();
    this.stopCamera();
  }

  // ✅ NUEVO MÉTODO: Limpia TODOS los timers e intervalos
  private limpiarTodosLosTimers(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
  }

  private clearDetectionInterval(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  async loadFaceApiModels(): Promise<void> {
    try {
      console.log('Cargando modelos de IA...');
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      
      this.modelsLoaded = true;
      console.log('Modelos cargados correctamente');
    } catch (error) {
      console.error('Error cargando modelos:', error);
      this.modelsLoaded = false;
    }
  }

  volverAlDashboard(): void {
    this.limpiarTodosLosTimers();
    this.stopCamera();
    this.router.navigate(['/dashboard']);
  }

  private organizarEjerciciosPorSeccion(): void {
    this.secciones.forEach(seccion => {
      seccion.ejercicios = this.ejercicios.filter(ej => ej.seccionId === seccion.id);
    });
  }

  seleccionarSeccion(seccion: Seccion): void {
    this.seccionActiva = seccion;
    this.vistaActual = 'ejercicios';
    setTimeout(() => window.scrollTo(0, 0), 100);
  }

  volverASecciones(): void {
    this.limpiarTodosLosTimers();
    this.stopCamera();
    this.cerrarModal();
    this.seccionActiva = null;
    this.vistaActual = 'secciones';
    setTimeout(() => window.scrollTo(0, 0), 100);
  }

  cerrarModal(): void {
    this.mostrarResultados = false;
    this.vistaActual = this.seccionActiva ? 'ejercicios' : 'secciones';
  }

  ajustarBrillo(color: string, porcentaje: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const ajustar = (valor: number): number => Math.max(0, Math.min(255, Math.round(valor + (valor * porcentaje / 100))));
    const toHex = (n: number): string => n.toString(16).padStart(2, '0');
    
    return `#${toHex(ajustar(r))}${toHex(ajustar(g))}${toHex(ajustar(b))}`;
  }

  getEjerciciosPorSeccion(seccionId: string): Ejercicio[] {
    return this.ejercicios.filter(ej => ej.seccionId === seccionId);
  }

  private obtenerFechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  private esFechaHoy(fecha: string): boolean {
    return fecha === this.obtenerFechaHoy();
  }

  getRepeticionesHoy(ejercicioId: number): number {
    const resultado = this.resultados[ejercicioId];
    if (!resultado) return 0;
    return this.esFechaHoy(resultado.fechaUltimaRepeticion) ? resultado.repeticionesHoy : 0;
  }

  isEjercicioCompletadoHoy(ejercicioId: number): boolean {
    return this.getRepeticionesHoy(ejercicioId) >= 3;
  }

  toggleLandmarks(): void {
    this.mostrarLandmarks = !this.mostrarLandmarks;
    if (!this.mostrarLandmarks && this.canvasElement) {
      const canvas = this.canvasElement.nativeElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  private resetCalibration(): void {
    this.baselineMouthRatio = 0;
    this.baselineFaceRatio = 0;
    this.baselineMidRatio = 0;
    this.baselineBlowRatio = 0;
    this.baselineMouthSize = 0;
    this.baselineEyeRatio = 0;
    this.baselineMouthWidth = 0;
    this.baselineMouthHeight = 0;
    this.baselineInnerMouthHeight = 0;
    this.baselineUpperLipY = 0;
    this.baselineLowerLipY = 0;
    this.baselineMouthCenterX = 0;
    this.baselineMouthCenterY = 0;
    this.baselineNoseY = 0;
    this.baselineJawCenterX = 0;
    this.calibrationFrames = 0;
    this.isCalibrated = false;
    this.mouthPositionHistory = [];
  }

  // ✅ MÉTODO: Reset completo del estado
  private resetEstadoEjercicio(): void {
    this.tiempoRestante = 0;
    this.puntuacionActual = 0;
    this.progresoEjercicio = 0;
    this.mensajeFeedback = '';
    this.feedbackTipo = '';
    this.contadorFramesCorrectos = 0;
    this.contadorFramesTotales = 0;
    this.ejercicioIniciado = false;
    this.ultimoTiempoFeedback = 0;
    this.lastScores = [];
    this.isCompletingExercise = false;
    this.mostrarLandmarks = false;
    this.mostrarResultados = false;
    this.salidaManual = false;
    this.mouthPositionHistory = [];
    this.resetCalibration();
  }

  // ✅ MÉTODO CORREGIDO: Iniciar ejercicio con limpieza previa
  iniciarEjercicio(ejercicio: Ejercicio): void {
    // PRIMERO: Limpiar cualquier estado anterior
    this.limpiarTodosLosTimers();
    this.stopCamera();
    
    // Reset completo
    this.resetEstadoEjercicio();
    
    // Configurar nuevo ejercicio
    this.ejercicioActivo = ejercicio;
    this.vistaActual = 'activo';
    this.salidaManual = false;
    
    this.cdr.detectChanges();
    setTimeout(() => this.startCamera(), 500);
  }

  private async startCamera(): Promise<void> {
    try {
      if (this.isRecording) {
        this.stopCamera();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      this.isRecording = true;
      this.cdr.detectChanges();
      
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.ngZone.run(() => {
            if (!this.videoElement || !this.videoElement.nativeElement) {
              return;
            }
            
            const video = this.videoElement.nativeElement;
            video.srcObject = this.stream;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            
            video.onloadedmetadata = async () => {
              try {
                await video.play();
                this.cdr.detectChanges();
                this.ngZone.runOutsideAngular(() => {
                  setTimeout(() => this.ngZone.run(() => this.startDetection()), 100);
                });
              } catch (e) {
                video.play().catch(() => {});
                this.startDetection();
              }
            };
          });
        }, 50);
      });
    } catch (error) {
      this.isRecording = false;
      this.cdr.detectChanges();
      alert('No se pudo acceder a la cámara.');
    }
  }

  startDetection(): void {
    // ✅ Verificar que el ejercicio sigue activo antes de iniciar
    if (!this.ejercicioActivo || this.salidaManual) {
      return;
    }
    
    if (!this.modelsLoaded) {
      this.startSimpleTimer();
      return;
    }
    
    this.ejercicioIniciado = true;
    this.exerciseStartTime = Date.now();
    this.lastScores = [];
    this.isCompletingExercise = false;
    this.mouthPositionHistory = [];
    this.iniciarContadorEjercicio();
    
    this.ngZone.runOutsideAngular(() => {
      this.detectionInterval = setInterval(() => {
        // ✅ Verificar que el ejercicio sigue activo
        if (this.isCompletingExercise || !this.ejercicioIniciado || this.salidaManual || !this.ejercicioActivo) {
          return;
        }
        
        this.detectPraxia().then(() => {
          this.ngZone.run(() => {
            if (!this.isCalibrated) {
              this.puntuacionActual = 0;
              this.cdr.detectChanges();
              return;
            }
            
            if (this.puntuacionActual > 60) {
              this.contadorFramesCorrectos++;
              this.mostrarFeedback('Correcto - Mantén el movimiento', 'success');
            } else {
              this.mostrarFeedback('Realiza el movimiento indicado', 'warning');
            }
            
            this.contadorFramesTotales++;
            this.cdr.detectChanges();
          });
        });
      }, 50);
    });
  }

  async detectPraxia(): Promise<void> {
    if (!this.videoElement || !this.ejercicioActivo || this.isCompletingExercise || this.salidaManual) {
      return;
    }

    const video = this.videoElement.nativeElement;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    
    try {
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks(true)
        .withFaceExpressions();

      if (detections) {
        if (!this.isCalibrated) {
          this.calibrateFace(detections);
          return;
        }
        
        this.updateMouthPositionHistory(detections.landmarks);
        
        const rawScore = this.analyzePraxiaType(detections);
        this.puntuacionActual = this.smoothScore(rawScore);
        
        if (this.mostrarLandmarks) {
          this.drawLandmarksMirrored(detections);
        }
      } else {
        this.puntuacionActual = Math.max(0, this.puntuacionActual - 10);
        this.lastScores = [];
      }
    } catch (error) {
      this.puntuacionActual = 0;
    }
  }

  private updateMouthPositionHistory(landmarks: any): void {
    const mouth = landmarks.getMouth();
    const jawOutline = landmarks.getJawOutline();
    
    const leftCorner = mouth[0];
    const rightCorner = mouth[6];
    const topLip = mouth[3];
    const bottomLip = mouth[9];
    const innerTop = mouth[13];
    const innerBottom = mouth[19];
    
    const jawCenter = jawOutline[8];
    
    const mouthWidth = Math.abs(rightCorner.x - leftCorner.x);
    const mouthHeight = Math.abs(bottomLip.y - topLip.y);
    
    const position: MouthPosition = {
      centerX: (leftCorner.x + rightCorner.x) / 2,
      centerY: (topLip.y + bottomLip.y) / 2,
      width: mouthWidth,
      height: mouthHeight,
      upperLipY: topLip.y,
      lowerLipY: bottomLip.y,
      leftCornerX: leftCorner.x,
      rightCornerX: rightCorner.x,
      innerHeight: Math.abs(innerBottom.y - innerTop.y),
      timestamp: Date.now(),
      jawCenterX: jawCenter.x,
      jawCenterY: jawCenter.y,
      mouthRatio: mouthHeight / mouthWidth
    };
    
    this.mouthPositionHistory.push(position);
    
    if (this.mouthPositionHistory.length > this.POSITION_HISTORY_SIZE) {
      this.mouthPositionHistory.shift();
    }
  }

  private calibrateFace(detections: any): void {
    const landmarks = detections.landmarks;
    
    const mouth = landmarks.getMouth();
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const mouthRatio = mouthHeight / mouthWidth;
    const mouthCenterX = (mouth[0].x + mouth[6].x) / 2;
    const mouthCenterY = (mouth[3].y + mouth[9].y) / 2;
    const innerMouthHeight = Math.abs(mouth[19].y - mouth[13].y);
    
    const nose = landmarks.getNose();
    const noseY = nose[6].y;
    
    const jawOutline = landmarks.getJawOutline();
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    const faceHeight = Math.abs(jawOutline[0].y - jawOutline[8].y);
    const faceRatio = faceWidth / faceHeight;
    const jawCenterX = jawOutline[8].x;
    
    const midWidth = Math.abs(jawOutline[5].x - jawOutline[11].x);
    const midRatio = midWidth / faceHeight;
    const mouthSizeRatio = mouthWidth / faceWidth;
    
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const avgEyeHeight = (Math.abs(leftEye[1].y - leftEye[5].y) + Math.abs(rightEye[1].y - rightEye[5].y)) / 2;
    const eyeRatio = avgEyeHeight / faceHeight;
    
    this.calibrationFrames++;
    
    if (this.calibrationFrames === 1) {
      this.baselineMouthRatio = mouthRatio;
      this.baselineFaceRatio = faceRatio;
      this.baselineMidRatio = midRatio;
      this.baselineBlowRatio = mouthRatio;
      this.baselineMouthSize = mouthSizeRatio;
      this.baselineEyeRatio = eyeRatio;
      this.baselineMouthWidth = mouthWidth;
      this.baselineMouthHeight = mouthHeight;
      this.baselineInnerMouthHeight = innerMouthHeight;
      this.baselineUpperLipY = mouth[3].y;
      this.baselineLowerLipY = mouth[9].y;
      this.baselineMouthCenterX = mouthCenterX;
      this.baselineMouthCenterY = mouthCenterY;
      this.baselineNoseY = noseY;
      this.baselineJawCenterX = jawCenterX;
    } else {
      const alpha = 0.3;
      this.baselineMouthRatio = this.baselineMouthRatio * (1 - alpha) + mouthRatio * alpha;
      this.baselineFaceRatio = this.baselineFaceRatio * (1 - alpha) + faceRatio * alpha;
      this.baselineMidRatio = this.baselineMidRatio * (1 - alpha) + midRatio * alpha;
      this.baselineBlowRatio = this.baselineBlowRatio * (1 - alpha) + mouthRatio * alpha;
      this.baselineMouthSize = this.baselineMouthSize * (1 - alpha) + mouthSizeRatio * alpha;
      this.baselineEyeRatio = this.baselineEyeRatio * (1 - alpha) + eyeRatio * alpha;
      this.baselineMouthWidth = this.baselineMouthWidth * (1 - alpha) + mouthWidth * alpha;
      this.baselineMouthHeight = this.baselineMouthHeight * (1 - alpha) + mouthHeight * alpha;
      this.baselineInnerMouthHeight = this.baselineInnerMouthHeight * (1 - alpha) + innerMouthHeight * alpha;
      this.baselineUpperLipY = this.baselineUpperLipY * (1 - alpha) + mouth[3].y * alpha;
      this.baselineLowerLipY = this.baselineLowerLipY * (1 - alpha) + mouth[9].y * alpha;
      this.baselineMouthCenterX = this.baselineMouthCenterX * (1 - alpha) + mouthCenterX * alpha;
      this.baselineMouthCenterY = this.baselineMouthCenterY * (1 - alpha) + mouthCenterY * alpha;
      this.baselineNoseY = this.baselineNoseY * (1 - alpha) + noseY * alpha;
      this.baselineJawCenterX = this.baselineJawCenterX * (1 - alpha) + jawCenterX * alpha;
    }
    
    if (this.calibrationFrames >= this.CALIBRATION_FRAMES_NEEDED) {
      this.isCalibrated = true;
      console.log('Calibración completa');
    }
  }

  smoothScore(newScore: number): number {
    this.lastScores.push(newScore);
    if (this.lastScores.length > this.maxScoreHistory) {
      this.lastScores.shift();
    }
    return this.lastScores.reduce((sum, score) => sum + score, 0) / this.lastScores.length;
  }

  analyzePraxiaType(detections: any): number {
    if (!this.ejercicioActivo) return 0;
    const expressions = detections.expressions;
    const landmarks = detections.landmarks;

    switch (this.ejercicioActivo.detectionType) {
      case 'smile': return this.detectSmile(expressions);
      case 'kiss': return this.detectKiss(landmarks);
      case 'tongue': return this.detectTongueUp(landmarks);
      case 'openMouth': return this.detectOpenMouth(landmarks);
      case 'wink': return this.detectWink(landmarks);
      case 'cheeks': return this.detectCheeks(landmarks);
      case 'surprise': return this.detectSurprise(landmarks, expressions);
      case 'chew': return this.detectChew(landmarks);
      case 'vibrateLips': return this.detectVibrateLips(landmarks);
      case 'blow': return this.detectBlow(landmarks);
      case 'tongueLateral': return this.detectTongueLateral(landmarks);
      case 'jawLateral': return this.detectJawLateral(landmarks);
      case 'yawn': return this.detectYawn(landmarks);
      case 'holdPen': return this.detectHoldPen(landmarks);
      case 'airKisses': return this.detectAirKisses(landmarks);
      case 'tongueCircular': return this.detectTongueCircular(landmarks);
      case 'tongueVibrate': return this.detectTongueVibrate(landmarks);
      default: return 0;
    }
  }

  // ============================================
  // DETECCIONES LINGUALES
  // ============================================

  private detectTongueUp(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const outerHeight = Math.abs(mouth[9].y - mouth[3].y);
    const mouthWidth = Math.abs(mouth[6].x - mouth[0].x);
    const aspectRatio = outerHeight / mouthWidth;
    if (aspectRatio < 0.40) return 0;
    return 85;
  }

  private detectTongueCircular(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const outerHeight = Math.abs(mouth[9].y - mouth[3].y);
    const mouthWidth = Math.abs(mouth[6].x - mouth[0].x);
    const aspectRatio = outerHeight / mouthWidth;
    if (aspectRatio < 0.50) return 0;
    if (this.mouthPositionHistory.length < 6) return 0;
    
    let score = 0;
    if (aspectRatio >= 0.50) score += 20;
    if (aspectRatio >= 0.65) score += 10;
    
    const recentHistory = this.mouthPositionHistory.slice(-12);
    let totalMovementX = 0;
    let totalMovementY = 0;
    let directionChangesX = 0;
    let directionChangesY = 0;
    let lastDeltaX = 0;
    let lastDeltaY = 0;
    let aspectRatioChanges = 0;
    let lastAspectDelta = 0;
    
    for (let i = 1; i < recentHistory.length; i++) {
      const prev = recentHistory[i - 1];
      const curr = recentHistory[i];
      const deltaX = curr.centerX - prev.centerX;
      const deltaY = curr.centerY - prev.centerY;
      const aspectDelta = (curr.height / curr.width) - (prev.height / prev.width);
      
      totalMovementX += Math.abs(deltaX);
      totalMovementY += Math.abs(deltaY);
      
      if (Math.abs(deltaX) > 0.3 && Math.abs(lastDeltaX) > 0.3) {
        if (Math.sign(deltaX) !== Math.sign(lastDeltaX)) directionChangesX++;
      }
      if (Math.abs(deltaY) > 0.3 && Math.abs(lastDeltaY) > 0.3) {
        if (Math.sign(deltaY) !== Math.sign(lastDeltaY)) directionChangesY++;
      }
      if (Math.abs(aspectDelta) > 0.02 && Math.abs(lastAspectDelta) > 0.02) {
        if (Math.sign(aspectDelta) !== Math.sign(lastAspectDelta)) aspectRatioChanges++;
      }
      
      lastDeltaX = deltaX;
      lastDeltaY = deltaY;
      lastAspectDelta = aspectDelta;
    }
    
    const totalMovement = totalMovementX + totalMovementY;
    const totalDirectionChanges = directionChangesX + directionChangesY + aspectRatioChanges;
    
    if (totalMovement < 3 && totalDirectionChanges < 1) return 0;
    
    if (totalMovement > 3) score += 25;
    if (totalMovement > 8) score += 15;
    if (totalMovement > 15) score += 10;
    
    if (totalMovementX > 1 && totalMovementY > 1) {
      const balance = Math.min(totalMovementX, totalMovementY) / Math.max(totalMovementX, totalMovementY);
      if (balance > 0.2) score += 15;
      if (balance > 0.4) score += 10;
    }
    
    if (totalDirectionChanges >= 1) score += 15;
    if (totalDirectionChanges >= 3) score += 10;
    
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  private detectTongueLateral(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const outerHeight = Math.abs(mouth[9].y - mouth[3].y);
    const mouthWidth = Math.abs(mouth[6].x - mouth[0].x);
    const aspectRatio = outerHeight / mouthWidth;
    
    if (aspectRatio < 0.45) return 0;
    if (this.mouthPositionHistory.length < 5) return 0;
    
    let score = 0;
    if (aspectRatio >= 0.45) score += 20;
    if (aspectRatio >= 0.60) score += 10;
    
    const recentHistory = this.mouthPositionHistory.slice(-12);
    let totalLateralMovement = 0;
    let maxLeftPosition = recentHistory[0].centerX;
    let maxRightPosition = recentHistory[0].centerX;
    let directionChanges = 0;
    let lastDelta = 0;
    
    for (let i = 1; i < recentHistory.length; i++) {
      const prev = recentHistory[i - 1];
      const curr = recentHistory[i];
      const deltaX = curr.centerX - prev.centerX;
      totalLateralMovement += Math.abs(deltaX);
      
      if (curr.centerX < maxLeftPosition) maxLeftPosition = curr.centerX;
      if (curr.centerX > maxRightPosition) maxRightPosition = curr.centerX;
      
      if (Math.abs(lastDelta) > 0.2 && Math.abs(deltaX) > 0.2) {
        if (Math.sign(deltaX) !== Math.sign(lastDelta)) directionChanges++;
      }
      if (Math.abs(deltaX) > 0.2) lastDelta = deltaX;
    }
    
    const movementRange = maxRightPosition - maxLeftPosition;
    if (totalLateralMovement < 2 && movementRange < 1) return 0;
    
    const leftCorner = mouth[0];
    const rightCorner = mouth[6];
    const upperLipCenter = mouth[3];
    const leftDist = Math.abs(leftCorner.x - upperLipCenter.x);
    const rightDist = Math.abs(rightCorner.x - upperLipCenter.x);
    const asymmetryRatio = Math.abs(leftDist - rightDist) / Math.max(leftDist, rightDist);
    
    if (asymmetryRatio > 0.03) score += 15;
    if (asymmetryRatio > 0.08) score += 10;
    if (totalLateralMovement > 2) score += 20;
    if (totalLateralMovement > 6) score += 15;
    if (totalLateralMovement > 12) score += 10;
    if (movementRange > 1.5) score += 10;
    if (movementRange > 4) score += 5;
    if (directionChanges >= 1) score += 15;
    if (directionChanges >= 2) score += 5;
    
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  private detectTongueVibrate(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const innerHeight = Math.abs(mouth[19].y - mouth[13].y);
    const outerHeight = Math.abs(mouth[9].y - mouth[3].y);
    const mouthWidth = Math.abs(mouth[6].x - mouth[0].x);
    const aspectRatio = outerHeight / mouthWidth;
    const innerToOuterRatio = innerHeight / outerHeight;
    
    if (aspectRatio < 0.40) return 0;
    
    let score = 0;
    if (aspectRatio >= 0.40) score += 35;
    if (aspectRatio >= 0.55) score += 15;
    if (aspectRatio >= 0.70) score += 10;
    if (innerToOuterRatio < 0.80) score += 20;
    if (innerToOuterRatio < 0.65) score += 15;
    if (innerToOuterRatio < 0.50) score += 10;
    
    const baselineInnerToOuter = this.baselineInnerMouthHeight / this.baselineMouthHeight;
    const ratioChange = baselineInnerToOuter - innerToOuterRatio;
    if (ratioChange > 0.05) score += 10;
    
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  // ============================================
  // DETECCIONES LABIALES
  // ============================================

  private detectSmile(expressions: any): number {
    const happyScore = expressions.happy * 100;
    return happyScore > 40 ? Math.min(Math.max(happyScore, 70), 100) : 0;
  }

  private detectKiss(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const jawOutline = landmarks.getJawOutline();
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    const mouthRatio = mouthHeight / mouthWidth;
    const mouthSizeRatio = mouthWidth / faceWidth;
    
    let score = 0;
    if (mouthRatio > 0.35) {
      score += 35;
      if (mouthRatio > 0.50) score += 20;
      if (mouthRatio > 0.65) score += 10;
    }
    if (mouthSizeRatio < 0.32) {
      score += 30;
      if (mouthSizeRatio < 0.28) score += 15;
      if (mouthSizeRatio < 0.24) score += 10;
    }
    const ratioChange = mouthRatio - this.baselineMouthRatio;
    const sizeChange = this.baselineMouthSize - mouthSizeRatio;
    if (ratioChange > 0.05) score += 10;
    if (sizeChange > 0.03) score += 10;
    
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  private detectOpenMouth(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthRatio = mouthHeight / mouthWidth;
    
    if (mouthRatio >= 0.35) {
      const score = 70 + Math.min((mouthRatio - 0.35) * 100, 30);
      return Math.round(score);
    }
    return 0;
  }

  private detectWink(landmarks: any): number {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const leftEyeHeight1 = Math.abs(leftEye[1].y - leftEye[5].y);
    const leftEyeHeight2 = Math.abs(leftEye[2].y - leftEye[4].y);
    const rightEyeHeight1 = Math.abs(rightEye[1].y - rightEye[5].y);
    const rightEyeHeight2 = Math.abs(rightEye[2].y - rightEye[4].y);
    
    const leftMin = Math.min(leftEyeHeight1, leftEyeHeight2);
    const rightMin = Math.min(rightEyeHeight1, rightEyeHeight2);
    const leftAvg = (leftEyeHeight1 + leftEyeHeight2) / 2;
    const rightAvg = (rightEyeHeight1 + rightEyeHeight2) / 2;
    
    const leftWidth = Math.abs(leftEye[3].x - leftEye[0].x);
    const rightWidth = Math.abs(rightEye[3].x - rightEye[0].x);
    const leftAspect = leftAvg / leftWidth;
    const rightAspect = rightAvg / rightWidth;
    
    let score = 0;
    
    const avgDiff = Math.abs(leftAvg - rightAvg);
    if (avgDiff > 0.3) score += 25;
    if (avgDiff > 0.6) score += 20;
    if (avgDiff > 1.0) score += 15;
    if (avgDiff > 1.5) score += 10;
    
    const maxAvg = Math.max(leftAvg, rightAvg);
    const minAvg = Math.min(leftAvg, rightAvg);
    if (maxAvg > 0) {
      const heightRatio = minAvg / maxAvg;
      if (heightRatio < 0.95) score += 25;
      if (heightRatio < 0.90) score += 20;
      if (heightRatio < 0.85) score += 15;
      if (heightRatio < 0.75) score += 10;
    }
    
    const aspectDiff = Math.abs(leftAspect - rightAspect);
    if (aspectDiff > 0.01) score += 20;
    if (aspectDiff > 0.02) score += 15;
    if (aspectDiff > 0.04) score += 10;
    
    const minDiff = Math.abs(leftMin - rightMin);
    if (minDiff > 0.2) score += 15;
    if (minDiff > 0.5) score += 10;
    
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  private detectCheeks(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const mouthRatio = mouthHeight / mouthWidth;
    if (mouthRatio >= 0.60) return 0;
    return 85;
  }

  private detectSurprise(landmarks: any, expressions: any): number {
    const surprisedScore = expressions.surprised * 100;
    if (surprisedScore > 30) {
      return Math.min(Math.max(surprisedScore, 70), 100);
    }
    
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const mouth = landmarks.getMouth();
    const jawOutline = landmarks.getJawOutline();
    const faceHeight = Math.abs(jawOutline[0].y - jawOutline[8].y);
    
    const avgEyeRatio = ((Math.abs(leftEye[1].y - leftEye[5].y) + Math.abs(rightEye[1].y - rightEye[5].y)) / 2) / faceHeight;
    const mouthRatioChange = (Math.abs(mouth[3].y - mouth[9].y) / Math.abs(mouth[0].x - mouth[6].x)) - this.baselineMouthRatio;
    
    return (avgEyeRatio > this.baselineEyeRatio * 1.2 && mouthRatioChange > 0.15) ? 80 : 0;
  }

  private detectVibrateLips(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const jawOutline = landmarks.getJawOutline();
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    const mouthRatio = mouthHeight / mouthWidth;
    const mouthSizeRatio = mouthWidth / faceWidth;
    
    let score = 0;
    if (mouthRatio < 0.40) {
      score += 45;
      if (mouthRatio < 0.30) score += 15;
      if (mouthRatio < 0.20) score += 10;
    }
    if (mouthSizeRatio < 0.45) {
      score += 30;
      if (mouthSizeRatio < 0.38) score += 10;
    }
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  private detectBlow(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const jawOutline = landmarks.getJawOutline();
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    const mouthRatio = mouthHeight / mouthWidth;
    const mouthSizeRatio = mouthWidth / faceWidth;
    
    let score = 0;
    if (mouthRatio > 0.35) {
      score += 35;
      if (mouthRatio > 0.50) score += 20;
      if (mouthRatio > 0.70) score += 10;
    }
    if (mouthSizeRatio < 0.34) {
      score += 30;
      if (mouthSizeRatio < 0.28) score += 15;
    }
    const ratioChange = mouthRatio - this.baselineMouthRatio;
    const sizeChange = this.baselineMouthSize - mouthSizeRatio;
    if (ratioChange > 0.05) score += 10;
    if (sizeChange > 0.02) score += 10;
    
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  private detectHoldPen(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const jawOutline = landmarks.getJawOutline();
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    const mouthRatio = mouthHeight / mouthWidth;
    const mouthSizeRatio = mouthWidth / faceWidth;
    
    let score = 0;
    if (mouthRatio < 0.30) {
      score += 50;
      if (mouthRatio < 0.20) score += 20;
      if (mouthRatio < 0.15) score += 10;
    } else {
      return 0;
    }
    if (mouthSizeRatio < 0.45) score += 25;
    
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  private detectAirKisses(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const jawOutline = landmarks.getJawOutline();
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    const mouthRatio = mouthHeight / mouthWidth;
    const mouthSizeRatio = mouthWidth / faceWidth;
    
    let score = 0;
    if (mouthRatio > 0.20) {
      score += 40;
      if (mouthRatio > 0.35) score += 20;
      if (mouthRatio > 0.50) score += 10;
    }
    if (mouthSizeRatio < 0.42) {
      score += 30;
      if (mouthSizeRatio < 0.35) score += 10;
    }
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  // ============================================
  // DETECCIONES MANDIBULARES
  // ============================================

  private detectChew(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const currentRatio = mouthHeight / mouthWidth;
    
    if (this.mouthPositionHistory.length < 8) return 0;
    
    let score = 0;
    const recentHistory = this.mouthPositionHistory.slice(-15);
    
    let openCloseCount = 0;
    let lastState: 'open' | 'closed' | 'neutral' = 'neutral';
    let totalVerticalMovement = 0;
    let maxRatio = recentHistory[0].mouthRatio;
    let minRatio = recentHistory[0].mouthRatio;
    
    for (let i = 1; i < recentHistory.length; i++) {
      const prev = recentHistory[i - 1];
      const curr = recentHistory[i];
      const deltaY = Math.abs(curr.height - prev.height);
      totalVerticalMovement += deltaY;
      
      if (curr.mouthRatio > maxRatio) maxRatio = curr.mouthRatio;
      if (curr.mouthRatio < minRatio) minRatio = curr.mouthRatio;
      
      const ratioChange = curr.mouthRatio - this.baselineMouthRatio;
      let currentState: 'open' | 'closed' | 'neutral' = 'neutral';
      if (ratioChange > 0.08) currentState = 'open';
      else if (ratioChange < -0.02) currentState = 'closed';
      
      if (currentState !== 'neutral' && lastState !== 'neutral' && currentState !== lastState) {
        openCloseCount++;
      }
      if (currentState !== 'neutral') lastState = currentState;
    }
    
    const ratioRange = maxRatio - minRatio;
    if (totalVerticalMovement < 3 && openCloseCount < 1) return 0;
    
    if (openCloseCount >= 1) score += 30;
    if (openCloseCount >= 2) score += 20;
    if (openCloseCount >= 3) score += 10;
    if (totalVerticalMovement > 3) score += 20;
    if (totalVerticalMovement > 8) score += 15;
    if (totalVerticalMovement > 15) score += 10;
    if (ratioRange > 0.05) score += 15;
    if (ratioRange > 0.12) score += 10;
    if (ratioRange > 0.20) score += 5;
    
    const currentRatioChange = Math.abs(currentRatio - this.baselineMouthRatio);
    if (currentRatioChange < 0.25) score += 10;
    
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  private detectJawLateral(landmarks: any): number {
    const jawOutline = landmarks.getJawOutline();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();
    
    const jawCenter = jawOutline[8];
    const noseCenter = nose[3];
    const jawNoseOffset = jawCenter.x - noseCenter.x;
    
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const mouthRatio = mouthHeight / mouthWidth;
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    const mouthSizeRatio = mouthWidth / faceWidth;
    
    if (mouthRatio > 0.40 && mouthSizeRatio < 0.32) return 0;
    if (this.mouthPositionHistory.length < 10) return 0;
    
    const firstFrames = this.mouthPositionHistory.slice(0, 5);
    let baselineOffset = 0;
    for (const frame of firstFrames) {
      baselineOffset += frame.jawCenterX - frame.centerX;
    }
    baselineOffset /= firstFrames.length;
    
    const recentHistory = this.mouthPositionHistory.slice(-15);
    let maxLeftDeviation = 0;
    let maxRightDeviation = 0;
    let significantMovements = 0;
    let directionChanges = 0;
    let lastDeviation = 0;
    
    for (let i = 0; i < recentHistory.length; i++) {
      const frame = recentHistory[i];
      const currentOffset = frame.jawCenterX - frame.centerX;
      const deviation = currentOffset - baselineOffset;
      
      if (deviation < maxLeftDeviation) maxLeftDeviation = deviation;
      if (deviation > maxRightDeviation) maxRightDeviation = deviation;
      if (Math.abs(deviation) > 2) significantMovements++;
      
      if (i > 0) {
        if (Math.abs(lastDeviation) > 1 && Math.abs(deviation) > 1) {
          if (Math.sign(deviation) !== Math.sign(lastDeviation)) directionChanges++;
        }
      }
      lastDeviation = deviation;
    }
    
    const totalRange = maxRightDeviation - maxLeftDeviation;
    if (totalRange < 3 && significantMovements < 3) return 0;
    
    let score = 0;
    if (totalRange > 3) score += 25;
    if (totalRange > 6) score += 20;
    if (totalRange > 10) score += 15;
    if (significantMovements >= 3) score += 20;
    if (significantMovements >= 6) score += 15;
    if (significantMovements >= 10) score += 10;
    if (directionChanges >= 1) score += 20;
    if (directionChanges >= 2) score += 10;
    
    const currentDeviation = Math.abs(jawNoseOffset);
    if (currentDeviation > 3) score += 10;
    
    return score >= 70 ? Math.min(score, 100) : 0;
  }

  private detectYawn(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthRatio = mouthHeight / mouthWidth;
    
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const leftEyeHeight = Math.abs(leftEye[1].y - leftEye[5].y);
    const rightEyeHeight = Math.abs(rightEye[1].y - rightEye[5].y);
    const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;
    
    if (mouthRatio < 0.40) return 0;
    
    let score = 70;
    if (mouthRatio > 0.50) score += 10;
    if (mouthRatio > 0.60) score += 10;
    if (mouthRatio > 0.70) score += 5;
    if (avgEyeHeight < 8) score += 10;
    if (avgEyeHeight < 5) score += 5;
    
    return Math.min(score, 100);
  }

  // ============================================
  // FUNCIONES DE CONTROL
  // ============================================

  startSimpleTimer(): void {
    if (this.salidaManual || !this.ejercicioActivo) {
      return;
    }
    
    this.ejercicioIniciado = true;
    this.exerciseStartTime = Date.now();
    this.isCalibrated = true;
    this.iniciarContadorEjercicio();
    
    this.ngZone.runOutsideAngular(() => {
      this.detectionInterval = setInterval(() => {
        if (this.salidaManual || !this.ejercicioActivo) {
          this.clearDetectionInterval();
          return;
        }
        
        this.ngZone.run(() => {
          this.puntuacionActual = 50 + Math.random() * 30;
          this.contadorFramesTotales++;
          this.contadorFramesCorrectos++;
          this.cdr.detectChanges();
        });
      }, 100);
    });
  }

  drawLandmarksMirrored(detections: any): void {
    if (!this.canvasElement || !this.videoElement) {
      return;
    }

    const canvas = this.canvasElement.nativeElement;
    const video = this.videoElement.nativeElement;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const detection = detections.detection;
    const landmarks = detections.landmarks;
    
    const mirrorX = (x: number): number => videoWidth - x;
    
    if (detection) {
      const box = detection.box;
      const mirroredX = mirrorX(box.x + box.width);
      
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 3;
      ctx.strokeRect(mirroredX, box.y, box.width, box.height);
      
      const score = (detection.score * 100).toFixed(1);
      ctx.fillStyle = '#2196F3';
      ctx.fillRect(mirroredX, box.y - 28, 55, 28);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(score, mirroredX + 27, box.y - 8);
    }
    
    if (landmarks) {
      const positions = landmarks.positions;
      
      positions.forEach((point: any, index: number) => {
        let color = this.COLOR_JAW;
        
        if (index <= 16) {
          color = this.COLOR_JAW;
        } else if (index <= 26) {
          color = this.COLOR_EYEBROW;
        } else if (index <= 35) {
          color = this.COLOR_NOSE;
        } else if (index <= 47) {
          color = this.COLOR_EYE;
        } else {
          color = this.COLOR_MOUTH;
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(mirrorX(point.x), point.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      
      // Mandíbula
      ctx.strokeStyle = this.COLOR_JAW;
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const p = positions[i];
        if (i === 0) ctx.moveTo(mirrorX(p.x), p.y);
        else ctx.lineTo(mirrorX(p.x), p.y);
      }
      ctx.stroke();
      
      // Cejas
      ctx.strokeStyle = this.COLOR_EYEBROW;
      ctx.beginPath();
      for (let i = 17; i <= 21; i++) {
        const p = positions[i];
        if (i === 17) ctx.moveTo(mirrorX(p.x), p.y);
        else ctx.lineTo(mirrorX(p.x), p.y);
      }
      ctx.stroke();
      
      ctx.beginPath();
      for (let i = 22; i <= 26; i++) {
        const p = positions[i];
        if (i === 22) ctx.moveTo(mirrorX(p.x), p.y);
        else ctx.lineTo(mirrorX(p.x), p.y);
      }
      ctx.stroke();
      
      // Nariz
      ctx.strokeStyle = this.COLOR_NOSE;
      ctx.beginPath();
      for (let i = 27; i <= 30; i++) {
        const p = positions[i];
        if (i === 27) ctx.moveTo(mirrorX(p.x), p.y);
        else ctx.lineTo(mirrorX(p.x), p.y);
      }
      ctx.stroke();
      
      ctx.beginPath();
      for (let i = 31; i <= 35; i++) {
        const p = positions[i];
        if (i === 31) ctx.moveTo(mirrorX(p.x), p.y);
        else ctx.lineTo(mirrorX(p.x), p.y);
      }
      ctx.stroke();
      
      // Ojos
      ctx.strokeStyle = this.COLOR_EYE;
      ctx.beginPath();
      for (let i = 36; i <= 41; i++) {
        const p = positions[i];
        if (i === 36) ctx.moveTo(mirrorX(p.x), p.y);
        else ctx.lineTo(mirrorX(p.x), p.y);
      }
      ctx.closePath();
      ctx.stroke();
      
      ctx.beginPath();
      for (let i = 42; i <= 47; i++) {
        const p = positions[i];
        if (i === 42) ctx.moveTo(mirrorX(p.x), p.y);
        else ctx.lineTo(mirrorX(p.x), p.y);
      }
      ctx.closePath();
      ctx.stroke();
      
      // Boca
      ctx.strokeStyle = this.COLOR_MOUTH;
      ctx.beginPath();
      for (let i = 48; i <= 59; i++) {
        const p = positions[i];
        if (i === 48) ctx.moveTo(mirrorX(p.x), p.y);
        else ctx.lineTo(mirrorX(p.x), p.y);
      }
      ctx.closePath();
      ctx.stroke();
      
      ctx.beginPath();
      for (let i = 60; i <= 67; i++) {
        const p = positions[i];
        if (i === 60) ctx.moveTo(mirrorX(p.x), p.y);
        else ctx.lineTo(mirrorX(p.x), p.y);
      }
      ctx.closePath();
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
  }

  // ✅ MÉTODO CORREGIDO: Contador con verificación de salida manual
  private iniciarContadorEjercicio(): void {
    if (!this.ejercicioActivo || this.salidaManual) {
      return;
    }
    
    this.tiempoRestante = this.ejercicioActivo.duracion;
    this.progresoEjercicio = 0;
    
    this.intervalTimer = setInterval(() => {
      // ✅ Verificar en cada tick si debemos continuar
      if (this.salidaManual || !this.ejercicioActivo) {
        if (this.intervalTimer) {
          clearInterval(this.intervalTimer);
          this.intervalTimer = null;
        }
        return;
      }
      
      this.tiempoRestante--;
      this.progresoEjercicio = ((this.ejercicioActivo!.duracion - this.tiempoRestante) / this.ejercicioActivo!.duracion) * 100;
      
      if (this.tiempoRestante <= 0) {
        this.finalizarEjercicio();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  // ✅ MÉTODO CORREGIDO: No mostrar resultados si salió manualmente
  private finalizarEjercicio(): void {
    // VERIFICACIÓN CRÍTICA: No finalizar si se salió manualmente
    if (this.salidaManual) {
      console.log('Finalización cancelada - salida manual detectada');
      return;
    }
    
    // Limpiar timers PRIMERO
    this.limpiarTodosLosTimers();
    
    this.ejercicioIniciado = false;
    this.isCompletingExercise = true;
    
    if (this.ejercicioActivo) {
      const puntuacionCalculada = this.contadorFramesTotales > 0 
        ? Math.round((this.contadorFramesCorrectos / this.contadorFramesTotales) * 100) 
        : 0;
      
      this.puntuacionActual = puntuacionCalculada;
      
      const ejercicioId = this.ejercicioActivo.id;
      const resultadoAnterior = this.resultados[ejercicioId];
      const fechaHoy = this.obtenerFechaHoy();
      
      let repeticionesHoy = 1;
      if (resultadoAnterior && this.esFechaHoy(resultadoAnterior.fechaUltimaRepeticion)) {
        repeticionesHoy = resultadoAnterior.repeticionesHoy + 1;
      }
      
      const resultado: ResultadoEjercicio = {
        ejercicioId,
        puntuacion: puntuacionCalculada,
        completado: repeticionesHoy >= 3,
        tiempoRealizado: this.ejercicioActivo.duracion,
        errores: this.contadorFramesTotales - this.contadorFramesCorrectos,
        repeticionesHoy,
        fechaUltimaRepeticion: fechaHoy,
        repeticionesRequeridas: 3
      };
      
      this.resultados[ejercicioId] = resultado;
      this.ultimoResultado = resultado;
      this.guardarResultados();
      
      this.historialService.registrarEjercicio(this.ejercicioActivo.nombre).subscribe({
        next: () => {},
        error: () => {}
      });
    }
    
    this.stopCamera();
    
    // Verificar una vez más antes de mostrar resultados
    if (!this.salidaManual) {
      setTimeout(() => {
        if (!this.salidaManual) {
          this.mostrarResultados = true;
          this.vistaActual = 'resultados';
          this.cdr.detectChanges();
        }
      }, 500);
    }
  }

  detenerEjercicio(): void {
    this.finalizarEjercicio();
  }

  reiniciarEjercicio(): void {
    if (this.ejercicioActivo) {
      this.iniciarEjercicio(this.ejercicioActivo);
    }
  }

  // ✅ MÉTODO CORREGIDO: Salir del ejercicio sin mostrar resultados
  volverAlMenu(): void {
    console.log('Volviendo al menú - marcando salida manual');
    
    // PRIMERO: Marcar salida manual para evitar que el timer muestre resultados
    this.salidaManual = true;
    this.ejercicioIniciado = false;
    this.isCompletingExercise = false;
    
    // SEGUNDO: Limpiar TODOS los timers inmediatamente
    this.limpiarTodosLosTimers();
    
    // TERCERO: Detener cámara
    this.stopCamera();
    
    // CUARTO: Reset del estado visual
    this.ejercicioActivo = null;
    this.mostrarResultados = false;
    this.vistaActual = this.seccionActiva ? 'ejercicios' : 'secciones';
    
    // Reset de variables de estado
    this.tiempoRestante = 0;
    this.puntuacionActual = 0;
    this.progresoEjercicio = 0;
    this.mensajeFeedback = '';
    this.feedbackTipo = '';
    this.contadorFramesCorrectos = 0;
    this.contadorFramesTotales = 0;
    this.lastScores = [];
    this.mouthPositionHistory = [];
    
    this.cdr.detectChanges();
    setTimeout(() => window.scrollTo(0, 0), 100);
  }

  // ✅ MÉTODO CORREGIDO: Repetir ejercicio
  repetirEjercicio(): void {
    const ejercicioARepetir = this.ejercicioActivo;
    
    if (!ejercicioARepetir) {
      this.volverAlMenu();
      return;
    }
    
    // Limpiar estado
    this.limpiarTodosLosTimers();
    this.stopCamera();
    
    this.mostrarResultados = false;
    this.salidaManual = false;
    this.resetEstadoEjercicio();
    
    this.vistaActual = 'activo';
    this.ejercicioActivo = ejercicioARepetir;
    this.cdr.detectChanges();
    
    setTimeout(() => {
      if (this.ejercicioActivo && !this.salidaManual) {
        this.startCamera();
      }
    }, 500);
  }

  private stopCamera(): void {
    this.clearDetectionInterval();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement && this.videoElement.nativeElement) {
      const video = this.videoElement.nativeElement;
      video.srcObject = null;
      video.pause();
    }
    
    if (this.canvasElement) {
      const ctx = this.canvasElement.nativeElement.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.canvasElement.nativeElement.width, this.canvasElement.nativeElement.height);
      }
    }
    
    this.isRecording = false;
    this.lastScores = [];
    this.mouthPositionHistory = [];
  }

  private mostrarFeedback(mensaje: string, tipo: 'success' | 'warning' | 'error'): void {
    const ahora = Date.now();
    if (ahora - this.ultimoTiempoFeedback < 1000) return;
    
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

  private cargarResultados(): void {
    const guardado = localStorage.getItem('ejercicios_orofaciales_resultados');
    if (guardado) {
      this.resultados = JSON.parse(guardado);
    }
  }

  private guardarResultados(): void {
    localStorage.setItem('ejercicios_orofaciales_resultados', JSON.stringify(this.resultados));
  }
}