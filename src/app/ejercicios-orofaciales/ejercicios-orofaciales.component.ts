import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

interface Ejercicio {
  id: number;
  nombre: string;
  descripcion: string;
  instrucciones: string;
  duracion: number; // segundos
  icono: string;
  color: string;
}

interface ResultadoEjercicio {
  ejercicioId: number;
  puntuacion: number; // 0-100
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

  constructor(private cdr: ChangeDetectorRef) {}

  isRecording = false;
  ejercicioActivo: Ejercicio | null = null;
  mostrarResultados = false;
  ultimoResultado: ResultadoEjercicio | null = null;

  // Estados del ejercicio
  tiempoRestante = 0;
  puntuacionActual = 0;
  progresoEjercicio = 0;
  mensajeFeedback = '';
  feedbackTipo: 'success' | 'warning' | 'error' | '' = '';
  
  // Métricas para análisis
  private landmarksAnteriores: any[] = [];
  private contadorFramesCorrectos = 0;
  private contadorFramesTotales = 0;
  private ejercicioIniciado = false;

  // Resultados guardados
  resultados: {[key: number]: ResultadoEjercicio} = {};

  ejercicios: Ejercicio[] = [
    {
      id: 1,
      nombre: 'Sonrisa Grande',
      descripcion: 'Haz la sonrisa más grande que puedas',
      instrucciones: '😄 ¡Sonríe muy grande! Estira las comisuras hacia arriba',
      duracion: 10,
      icono: '😄',
      color: '#FFD700'
    },
    {
      id: 2,
      nombre: 'Beso de Pez',
      descripcion: 'Haz como un pez con los labios',
      instrucciones: '🐠 ¡Haz un beso de pez! Junta y empuja los labios hacia adelante',
      duracion: 8,
      icono: '🐠',
      color: '#00CED1'
    },
    {
      id: 3,
      nombre: 'Abrir la Boca',
      descripcion: 'Abre la boca lo más que puedas',
      instrucciones: '😮 ¡Abre grande la boca! Como si fueras a gritar "¡AAAA!"',
      duracion: 6,
      icono: '😮',
      color: '#FF6347'
    },
    {
      id: 4,
      nombre: 'Guiño Alternado',
      descripcion: 'Guiña un ojo, luego el otro',
      instrucciones: '😉 ¡Guiña! Primero un ojo, luego el otro. ¡Alterna!',
      duracion: 12,
      icono: '😉',
      color: '#9370DB'
    },
    {
      id: 5,
      nombre: 'Lengua Arriba',
      descripcion: 'Saca la lengua hacia arriba',
      instrucciones: '👅 ¡Saca la lengua! Trata de tocar tu nariz',
      duracion: 8,
      icono: '👅',
      color: '#FF1493'
    },
    {
      id: 6,
      nombre: 'Mejillas de Globo',
      descripcion: 'Infla las mejillas como un globo',
      instrucciones: '🎈 ¡Infla las mejillas! Llena de aire como un globo',
      duracion: 10,
      icono: '🎈',
      color: '#32CD32'
    },
    {
      id: 7,
      nombre: 'Cara de Sorpresa',
      descripcion: 'Pon cara de mucha sorpresa',
      instrucciones: '😲 ¡Sorpréndete! Abre grande los ojos y la boca',
      duracion: 6,
      icono: '😲',
      color: '#FFA500'
    },
    {
      id: 8,
      nombre: 'Masticar Chicle',
      descripcion: 'Simula masticar chicle',
      instrucciones: '🍬 ¡Mastica chicle imaginario! Mueve la mandíbula',
      duracion: 15,
      icono: '🍬',
      color: '#FF69B4'
    },
    {
      id: 9,
      nombre: 'Vibrar Labios',
      descripcion: 'Haz vibrar los labios como un caballo',
      instrucciones: '🐴 ¡Como un caballo! Haz vibrar los labios "brrr"',
      duracion: 8,
      icono: '🐴',
      color: '#8B4513'
    },
    {
      id: 10,
      nombre: 'Cara Simétrica',
      descripcion: 'Mantén la cara equilibrada',
      instrucciones: '⚖️ ¡Mantén equilibrio! Cara simétrica y relajada',
      duracion: 12,
      icono: '⚖️',
      color: '#4682B4'
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
  }

  ngAfterViewInit() {
    // NO inicializar MediaPipe aquí - solo cuando se inicie un ejercicio
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

  private async initializeMediaPipe() {
    try {
      console.log('🚀 Inicializando MediaPipe para ejercicios...');
      
      // CRÍTICO: Verificar que los elementos existen
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
    
    // Dibujar imagen de video
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
      case 1: // Sonrisa Grande
        esCorrectoFrame = this.detectarSonrisa(landmarks);
        break;
      case 2: // Beso de Pez
        esCorrectoFrame = this.detectarBesoPez(landmarks);
        break;
      case 3: // Abrir la Boca
        esCorrectoFrame = this.detectarBocaAbierta(landmarks);
        break;
      case 4: // Guiño Alternado
        esCorrectoFrame = this.detectarGuino(landmarks);
        break;
      case 5: // Lengua Arriba
        esCorrectoFrame = this.detectarLenguaArriba(landmarks);
        break;
      case 6: // Mejillas de Globo
        esCorrectoFrame = this.detectarMejillasInfladas(landmarks);
        break;
      case 7: // Cara de Sorpresa
        esCorrectoFrame = this.detectarSorpresa(landmarks);
        break;
      case 8: // Masticar Chicle
        esCorrectoFrame = this.detectarMasticado(landmarks);
        break;
      case 9: // Vibrar Labios
        esCorrectoFrame = this.detectarVibracionLabios(landmarks);
        break;
      case 10: // Cara Simétrica
        esCorrectoFrame = this.detectarSimetria(landmarks);
        break;
    }

    if (esCorrectoFrame) {
      this.contadorFramesCorrectos++;
      this.mostrarFeedback('¡Muy bien!', 'success');
    } else {
      this.mostrarFeedback('¡Inténtalo de nuevo!', 'warning');
    }

    // Actualizar puntuación en tiempo real
    this.puntuacionActual = Math.round(
      (this.contadorFramesCorrectos / this.contadorFramesTotales) * 100
    );

    this.landmarksAnteriores = landmarks;
  }

  // Métodos de detección de ejercicios
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
    
    if (!labioSuperior || !labioInferior || !comisuraIzq || !comisuraDer) return false;
    
    const protrusion = (labioSuperior.z + labioInferior.z) / 2;
    const aperturaLabial = Math.abs(labioSuperior.y - labioInferior.y);
    const anchoLabios = Math.abs(comisuraDer.x - comisuraIzq.x);
    
    return protrusion > -0.02 && aperturaLabial < 0.015 && anchoLabios < 0.025;
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
    return diferencia > 0.008;
  }

  private detectarLenguaArriba(landmarks: any[]): boolean {
    const labioInferior = landmarks[14];
    const barbilla = landmarks[18];
    
    if (!labioInferior || !barbilla) return false;
    
    const distanciaLabioBarbilla = Math.abs(barbilla.y - labioInferior.y);
    return distanciaLabioBarbilla > 0.06;
  }

  private detectarMejillasInfladas(landmarks: any[]): boolean {
    const mejillaIzq = landmarks[116];
    const mejillaDer = landmarks[345];
    const centroCaraX = landmarks[9].x;
    
    if (!mejillaIzq || !mejillaDer) return false;
    
    const distanciaIzq = Math.abs(mejillaIzq.x - centroCaraX);
    const distanciaDer = Math.abs(mejillaDer.x - centroCaraX);
    
    return (distanciaIzq + distanciaDer) > 0.12;
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
    const labioSuperiorPrev = this.landmarksAnteriores[13];
    
    if (!labioSuperior || !labioSuperiorPrev) return false;
    
    const vibracion = Math.abs(labioSuperior.x - labioSuperiorPrev.x) + 
                     Math.abs(labioSuperior.y - labioSuperiorPrev.y);
    
    return vibracion > 0.005;
  }

  private detectarSimetria(landmarks: any[]): boolean {
    const ojoIzq = landmarks[133];
    const ojoDer = landmarks[362];
    const centroFacial = landmarks[9];
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    
    if (!ojoIzq || !ojoDer || !centroFacial || !comisuraIzq || !comisuraDer) return false;
    
    const distOjoIzq = Math.abs(ojoIzq.x - centroFacial.x);
    const distOjoDer = Math.abs(ojoDer.x - centroFacial.x);
    const distComIzq = Math.abs(comisuraIzq.x - centroFacial.x);
    const distComDer = Math.abs(comisuraDer.x - centroFacial.x);
    
    const simetriaOjos = 1 - Math.abs(distOjoIzq - distOjoDer) / Math.max(distOjoIzq, distOjoDer);
    const simetriaLabios = 1 - Math.abs(distComIzq - distComDer) / Math.max(distComIzq, distComDer);
    
    const simetriaTotal = (simetriaOjos + simetriaLabios) / 2;
    return simetriaTotal > 0.85;
  }

  private dibujarLandmarksEjercicio(landmarks: any[]) {
    if (!this.ejercicioActivo) return;
    
    const canvas = this.canvasElement.nativeElement;
    const ctx = this.canvasCtx;
    
    switch (this.ejercicioActivo.id) {
      case 1: // Sonrisa
        this.dibujarPuntosLabios(landmarks, '#FFD700');
        break;
      case 2: // Beso de Pez
        this.dibujarPuntosLabios(landmarks, '#00CED1');
        this.dibujarLineasLabios(landmarks, '#00CED1');
        break;
      case 3: // Boca Abierta
        this.dibujarPuntosLabios(landmarks, '#FF6347');
        this.dibujarAperturaBoca(landmarks, '#FF6347');
        break;
      case 4: // Guiño
        this.dibujarPuntosOjos(landmarks, '#9370DB');
        break;
      case 5: // Lengua Arriba
        this.dibujarPuntosLabios(landmarks, '#FF1493');
        break;
      case 6: // Mejillas Infladas
        this.dibujarPuntosMejillas(landmarks, '#32CD32');
        break;
      case 7: // Sorpresa
        this.dibujarPuntosOjos(landmarks, '#FFA500');
        this.dibujarPuntosLabios(landmarks, '#FFA500');
        break;
      case 8: // Masticar
        this.dibujarPuntosMandibula(landmarks, '#FF69B4');
        break;
      case 9: // Vibrar Labios
        this.dibujarPuntosLabios(landmarks, '#8B4513');
        break;
      case 10: // Simetría
        this.dibujarLineasSimetria(landmarks, '#4682B4');
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
      
      // Línea central
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
      
      // Líneas de simetría
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

  // Métodos públicos para interacción
  iniciarEjercicio(ejercicio: Ejercicio) {
    console.log('🎯 Iniciando ejercicio:', ejercicio.nombre);
    this.ejercicioActivo = ejercicio;
    this.mostrarResultados = false;
    
    // Forzar detección de cambios para asegurar que el DOM esté actualizado
    this.cdr.detectChanges();
    
    // Esperar un frame adicional para asegurar que los elementos estén en el DOM
    setTimeout(() => {
      this.startCamera();
    }, 100);
  }

  private async startCamera() {
    try {
      console.log('🎥 Iniciando cámara...');
      
      // Esperar hasta que los elementos estén disponibles
      let intentos = 0;
      while ((!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) && intentos < 10) {
        console.log(`⏳ Esperando elementos DOM (intento ${intentos + 1}/10)...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        intentos++;
      }
      
      // CRÍTICO: Verificar elementos después de espera
      if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
        console.error('❌ Elementos de video/canvas no disponibles después de espera');
        console.log('Video element:', this.videoElement?.nativeElement);
        console.log('Canvas element:', this.canvasElement?.nativeElement);
        return;
      }

      console.log('✅ Elementos DOM disponibles');

      // Inicializar MediaPipe ANTES de la cámara
      if (!this.mediaPipeReady) {
        console.log('📋 Inicializando MediaPipe primero...');
        await this.initializeMediaPipe();
        
        if (!this.mediaPipeReady) {
          console.error('❌ MediaPipe no se pudo inicializar');
          return;
        }
        
        // Esperar un poco más para asegurar inicialización
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
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
      const resultado: ResultadoEjercicio = {
        ejercicioId: this.ejercicioActivo.id,
        puntuacion: this.puntuacionActual,
        completado: this.puntuacionActual >= 60,
        tiempoRealizado: this.ejercicioActivo.duracion,
        errores: this.contadorFramesTotales - this.contadorFramesCorrectos
      };
      
      this.resultados[this.ejercicioActivo.id] = resultado;
      this.ultimoResultado = resultado;
      this.guardarResultados();
      
      console.log('📊 Resultado final:', resultado);
    }
    
    // Detener cámara DESPUÉS de guardar resultado
    this.stopCamera();
    
    // Mostrar resultados con un pequeño delay
    setTimeout(() => {
      this.mostrarResultados = true;
      this.cdr.detectChanges(); // Forzar detección de cambios
      console.log('🎉 Mostrando pantalla de resultados');
      console.log('Estado actual:', {
        ejercicioActivo: !!this.ejercicioActivo,
        mostrarResultados: this.mostrarResultados,
        isRecording: this.isRecording,
        ultimoResultado: this.ultimoResultado
      });
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
    console.log('🏠 Volviendo al menú principal...');
    this.ejercicioActivo = null;
    this.mostrarResultados = false;
    this.stopCamera();
    
    // Limpiar estados
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
    this.mostrarResultados = false;
    if (this.ejercicioActivo) {
      // Limpiar estados antes de reiniciar
      this.tiempoRestante = 0;
      this.puntuacionActual = 0;
      this.progresoEjercicio = 0;
      this.mensajeFeedback = '';
      this.feedbackTipo = '';
      this.contadorFramesCorrectos = 0;
      this.contadorFramesTotales = 0;
      this.ejercicioIniciado = false;
      
      // Esperar un poco antes de reiniciar
      setTimeout(() => {
        this.iniciarEjercicio(this.ejercicioActivo!);
      }, 500);
    }
  }

  private stopCamera() {
    console.log('🛑 Deteniendo cámara...');
    
    if (this.camera) {
      this.camera.stop();
      this.camera = null as any; // Limpiar referencia
    }
    
    // Limpiar el canvas
    if (this.canvasCtx && this.canvasElement?.nativeElement) {
      const canvas = this.canvasElement.nativeElement;
      this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      this.canvasCtx.fillStyle = '#000000';
      this.canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    this.isRecording = false;
    console.log('✅ Cámara detenida');
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