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
      this.analizarEjercicio(landmarks);
      this.dibujarLandmarksEjercicio(landmarks);
    }

    this.canvasCtx.restore();
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
  const labioSupExt = landmarks[0];  // Punto externo labio superior
  const labioInfExt = landmarks[17]; // Punto externo labio inferior
  
  if (!labioSuperior || !labioInferior || !comisuraIzq || !comisuraDer || !labioSupExt || !labioInfExt) return false;
  
  // 1. Detectar que los labios NO estén muy abiertos
  const aperturaLabial = Math.abs(labioSuperior.y - labioInferior.y);
  const labiosCerrados = aperturaLabial < 0.022;
  
  // 2. Detectar labios FRUNCIDOS (ancho reducido significativamente)
  const anchoLabios = Math.abs(comisuraDer.x - comisuraIzq.x);
  const labiosFruncidos = anchoLabios < 0.045; // Ancho bien reducido
  
  // 3. Detectar labios PROYECTADOS (comparando punto central vs comisuras en eje Y)
  const proyeccionSuperior = Math.abs(labioSupExt.y - labioSuperior.y);
  const proyeccionInferior = Math.abs(labioInfExt.y - labioInferior.y);
  const labiosProyectados = (proyeccionSuperior + proyeccionInferior) > 0.015;
  
  // ✅ Necesita: labios cerrados + fruncidos + proyectados
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
  
  // Detectar que haya diferencia significativa entre los ojos
  const diferencia = Math.abs(aperturaIzq - aperturaDer);
  const hayGuino = diferencia > 0.006; // Más permisivo (antes 0.008)
  
  // Detectar que al menos un ojo esté cerrado o semi-cerrado
  const ojoIzqCerrado = aperturaIzq < 0.012;
  const ojoDerCerrado = aperturaDer < 0.012;
  const unOjoCerrado = ojoIzqCerrado || ojoDerCerrado;
  
  // El otro ojo debe estar abierto
  const ojoIzqAbierto = aperturaIzq > 0.015;
  const ojoDerAbierto = aperturaDer > 0.015;
  const unOjoAbierto = ojoIzqAbierto || ojoDerAbierto;
  
  // ✅ Debe haber diferencia + un ojo cerrado + el otro abierto
  return hayGuino && unOjoCerrado && unOjoAbierto;
}

  private detectarLenguaArriba(landmarks: any[]): boolean {
  const labioSuperior = landmarks[13];
  const labioInferior = landmarks[14];
  const barbilla = landmarks[18];
  const nariz = landmarks[1];
  
  if (!labioSuperior || !labioInferior || !barbilla || !nariz) return false;
  
  // Detectar apertura de boca (lengua afuera)
  const aperturaBoca = Math.abs(labioSuperior.y - labioInferior.y);
  
  // Detectar si la boca está abierta lo suficiente
  const bocaAbierta = aperturaBoca > 0.025; // Más sensible
  
  // Detectar movimiento hacia arriba (distancia entre barbilla y labio inferior aumenta)
  const distanciaLabioBarbilla = Math.abs(barbilla.y - labioInferior.y);
  const movimientoArriba = distanciaLabioBarbilla > 0.045; // Más fácil (antes era 0.06)
  
  return bocaAbierta && movimientoArriba;
}

private detectarMejillasInfladas(landmarks: any[]): boolean {
  const mejillaIzq = landmarks[116];
  const mejillaDer = landmarks[345];
  const mejillaIzqExt = landmarks[50];  // Punto más externo de mejilla izquierda
  const mejillaDerExt = landmarks[280]; // Punto más externo de mejilla derecha
  const centroCaraX = landmarks[9].x;
  const labioSuperior = landmarks[13];
  const labioInferior = landmarks[14];
  
  if (!mejillaIzq || !mejillaDer || !mejillaIzqExt || !mejillaDerExt || !labioSuperior || !labioInferior) return false;
  
  // 1. Detectar expansión SIGNIFICATIVA de mejillas
  const distanciaIzq = Math.abs(mejillaIzq.x - centroCaraX);
  const distanciaDer = Math.abs(mejillaDer.x - centroCaraX);
  const expansionTotal = distanciaIzq + distanciaDer;
  
  // Usar puntos externos también
  const distanciaIzqExt = Math.abs(mejillaIzqExt.x - centroCaraX);
  const distanciaDerExt = Math.abs(mejillaDerExt.x - centroCaraX);
  const expansionExterna = distanciaIzqExt + distanciaDerExt;
  
  // 🔥 BALANCEADO - un chiquitito más fácil
  const mejillasInfladas = expansionTotal > 0.155 && expansionExterna > 0.20; // Antes: 0.17 y 0.22
  
  // 2. Boca cerrada (un poco más permisivo)
  const aperturaBoca = Math.abs(labioSuperior.y - labioInferior.y);
  const bocaCerrada = aperturaBoca < 0.018; // Antes: 0.012 - más permisivo
  
  // 3. Ambas mejillas infladas simétricamente (más permisivo)
  const diferencia = Math.abs(distanciaIzq - distanciaDer);
  const simetrico = diferencia < 0.03; // Antes: 0.02 - más permisivo
  
  // ✅ TODAS las condiciones obligatorias
  return mejillasInfladas && bocaCerrada && simetrico;
}
  private detectarSorpresa(landmarks: any[]): boolean {
    const ojoIzqSuperior = landmarks[159];
    const ojoIzqInferior = landmarks[145];
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    
    if (!ojoIzqSuperior || !ojoIzqInferior || !labioSuperior || !labioInferior) return false;
    
    const aperturaOjos = Math.abs(ojoIzqSuperior.y - ojoIzqInferior.y);
    const aperturaBoca = Math.abs(labioSuperior.y - labioInferior.y);
    
    return aperturaOjos > 0.012 && aperturaBoca > 0.025;
  }

  private detectarMasticado(landmarks: any[]): boolean {
    if (!this.landmarksAnteriores.length) return false;
    
    const mandibula = landmarks[18];
    const mandibulaPrev = this.landmarksAnteriores[18];
    
    if (!mandibula || !mandibulaPrev) return false;
    
    const movimiento = Math.abs(mandibula.y - mandibulaPrev.y);
    return movimiento > 0.008;
  }

  private detectarVibracionLabios(landmarks: any[]): boolean {
  if (!this.landmarksAnteriores.length) return false;
  
  const labioSuperior = landmarks[13];
  const labioInferior = landmarks[14];
  const comisuraIzq = landmarks[61];
  const comisuraDer = landmarks[291];
  
  const labioSuperiorPrev = this.landmarksAnteriores[13];
  const labioInferiorPrev = this.landmarksAnteriores[14];
  const comisuraIzqPrev = this.landmarksAnteriores[61];
  const comisuraDerPrev = this.landmarksAnteriores[291];
  
  if (!labioSuperior || !labioInferior || !comisuraIzq || !comisuraDer) return false;
  if (!labioSuperiorPrev || !labioInferiorPrev || !comisuraIzqPrev || !comisuraDerPrev) return false;
  
  // Detectar vibración rápida en múltiples puntos de los labios
  const vibracionSuperior = Math.abs(labioSuperior.x - labioSuperiorPrev.x) + 
                            Math.abs(labioSuperior.y - labioSuperiorPrev.y);
  const vibracionInferior = Math.abs(labioInferior.x - labioInferiorPrev.x) + 
                            Math.abs(labioInferior.y - labioInferiorPrev.y);
  const vibracionIzq = Math.abs(comisuraIzq.x - comisuraIzqPrev.x) + 
                       Math.abs(comisuraIzq.y - comisuraIzqPrev.y);
  const vibracionDer = Math.abs(comisuraDer.x - comisuraDerPrev.x) + 
                       Math.abs(comisuraDer.y - comisuraDerPrev.y);
  
  const vibracionTotal = vibracionSuperior + vibracionInferior + vibracionIzq + vibracionDer;
  
  // Detectar que los labios estén juntos (no muy abiertos)
  const aperturaLabial = Math.abs(labioSuperior.y - labioInferior.y);
  const labiosJuntos = aperturaLabial < 0.025;
  
  // ✅ Debe haber vibración significativa Y labios relativamente juntos
  return vibracionTotal > 0.008 && labiosJuntos;
}

 private detectarInflarGlobo(landmarks: any[]): boolean {
  const labioSuperior = landmarks[13];
  const labioInferior = landmarks[14];
  const comisuraIzq = landmarks[61];
  const comisuraDer = landmarks[291];
  const labioSupExt = landmarks[0];
  const labioInfExt = landmarks[17];
  
  if (!labioSuperior || !labioInferior || !comisuraIzq || !comisuraDer || !labioSupExt || !labioInfExt) return false;
  
  // 1. Detectar labios en forma de "O" (abiertos moderadamente)
  const aperturaLabial = Math.abs(labioSuperior.y - labioInferior.y);
  const labiosEnO = aperturaLabial > 0.018 && aperturaLabial < 0.04;
  
  // 2. Detectar labios FRUNCIDOS (ancho reducido)
  const anchoLabios = Math.abs(comisuraDer.x - comisuraIzq.x);
  const labiosFruncidos = anchoLabios < 0.05;
  
  // 3. Detectar forma redondeada (distancia entre puntos externos e internos)
  const distanciaVertical = Math.abs(labioSupExt.y - labioInfExt.y);
  const formaRedondeada = distanciaVertical > 0.03;
  
  // ✅ Solo necesita 2 de las 3 condiciones
  const condicionesCumplidas = [labiosEnO, labiosFruncidos, formaRedondeada].filter(c => c).length;
  
  return condicionesCumplidas >= 2;
}
private detectarLenguaCircular(landmarks: any[]): boolean {
  if (!this.landmarksAnteriores.length) return false;
  
  const labioSuperior = landmarks[13];
  const labioInferior = landmarks[14];
  const comisuraIzq = landmarks[61];
  const comisuraDer = landmarks[291];
  
  const labioSuperiorPrev = this.landmarksAnteriores[13];
  const labioInferiorPrev = this.landmarksAnteriores[14];
  const comisuraIzqPrev = this.landmarksAnteriores[61];
  const comisuraDerPrev = this.landmarksAnteriores[291];
  
  if (!labioSuperior || !labioInferior || !comisuraIzq || !comisuraDer) return false;
  if (!labioSuperiorPrev || !labioInferiorPrev || !comisuraIzqPrev || !comisuraDerPrev) return false;
  
  // Detectar movimiento en cualquier dirección (horizontal y vertical)
  const movimientoSuperior = Math.abs(labioSuperior.x - labioSuperiorPrev.x) + 
                             Math.abs(labioSuperior.y - labioSuperiorPrev.y);
  const movimientoInferior = Math.abs(labioInferior.x - labioInferiorPrev.x) + 
                             Math.abs(labioInferior.y - labioInferiorPrev.y);
  const movimientoIzq = Math.abs(comisuraIzq.x - comisuraIzqPrev.x);
  const movimientoDer = Math.abs(comisuraDer.x - comisuraDerPrev.x);
  
  const movimientoTotal = movimientoSuperior + movimientoInferior + movimientoIzq + movimientoDer;
  
  return movimientoTotal > 0.005; // 🔥 MUCHO MÁS FÁCIL (antes era 0.01)
}

  private detectarLenguaLateral(landmarks: any[]): boolean {
  if (!this.landmarksAnteriores.length) return false;
  
  const comisuraIzq = landmarks[61];
  const comisuraDer = landmarks[291];
  const labioSuperior = landmarks[13];
  const labioInferior = landmarks[14];
  
  const comisuraIzqPrev = this.landmarksAnteriores[61];
  const comisuraDerPrev = this.landmarksAnteriores[291];
  const labioSuperiorPrev = this.landmarksAnteriores[13];
  const labioInferiorPrev = this.landmarksAnteriores[14];
  
  if (!comisuraIzq || !comisuraDer || !labioSuperior || !labioInferior) return false;
  if (!comisuraIzqPrev || !comisuraDerPrev || !labioSuperiorPrev || !labioInferiorPrev) return false;
  
  // 🔥 SOLO movimiento HORIZONTAL (eje X)
  const movimientoLateralIzq = Math.abs(comisuraIzq.x - comisuraIzqPrev.x);
  const movimientoLateralDer = Math.abs(comisuraDer.x - comisuraDerPrev.x);
  const movimientoLateralCentro = Math.abs(labioSuperior.x - labioSuperiorPrev.x) + 
                                   Math.abs(labioInferior.x - labioInferiorPrev.x);
  
  // Movimiento vertical (para detectar y rechazar)
  const movimientoVertical = Math.abs(labioSuperior.y - labioSuperiorPrev.y) + 
                             Math.abs(labioInferior.y - labioInferiorPrev.y);
  
  const movimientoHorizontalTotal = movimientoLateralIzq + movimientoLateralDer + movimientoLateralCentro;
  
  // ✅ Debe haber movimiento horizontal Y el movimiento horizontal debe ser MAYOR que el vertical
  return movimientoHorizontalTotal > 0.004 && movimientoHorizontalTotal > movimientoVertical;
}

  private detectarVibracionLingual(landmarks: any[]): boolean {
  if (!this.landmarksAnteriores.length) return false;
  
  const labioSuperior = landmarks[13];
  const labioInferior = landmarks[14];
  const comisuraIzq = landmarks[61];
  const comisuraDer = landmarks[291];
  
  const labioSuperiorPrev = this.landmarksAnteriores[13];
  const labioInferiorPrev = this.landmarksAnteriores[14];
  const comisuraIzqPrev = this.landmarksAnteriores[61];
  const comisuraDerPrev = this.landmarksAnteriores[291];
  
  if (!labioSuperior || !labioInferior || !comisuraIzq || !comisuraDer) return false;
  if (!labioSuperiorPrev || !labioInferiorPrev || !comisuraIzqPrev || !comisuraDerPrev) return false;
  
  // Detectar vibración (movimiento rápido en cualquier dirección)
  const vibracionSuperior = Math.abs(labioSuperior.x - labioSuperiorPrev.x) + 
                            Math.abs(labioSuperior.y - labioSuperiorPrev.y);
  const vibracionInferior = Math.abs(labioInferior.x - labioInferiorPrev.x) + 
                            Math.abs(labioInferior.y - labioInferiorPrev.y);
  const vibracionIzq = Math.abs(comisuraIzq.x - comisuraIzqPrev.x) + 
                       Math.abs(comisuraIzq.y - comisuraIzqPrev.y);
  const vibracionDer = Math.abs(comisuraDer.x - comisuraDerPrev.x) + 
                       Math.abs(comisuraDer.y - comisuraDerPrev.y);
  
  const vibracionTotal = vibracionSuperior + vibracionInferior + vibracionIzq + vibracionDer;
  
  // 🔥 MUCHO MÁS FÁCIL - cualquier movimiento rápido/vibración cuenta
  return vibracionTotal > 0.006; // Antes era solo 0.007 en una dirección
}
private detectarSostenerLapiz(landmarks: any[]): boolean {
  const labioSuperior = landmarks[13];
  const labioInferior = landmarks[14];
  const nariz = landmarks[1]; // Punta de la nariz
  const labioSupExt = landmarks[0]; // Borde externo labio superior
  const comisuraIzq = landmarks[61];
  const comisuraDer = landmarks[291];
  
  if (!labioSuperior || !labioInferior || !nariz || !labioSupExt || !comisuraIzq || !comisuraDer) return false;
  
  // 1. Detectar que el labio superior SUBE hacia la nariz
  const distanciaLabioNariz = Math.abs(nariz.y - labioSuperior.y);
  const labioSubido = distanciaLabioNariz < 0.045; // El labio está cerca de la nariz
  
  // 2. Detectar que el labio superior está ELEVADO (comparado con posición normal)
  const distanciaLabioSupInf = Math.abs(labioSuperior.y - labioInferior.y);
  const labioElevado = distanciaLabioSupInf > 0.02; // Hay separación (labio superior subió)
  
  // 3. Detectar labios fruncidos hacia adelante (como haciendo morritos)
  const anchoLabios = Math.abs(comisuraDer.x - comisuraIzq.x);
  const labiosFruncidos = anchoLabios < 0.05;
  
  // 4. Detectar tensión en el labio superior (está haciendo fuerza)
  const elevacionLabio = Math.abs(labioSupExt.y - labioSuperior.y);
  const hayTension = elevacionLabio > 0.015;
  
  // ✅ Necesita: labio cerca de nariz + elevado + fruncido
  return labioSubido && labioElevado && labiosFruncidos;
}
  private detectarBesitosAire(landmarks: any[]): boolean {
    if (!this.landmarksAnteriores.length) return false;
    
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const labioSuperiorPrev = this.landmarksAnteriores[13];
    const labioInferiorPrev = this.landmarksAnteriores[14];
    
    if (!labioSuperior || !labioInferior || !labioSuperiorPrev || !labioInferiorPrev) return false;
    
    const movimiento = Math.abs(labioSuperior.z - labioSuperiorPrev.z) + 
                      Math.abs(labioInferior.z - labioInferiorPrev.z);
    
    return movimiento > 0.008;
  }

  private detectarMandibularLateral(landmarks: any[]): boolean {
    if (!this.landmarksAnteriores.length) return false;
    
    const mandibula = landmarks[18];
    const mandibulaPrev = this.landmarksAnteriores[18];
    
    if (!mandibula || !mandibulaPrev) return false;
    
    const movimientoLateral = Math.abs(mandibula.x - mandibulaPrev.x);
    return movimientoLateral > 0.01;
  }

  private detectarBostezo(landmarks: any[]): boolean {
  const labioSuperior = landmarks[13];
  const labioInferior = landmarks[14];
  const ojoIzqSuperior = landmarks[159];
  const ojoIzqInferior = landmarks[145];
  
  if (!labioSuperior || !labioInferior || !ojoIzqSuperior || !ojoIzqInferior) return false;
  
  // Detectar boca BIEN abierta
  const aperturaBoca = Math.abs(labioSuperior.y - labioInferior.y);
  const bocaMuyAbierta = aperturaBoca > 0.04; // Más permisivo (antes 0.05)
  
  // Ya NO requerimos que los ojos estén cerrados
  // Un bostezo puede ser con ojos abiertos o semi-cerrados
  
  return bocaMuyAbierta; // ✅ Solo necesita boca bien abierta
}

  private dibujarLandmarksEjercicio(landmarks: any[]) {
    if (!this.ejercicioActivo) return;
    
    const canvas = this.canvasElement.nativeElement;
    const ctx = this.canvasCtx;
    
    switch (this.ejercicioActivo.id) {
      case 1:
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        break;
      case 2:
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        this.dibujarLineasLabios(landmarks, '#FFD700');
        break;
      case 3:
        this.dibujarPuntosLabios(landmarks, '#32CD32');
        this.dibujarAperturaBoca(landmarks, '#32CD32');
        break;
      case 4:
        this.dibujarPuntosOjos(landmarks, '#32CD32');
        break;
      case 5:
        this.dibujarPuntosLabios(landmarks, '#FF1493');
        break;
      case 6:
        this.dibujarPuntosMejillas(landmarks, '#FFD700');
        break;
      case 7:
        this.dibujarPuntosOjos(landmarks, '#32CD32');
        this.dibujarPuntosLabios(landmarks, '#32CD32');
        break;
      case 8:
        this.dibujarPuntosMandibula(landmarks, '#32CD32');
        break;
      case 9:
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        break;
      case 10:
  this.dibujarPuntosLabios(landmarks, '#32CD32');
  this.dibujarPuntosMandibula(landmarks, '#32CD32');
  break;
      case 11:
        this.dibujarPuntosLabios(landmarks, '#FF1493');
        break;
      case 12:
        this.dibujarPuntosLabios(landmarks, '#FF1493');
        break;
      case 13:
        this.dibujarPuntosLabios(landmarks, '#FF1493');
        break;
      case 14:
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        this.dibujarLineasLabios(landmarks, '#FFD700');
        break;
      case 15:
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        break;
      case 16:
        this.dibujarPuntosMandibula(landmarks, '#32CD32');
        break;
      case 17:
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
          6, 0, 2 * Math.PI
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
          4, 0, 2 * Math.PI
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
          3, 0, 2 * Math.PI
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
          5, 0, 2 * Math.PI
        );
        this.canvasCtx.fill();
      }
    });
  }

  private dibujarLineasLabios(landmarks: any[], color: string) {
    const conexiones = [[61, 291], [13, 14], [17, 18]];
    this.canvasCtx.strokeStyle = color;
    this.canvasCtx.lineWidth = 3;
    
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
      this.canvasCtx.lineWidth = 4;
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

  private dibujarLineasSimetria(landmarks: any[], color: string) {
    const centro = landmarks[9];
    const ojoIzq = landmarks[133];
    const ojoDer = landmarks[362];
    
    if (centro) {
      this.canvasCtx.strokeStyle = color;
      this.canvasCtx.lineWidth = 2;
      
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(
        centro.x * this.canvasElement.nativeElement.width,
        0
      );
      this.canvasCtx.lineTo(
        centro.x * this.canvasElement.nativeElement.width,
        this.canvasElement.nativeElement.height
      );
      this.canvasCtx.stroke();
      
      if (ojoIzq && ojoDer) {
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(
          ojoIzq.x * this.canvasElement.nativeElement.width,
          ojoIzq.y * this.canvasElement.nativeElement.height
        );
        this.canvasCtx.lineTo(
          ojoDer.x * this.canvasElement.nativeElement.width,
          ojoDer.y * this.canvasElement.nativeElement.height
        );
        this.canvasCtx.stroke();
      }
    }
  }

  private mostrarFeedback(mensaje: string, tipo: 'success' | 'warning' | 'error') {
    this.mensajeFeedback = mensaje;
    this.feedbackTipo = tipo;
    
    setTimeout(() => {
      this.mensajeFeedback = '';
      this.feedbackTipo = '';
    }, 1000);
  }

  iniciarEjercicio(ejercicio: Ejercicio) {
    console.log('🎯 Iniciando ejercicio:', ejercicio.nombre);
    this.ejercicioActivo = ejercicio;
    this.vistaActual = 'activo';
    this.mostrarResultados = false;
    
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.startCamera();
    }, 100);
  }

  private async startCamera() {
    try {
      console.log('🎥 Iniciando cámara...');
      
      // ✅ FORZAR REINICIO DE MEDIAPIPE si es necesario
      if (this.isRecording) {
        console.log('⚠️ Cámara ya estaba activa, reiniciando...');
        this.stopCamera();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // ✅ Limpiar estado previo
      this.landmarksAnteriores = [];
      this.contadorFramesCorrectos = 0;
      this.contadorFramesTotales = 0;
      
      // 🔥 NUEVA LÍNEA: FORZAR REINICIO DE MEDIAPIPE SIEMPRE
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

      // 🔥 SIEMPRE REINICIALIZAR MEDIAPIPE
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
      // ✅ CALCULAR PUNTUACIÓN REAL BASADA EN FRAMES CORRECTOS
      let puntuacionCalculada = 0;
      
      if (this.contadorFramesTotales > 0) {
        puntuacionCalculada = Math.round(
          (this.contadorFramesCorrectos / this.contadorFramesTotales) * 100
        );
      }
      
      // ✅ ACTUALIZAR PUNTUACIÓN ACTUAL
      this.puntuacionActual = puntuacionCalculada;
      
      // ✅ LOGGING PARA DEBUG
      console.log('📊 Frames correctos:', this.contadorFramesCorrectos);
      console.log('📊 Frames totales:', this.contadorFramesTotales);
      console.log('📊 Puntuación final:', puntuacionCalculada + '%');
      
      const resultado: ResultadoEjercicio = {
        ejercicioId: this.ejercicioActivo.id,
        puntuacion: puntuacionCalculada,
        completado: puntuacionCalculada >= 60, // ✅ Completado solo si >= 60%
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
    
    this.tiempoRestante = 0;
    this.puntuacionActual = 0;
    this.progresoEjercicio = 0;
    this.mensajeFeedback = '';
    this.feedbackTipo = '';
    this.contadorFramesCorrectos = 0;
    this.contadorFramesTotales = 0;
    this.ejercicioIniciado = false;
  }

  repetirEjercicio() {
    console.log('🔄 Repitiendo ejercicio...');
    
    // ✅ Detener cámara actual antes de reiniciar
    this.stopCamera();
    
    // ✅ Resetear todo el estado
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
    this.landmarksAnteriores = []; // ✅ IMPORTANTE: Limpiar landmarks
    
    // ✅ Cambiar vista
    this.vistaActual = 'activo';
    this.cdr.detectChanges();
    
    // ✅ Esperar un poco más antes de reiniciar
    setTimeout(() => {
      if (this.ejercicioActivo) {
        this.startCamera();
      }
    }, 800); // Aumentado de 500ms a 800ms
  }

  private stopCamera() {
    console.log('🛑 Deteniendo cámara...');
    
    // ✅ Detener cámara
    if (this.camera) {
      try {
        this.camera.stop();
      } catch (error) {
        console.warn('⚠️ Error deteniendo cámara:', error);
      }
      this.camera = null as any;
    }
    
    // 🔥 NUEVO: Cerrar MediaPipe también
    if (this.faceMesh) {
      try {
        this.faceMesh.close();
        console.log('🛑 FaceMesh cerrado');
      } catch (error) {
        console.warn('⚠️ Error cerrando FaceMesh:', error);
      }
    }
    
    // ✅ Limpiar canvas completamente
    if (this.canvasCtx && this.canvasElement?.nativeElement) {
      const canvas = this.canvasElement.nativeElement;
      this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      this.canvasCtx.fillStyle = '#000000';
      this.canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // ✅ Detener video stream
    if (this.videoElement?.nativeElement?.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track detenido:', track.kind);
      });
      this.videoElement.nativeElement.srcObject = null;
    }
    
    // ✅ Resetear estado
    this.isRecording = false;
    this.landmarksAnteriores = [];
    this.mediaPipeReady = false; // 🔥 NUEVO: Forzar reinicialización
    
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