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
    this.seccionActiva = null;
    this.vistaActual = 'secciones';
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

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.3
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

  private onResults(results: any) {
    if (!this.canvasCtx || !this.ejercicioActivo) return;

    const canvas = this.canvasElement.nativeElement;
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    this.canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // ✅ Dibujar solo puntos específicos del ejercicio
      this.dibujarLandmarksEjercicio(landmarks);
      
      this.analizarEjercicio(landmarks);
    }

    this.canvasCtx.restore();
  }

  // ✅ Dibujar puntos específicos según el ejercicio activo
  private dibujarLandmarksEjercicio(landmarks: any[]) {
    if (!this.ejercicioActivo) return;
    
    const canvas = this.canvasElement.nativeElement;
    const ctx = this.canvasCtx;
    
    switch (this.ejercicioActivo.id) {
      case 1: // Sonrisa Grande
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        break;
      case 2: // Beso de Pez
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        this.dibujarLineasLabios(landmarks, '#FFD700');
        break;
      case 3: // Abrir la Boca
        this.dibujarPuntosLabios(landmarks, '#32CD32');
        this.dibujarAperturaBoca(landmarks, '#32CD32');
        break;
      case 4: // Guiño Alternado
        this.dibujarPuntosOjos(landmarks, '#32CD32');
        break;
      case 5: // Lengua Arriba
        this.dibujarPuntosLabios(landmarks, '#FF1493');
        break;
      case 6: // Mejillas de Globo
        this.dibujarPuntosMejillas(landmarks, '#FFD700');
        break;
      case 7: // Cara de Sorpresa
        this.dibujarPuntosOjos(landmarks, '#32CD32');
        this.dibujarPuntosLabios(landmarks, '#32CD32');
        break;
      case 8: // Masticar Chicle
        this.dibujarPuntosMandibula(landmarks, '#32CD32');
        break;
      case 9: // Vibrar Labios
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        break;
      case 10: // Inflar Globo
        this.dibujarPuntosLabios(landmarks, '#32CD32');
        this.dibujarPuntosMandibula(landmarks, '#32CD32');
        break;
      case 11: // Lengua Circular
        this.dibujarPuntosLabios(landmarks, '#FF1493');
        break;
      case 12: // Lengua Lateral
        this.dibujarPuntosLabios(landmarks, '#FF1493');
        break;
      case 13: // Vibración Lingual
        this.dibujarPuntosLabios(landmarks, '#FF1493');
        break;
      case 14: // Sostener Lápiz
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        this.dibujarLineasLabios(landmarks, '#FFD700');
        break;
      case 15: // Besitos al Aire
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        break;
      case 16: // Mandíbula Lateral
        this.dibujarPuntosMandibula(landmarks, '#32CD32');
        break;
      case 17: // Bostezo Grande
        this.dibujarPuntosLabios(landmarks, '#32CD32');
        this.dibujarAperturaBoca(landmarks, '#32CD32');
        break;
    }
  }

  private dibujarPuntosLabios(landmarks: any[], color: string) {
    const puntosLabios = [61, 291, 13, 14, 17, 18, 200, 199, 175, 0];
    this.canvasCtx.fillStyle = color;
    
    puntosLabios.forEach(index => {
      if (landmarks[index]) {
        const punto = landmarks[index];
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(
          punto.x * this.canvasElement.nativeElement.width,
          punto.y * this.canvasElement.nativeElement.height,
          2, 0, 2 * Math.PI
        );
        this.canvasCtx.fill();
      }
    });
  }

  private dibujarPuntosOjos(landmarks: any[], color: string) {
    const puntosOjos = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
                       362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
    this.canvasCtx.fillStyle = color;
    
    puntosOjos.forEach(index => {
      if (landmarks[index]) {
        const punto = landmarks[index];
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(
          punto.x * this.canvasElement.nativeElement.width,
          punto.y * this.canvasElement.nativeElement.height,
          2, 0, 2 * Math.PI
        );
        this.canvasCtx.fill();
      }
    });
  }

  private dibujarPuntosMejillas(landmarks: any[], color: string) {
    const puntosMejillas = [116, 117, 118, 119, 120, 121, 126, 142, 36, 205, 206, 207, 213, 192, 147, 
                           345, 346, 347, 348, 349, 350, 451, 452, 453, 464, 435, 410, 454];
    this.canvasCtx.fillStyle = color;
    
    puntosMejillas.forEach(index => {
      if (landmarks[index]) {
        const punto = landmarks[index];
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(
          punto.x * this.canvasElement.nativeElement.width,
          punto.y * this.canvasElement.nativeElement.height,
          2, 0, 2 * Math.PI
        );
        this.canvasCtx.fill();
      }
    });
  }

  private dibujarPuntosMandibula(landmarks: any[], color: string) {
    const puntosMandibula = [18, 175, 199, 200, 9, 10, 151, 152, 148, 176, 149, 150];
    this.canvasCtx.fillStyle = color;
    
    puntosMandibula.forEach(index => {
      if (landmarks[index]) {
        const punto = landmarks[index];
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(
          punto.x * this.canvasElement.nativeElement.width,
          punto.y * this.canvasElement.nativeElement.height,
          2, 0, 2 * Math.PI
        );
        this.canvasCtx.fill();
      }
    });
  }

  private dibujarLineasLabios(landmarks: any[], color: string) {
    const conexiones = [[61, 291], [13, 14], [17, 18]];
    this.canvasCtx.strokeStyle = color;
    this.canvasCtx.lineWidth = 1;
    
    conexiones.forEach(conexion => {
      const inicio = landmarks[conexion[0]];
      const fin = landmarks[conexion[1]];
      
      if (inicio && fin) {
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(
          inicio.x * this.canvasElement.nativeElement.width,
          inicio.y * this.canvasElement.nativeElement.height
        );
        this.canvasCtx.lineTo(
          fin.x * this.canvasElement.nativeElement.width,
          fin.y * this.canvasElement.nativeElement.height
        );
        this.canvasCtx.stroke();
      }
    });
  }

  private dibujarAperturaBoca(landmarks: any[], color: string) {
    const labioSup = landmarks[13];
    const labioInf = landmarks[14];
    
    if (labioSup && labioInf) {
      this.canvasCtx.strokeStyle = color;
      this.canvasCtx.lineWidth = 2;
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(
        labioSup.x * this.canvasElement.nativeElement.width,
        labioSup.y * this.canvasElement.nativeElement.height
      );
      this.canvasCtx.lineTo(
        labioInf.x * this.canvasElement.nativeElement.width,
        labioInf.y * this.canvasElement.nativeElement.height
      );
      this.canvasCtx.stroke();
    }
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
    
    // Solo actualizar el feedback cada 1 segundo (1000ms)
    if (ahora - this.ultimoTiempoFeedback < 1000) {
      return;
    }
    
    this.ultimoTiempoFeedback = ahora;
    this.mensajeFeedback = mensaje;
    this.feedbackTipo = tipo;
    
    // Limpiar timeout anterior si existe
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    
    // Mantener el mensaje visible por 3 segundos
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
      
      const resultado: ResultadoEjercicio = {
        ejercicioId: this.ejercicioActivo.id,
        puntuacion: puntuacionCalculada,
        completado: puntuacionCalculada >= 60,
        tiempoRealizado: this.ejercicioActivo.duracion,
        errores: this.contadorFramesTotales - this.contadorFramesCorrectos
      };
      
      this.resultados[this.ejercicioActivo.id] = resultado;
      this.ultimoResultado = resultado;
      this.guardarResultados();
      
      console.log('📊 Resultado final:', resultado);
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
    this.mostrarResultados = false;
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