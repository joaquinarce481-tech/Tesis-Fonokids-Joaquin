import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { HistorialActividadesService } from '../../services/historial-actividades.service';

// Interfaces
interface MovimientoLingual {
  id: number;
  nombre: string;
  emoji: string;
  descripcion: string;
  instruccion: string;
  posicionCorrecta: number;
  colocado: boolean;
  arrastrando: boolean;
  foto?: string | null;
}

interface SecuenciaNivel {
  nivel: number;
  nombre: string;
  descripcion: string;
  dificultad: 'fácil' | 'media' | 'difícil';
  movimientos: number[];
  tiempoLimite: number;
}

interface EstadisticasJuego {
  secuenciasCorrectas: number;
  intentosTotales: number;
  tiempoTotal: number;
}

type FaseJuego = 'instrucciones' | 'captura' | 'jugando' | 'verificando' | 'completado';

@Component({
  selector: 'app-puzzle-movimientos-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './puzzle-movimientos-game.component.html',
  styleUrls: ['./puzzle-movimientos-game.component.scss']
})
export class PuzzleMovimientosGameComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Estado del juego
  faseJuego: FaseJuego = 'instrucciones';
  nivelActual: number = 1;
  maxNiveles: number = 6;
  intentos: number = 0;
  
  // Estado de captura de fotos
  movimientoActualCaptura: number = 0;
  movimientoDetectado: boolean = false;
  mensajeValidacion: string = '';
  fotosCapturadas: string[] = [];
  
  // MediaPipe
  faceMesh: FaceMesh | null = null;
  camera: Camera | null = null;
  
  // Temporizador
  tiempoInicio: number = 0;
  intervalTemporizador: any;
  
  // Movimientos disponibles (se actualizarán con fotos)
  todosLosMovimientos: MovimientoLingual[] = [
    {
      id: 1,
      nombre: 'Sacar Lengua',
      emoji: '👅',
      descripcion: 'Sacar la lengua hacia afuera',
      instruccion: 'Saca tu lengua lo más que puedas hacia afuera',
      posicionCorrecta: 0,
      colocado: false,
      arrastrando: false,
      foto: null
    },
    {
      id: 2,
      nombre: 'Tocar Nariz',
      emoji: '👃🏼',
      descripcion: 'Tocar la nariz con la lengua',
      instruccion: 'Toca tu nariz con la lengua hacia arriba',
      posicionCorrecta: 1,
      colocado: false,
      arrastrando: false,
      foto: null
    },
    {
      id: 3,
      nombre: 'Sonrisa Amplia',
      emoji: '😁',
      descripcion: 'Hacer una sonrisa amplia mostrando dientes',
      instruccion: 'Sonríe mostrando todos tus dientes',
      posicionCorrecta: 2,
      colocado: false,
      arrastrando: false,
      foto: null
    },
    {
      id: 4,
      nombre: 'Hacer Beso',
      emoji: '😘',
      descripcion: 'Juntar los labios como para dar un beso',
      instruccion: 'Junta tus labios como si fueras a dar un beso',
      posicionCorrecta: 3,
      colocado: false,
      arrastrando: false,
      foto: null
    },
    {
      id: 5,
      nombre: 'Tocar Mentón',
      emoji: '⬇️',
      descripcion: 'Bajar la lengua hacia el mentón',
      instruccion: 'Baja tu lengua hacia tu mentón lo más que puedas',
      posicionCorrecta: 4,
      colocado: false,
      arrastrando: false,
      foto: null
    },
    {
      id: 6,
      nombre: 'Lengua Arriba',
      emoji: '⬆️',
      descripcion: 'Subir la lengua al paladar',
      instruccion: 'Sube tu lengua y toca el paladar (techo de tu boca)',
      posicionCorrecta: 5,
      colocado: false,
      arrastrando: false,
      foto: null
    },
    {
      id: 7,
      nombre: 'Boca Abierta',
      emoji: '😮',
      descripcion: 'Abrir la boca grande con lengua visible',
      instruccion: 'Abre tu boca lo más grande posible',
      posicionCorrecta: 6,
      colocado: false,
      arrastrando: false,
      foto: null
    },
    {
      id: 8,
      nombre: 'Boca Cerrada',
      emoji: '😐',
      descripcion: 'Cerrar la boca completamente',
      instruccion: 'Cierra tu boca completamente con labios juntos',
      posicionCorrecta: 7,
      colocado: false,
      arrastrando: false,
      foto: null
    }
  ];

  // Secuencias de niveles
  secuencias: SecuenciaNivel[] = [
    {
      nivel: 1,
      nombre: 'Apertura Bucal',
      descripcion: 'Práctica de apertura y cierre',
      dificultad: 'fácil',
      movimientos: [8, 7],
      tiempoLimite: 90
    },
    {
      nivel: 2,
      nombre: 'Sonrisa Terapéutica',
      descripcion: 'De reposo a sonrisa',
      dificultad: 'fácil',
      movimientos: [8, 3],
      tiempoLimite: 90
    },
    {
      nivel: 3,
      nombre: 'Protrusión Labial',
      descripcion: 'Movimiento de beso',
      dificultad: 'fácil',
      movimientos: [8, 4],
      tiempoLimite: 90
    },
    {
      nivel: 4,
      nombre: 'Extensión Lingual Vertical',
      descripcion: 'Lengua hacia abajo',
      dificultad: 'media',
      movimientos: [8, 1, 5],
      tiempoLimite: 100
    },
    {
      nivel: 5,
      nombre: 'Extensión Lingual Superior',
      descripcion: 'Lengua hacia arriba',
      dificultad: 'media',
      movimientos: [8, 1, 2],
      tiempoLimite: 100
    },
    {
      nivel: 6,
      nombre: 'Secuencia Completa',
      descripcion: 'Movimientos verticales combinados',
      dificultad: 'difícil',
      movimientos: [8, 1, 2, 5],
      tiempoLimite: 120
    }
  ];

  // Estado del juego actual
  secuenciaActual: SecuenciaNivel | null = null;
  movimientosArrastrable: MovimientoLingual[] = [];
  zonasDestino: (number | null)[] = [null, null, null];
  secuenciaCompleta: boolean = false;
  mostrarPista: boolean = false;

  // Estadísticas
  secuenciasCorrectas: number = 0;

  // Modal personalizado
  mostrarModal: boolean = false;
  tituloModal: string = '';
  mensajeModal: string = '';
  tipoModal: 'success' | 'error' | 'info' = 'info';
  puntosModal: number = 0;

  constructor(
    private router: Router,
    private historialService: HistorialActividadesService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.detenerCamara();
    this.detenerTemporizador();
  }

  // ==================== MÉTODOS DE CÁMARA Y MEDIAPIPE ====================

  async iniciarCamara(): Promise<void> {
    try {
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults((results: Results) => this.onResults(results));

      await this.esperarVideoElement();

      const video = this.videoElement.nativeElement;
      this.camera = new Camera(video, {
        onFrame: async () => {
          await this.faceMesh!.send({ image: video });
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
    } catch (error) {
      console.error('Error al iniciar la cámara:', error);
      alert('No se pudo acceder a la cámara. Por favor, permite el acceso a la cámara.');
    }
  }

  private esperarVideoElement(): Promise<void> {
    return new Promise((resolve) => {
      const checkVideo = () => {
        if (this.videoElement && this.videoElement.nativeElement) {
          resolve();
        } else {
          setTimeout(checkVideo, 100);
        }
      };
      checkVideo();
    });
  }

  onResults(results: Results): void {
    if (this.faseJuego !== 'captura') {
      return;
    }

    if (!this.canvasElement || !this.canvasElement.nativeElement || 
        !this.videoElement || !this.videoElement.nativeElement) {
      return;
    }

    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');
    const video = this.videoElement.nativeElement;

    if (!ctx) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.movimientoDetectado = false;
      this.mensajeValidacion = '❌ No detectamos tu cara. Acércate a la cámara';
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const movimiento = this.todosLosMovimientos[this.movimientoActualCaptura];

    this.movimientoDetectado = this.validarMovimiento(movimiento.id, landmarks);

    if (this.movimientoDetectado) {
      this.mensajeValidacion = '✅ ¡Perfecto! Ahora toma la foto 📸';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    } else {
      this.mensajeValidacion = `❌ ${this.getMensajeError(movimiento.id)}`;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
  }

  validarMovimiento(movimientoId: number, landmarks: any[]): boolean {
    switch (movimientoId) {
      case 1:
        return this.detectarLenguaAfuera(landmarks);
      case 2:
        return this.detectarLenguaArriba(landmarks);
      case 3:
        return this.detectarSonrisa(landmarks);
      case 4:
        return this.detectarBeso(landmarks);
      case 5:
        return this.detectarLenguaAbajo(landmarks);
      case 6:
        return this.detectarLenguaPaladar(landmarks);
      case 7:
        return this.detectarBocaAbierta(landmarks);
      case 8:
        return this.detectarBocaCerrada(landmarks);
      default:
        return false;
    }
  }

  detectarLenguaAfuera(landmarks: any[]): boolean {
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const aperturaBoca = Math.abs(labioInferior.y - labioSuperior.y);
    return aperturaBoca > 0.045;
  }

  // 🔥 CORREGIDO: Umbrales más flexibles para detección de lengua arriba
  detectarLenguaArriba(landmarks: any[]): boolean {
    const labioSuperior = landmarks[13];
    const puntaNariz = landmarks[1];
    const labioInferior = landmarks[14];
    
    const aperturaBoca = Math.abs(labioInferior.y - labioSuperior.y);
    const distanciaNariz = Math.abs(labioSuperior.y - puntaNariz.y);
    
    // Umbrales ajustados para mayor flexibilidad:
    // - aperturaBoca: reducido de 0.04 a 0.03 (permite boca menos abierta)
    // - distanciaNariz: aumentado de 0.08 a 0.12 (más tolerante con la distancia)
    return aperturaBoca > 0.03 && distanciaNariz < 0.12;
  }

  detectarSonrisa(landmarks: any[]): boolean {
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    
    const anchoBoca = Math.abs(comisuraDer.x - comisuraIzq.x);
    const aperturaBoca = Math.abs(labioInferior.y - labioSuperior.y);
    
    return anchoBoca > 0.12 && aperturaBoca > 0.01 && aperturaBoca < 0.06;
  }

  detectarBeso(landmarks: any[]): boolean {
    const comisuraIzq = landmarks[61];
    const comisuraDer = landmarks[291];
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    
    const anchoBoca = Math.abs(comisuraDer.x - comisuraIzq.x);
    const aperturaBoca = Math.abs(labioInferior.y - labioSuperior.y);
    
    return anchoBoca < 0.11 && aperturaBoca < 0.03;
  }

  detectarLenguaAbajo(landmarks: any[]): boolean {
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const menton = landmarks[152];
    
    const aperturaBoca = labioInferior.y - labioSuperior.y;
    const distanciaMenton = Math.abs(labioInferior.y - menton.y);
    
    return aperturaBoca > 0.05 && distanciaMenton < 0.08;
  }

  detectarLenguaPaladar(landmarks: any[]): boolean {
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const aperturaBoca = Math.abs(labioInferior.y - labioSuperior.y);
    
    return aperturaBoca > 0.02 && aperturaBoca < 0.035;
  }

  detectarBocaAbierta(landmarks: any[]): boolean {
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const aperturaBoca = Math.abs(labioInferior.y - labioSuperior.y);
    
    return aperturaBoca > 0.05;
  }

  detectarBocaCerrada(landmarks: any[]): boolean {
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const aperturaBoca = Math.abs(labioInferior.y - labioSuperior.y);
    
    return aperturaBoca < 0.02;
  }

  getMensajeError(movimientoId: number): string {
    switch (movimientoId) {
      case 1:
        return '¡No vemos tu lengua! Sácala más 👅';
      case 2:
        return '¡Intenta tocar tu nariz con la lengua! 👃🏼';
      case 3:
        return '¡Sonríe más! Muestra tus dientes 😁';
      case 4:
        return '¡Junta más los labios como para dar un beso! 😘';
      case 5:
        return '¡Baja tu lengua hacia el mentón! ⬇️';
      case 6:
        return '¡Sube tu lengua al paladar! ⬆️';
      case 7:
        return '¡Abre más la boca! 😮';
      case 8:
        return '¡Cierra más la boca! 😐';
      default:
        return 'Intenta de nuevo';
    }
  }

  capturarFoto(): void {
    if (!this.movimientoDetectado) {
      this.mostrarModalPersonalizado(
        'Movimiento no detectado',
        'Primero debes hacer el movimiento correctamente',
        'error',
        0
      );
      return;
    }

    const canvas = this.canvasElement.nativeElement;
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);

    this.todosLosMovimientos[this.movimientoActualCaptura].foto = fotoBase64;
    this.todosLosMovimientos[this.movimientoActualCaptura].emoji = '';

    this.mostrarFlashCaptura();

    this.movimientoActualCaptura++;

    if (this.movimientoActualCaptura >= this.todosLosMovimientos.length) {
      setTimeout(() => {
        this.detenerCamara();
        this.iniciarFaseJuego();
      }, 500);
    } else {
      this.movimientoDetectado = false;
      this.mensajeValidacion = '';
    }
  }

  mostrarFlashCaptura(): void {
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  detenerCamara(): void {
    try {
      if (this.camera) {
        this.camera.stop();
        this.camera = null;
      }
      
      if (this.faceMesh) {
        this.faceMesh.close();
        this.faceMesh = null;
      }
      
      if (this.videoElement && this.videoElement.nativeElement && this.videoElement.nativeElement.srcObject) {
        const stream = this.videoElement.nativeElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        this.videoElement.nativeElement.srcObject = null;
      }
    } catch (error) {
      console.error('Error al detener cámara:', error);
    }
  }

  // ==================== MÉTODOS DEL JUEGO ====================

  empezarNivel(): void {
    const yaHayFotos = this.todosLosMovimientos.some(mov => mov.foto !== null);
    
    if (yaHayFotos) {
      this.iniciarFaseJuego();
    } else {
      this.faseJuego = 'captura';
      this.movimientoActualCaptura = 0;
      
      const emojisOriginales = ['👅', '👃🏼', '😁', '😘', '⬇️', '⬆️', '😮', '😐'];
      this.todosLosMovimientos.forEach((mov, index) => {
        mov.foto = null;
        mov.emoji = emojisOriginales[index];
      });

      setTimeout(() => {
        this.iniciarCamara();
      }, 100);
    }
  }

  iniciarFaseJuego(): void {
    this.faseJuego = 'jugando';
    this.secuenciaActual = this.secuencias[this.nivelActual - 1];
    this.preparaNivel();
    this.iniciarTemporizador();
  }

  preparaNivel(): void {
    if (!this.secuenciaActual) return;

    const numMovimientos = this.secuenciaActual.movimientos.length;
    this.zonasDestino = new Array(numMovimientos).fill(null);
    
    this.secuenciaCompleta = false;
    this.intentos = 0;
    this.mostrarPista = false;

    this.movimientosArrastrable = this.secuenciaActual.movimientos.map((idMov, index) => {
      const movimiento = this.todosLosMovimientos.find(m => m.id === idMov)!;
      return {
        ...movimiento,
        posicionCorrecta: index,
        colocado: false,
        arrastrando: false
      };
    });

    this.movimientosArrastrable = this.mezclarArray(this.movimientosArrastrable);
  }

  mezclarArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ==================== DRAG & DROP ====================

  onDragStart(event: DragEvent, movimiento: MovimientoLingual): void {
    if (this.faseJuego !== 'jugando') return;
    
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('movimientoId', movimiento.id.toString());
    movimiento.arrastrando = true;
  }

  onDragEnd(event: DragEvent, movimiento: MovimientoLingual): void {
    movimiento.arrastrando = false;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDrop(event: DragEvent, zonaIndex: number): void {
    event.preventDefault();
    
    const movimientoId = parseInt(event.dataTransfer!.getData('movimientoId'));
    const movimiento = this.movimientosArrastrable.find(m => m.id === movimientoId);
    
    if (!movimiento) return;

    if (this.zonasDestino[zonaIndex] !== null) {
      const movimientoAnterior = this.obtenerMovimientoPorId(this.zonasDestino[zonaIndex]!);
      if (movimientoAnterior) {
        movimientoAnterior.colocado = false;
      }
    }

    const zonaAnterior = this.zonasDestino.indexOf(movimiento.id);
    if (zonaAnterior !== -1) {
      this.zonasDestino[zonaAnterior] = null;
    }

    this.zonasDestino[zonaIndex] = movimiento.id;
    movimiento.colocado = true;
    movimiento.arrastrando = false;

    this.secuenciaCompleta = this.zonasDestino.every(z => z !== null);
  }

  obtenerMovimientoPorId(id: number): MovimientoLingual | undefined {
    return this.movimientosArrastrable.find(m => m.id === id);
  }

  // ==================== VERIFICACIÓN ====================

  verificarSecuencia(): void {
    if (!this.secuenciaCompleta) {
      this.mostrarModalPersonalizado(
        '¡Secuencia incompleta!',
        'Completa toda la secuencia primero arrastrando todas las fotos',
        'info',
        0
      );
      return;
    }

    this.faseJuego = 'verificando';
    this.intentos++;

    setTimeout(() => {
      this.ngZone.run(() => {
        const esCorrecta = this.verificarOrdenCorrecto();

        if (esCorrecta) {
          this.manejarSecuenciaCorrecta();
        } else {
          this.manejarSecuenciaIncorrecta();
        }
      });
    }, 1500);
  }

  verificarOrdenCorrecto(): boolean {
    return this.zonasDestino.every((movId, index) => {
      const movimiento = this.obtenerMovimientoPorId(movId!);
      return movimiento && movimiento.posicionCorrecta === index;
    });
  }

  manejarSecuenciaCorrecta(): void {
    this.secuenciasCorrectas++;

    if (this.nivelActual < this.maxNiveles) {
      this.mostrarModalPersonalizado(
        '¡Excelente!',
        `¡Muy bien! Has completado la secuencia correctamente.`,
        'success',
        0
      );

      setTimeout(() => {
        this.ngZone.run(() => {
          this.nivelActual++;
          this.faseJuego = 'jugando';
          this.secuenciaActual = this.secuencias[this.nivelActual - 1];
          this.preparaNivel();
          this.iniciarTemporizador();
          this.cdr.detectChanges();
        });
      }, 2000);
      
    } else {
      // Detener temporizador PRIMERO
      this.detenerTemporizador();
      
      // Cerrar cualquier modal abierto
      this.mostrarModal = false;
      
      // Cambiar fase a completado INMEDIATAMENTE
      this.faseJuego = 'completado';
      
      // Forzar detección de cambios
      this.cdr.detectChanges();
      
      // Guardar estadísticas
      this.guardarEstadisticas();
      
      // Registrar en historial
      this.historialService.registrarJuego('Puzzle de Movimientos').subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  manejarSecuenciaIncorrecta(): void {
    this.mostrarModalPersonalizado(
      'Inténtalo de nuevo',
      `El orden no es correcto. ¡Vuelve a intentarlo!`,
      'error',
      0
    );
    
    setTimeout(() => {
      this.ngZone.run(() => {
        this.faseJuego = 'jugando';
        
        const numMovimientos = this.secuenciaActual!.movimientos.length;
        this.zonasDestino = new Array(numMovimientos).fill(null);
        this.movimientosArrastrable.forEach(m => m.colocado = false);
        this.secuenciaCompleta = false;
        this.cdr.detectChanges();
      });
    }, 2000);
  }

  // ==================== TEMPORIZADOR ====================

  iniciarTemporizador(): void {
    this.detenerTemporizador();
    this.tiempoInicio = Date.now();
    
    this.intervalTemporizador = setInterval(() => {
      if (this.faseJuego !== 'jugando' && this.faseJuego !== 'verificando') {
        this.detenerTemporizador();
        return;
      }
      
      const tiempoTranscurrido = this.obtenerTiempoTranscurrido();
      
      if (tiempoTranscurrido >= this.secuenciaActual!.tiempoLimite) {
        this.detenerTemporizador();
        
        this.ngZone.run(() => {
          this.mostrarModalPersonalizado(
            '¡Tiempo agotado!',
            'Se acabó el tiempo. ¡Intenta completar la secuencia más rápido!',
            'error',
            0
          );
          
          setTimeout(() => {
            this.ngZone.run(() => {
              this.preparaNivel();
              this.iniciarTemporizador();
              this.cdr.detectChanges();
            });
          }, 2000);
        });
      }
      
      this.cdr.detectChanges();
    }, 1000);
  }

  detenerTemporizador(): void {
    if (this.intervalTemporizador) {
      clearInterval(this.intervalTemporizador);
      this.intervalTemporizador = null;
    }
  }

  obtenerTiempoTranscurrido(): number {
    return Math.floor((Date.now() - this.tiempoInicio) / 1000);
  }

  obtenerTiempoRestante(): number {
    if (!this.secuenciaActual) return 0;
    return Math.max(0, this.secuenciaActual.tiempoLimite - this.obtenerTiempoTranscurrido());
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ==================== ESTADÍSTICAS ====================

  obtenerPorcentajeProgreso(): number {
    return Math.round((this.nivelActual / this.maxNiveles) * 100);
  }

  cargarEstadisticas(): void {
    const stats = localStorage.getItem('puzzleMovimientosStats');
    if (stats) {
      // Cargar estadísticas si es necesario
    }
  }

  guardarEstadisticas(): void {
    const stats: EstadisticasJuego = {
      secuenciasCorrectas: this.secuenciasCorrectas,
      intentosTotales: this.intentos,
      tiempoTotal: this.obtenerTiempoTranscurrido()
    };
    localStorage.setItem('puzzleMovimientosStats', JSON.stringify(stats));
  }

  // ==================== NAVEGACIÓN ====================

  mostrarModalPersonalizado(titulo: string, mensaje: string, tipo: 'success' | 'error' | 'info', puntos: number): void {
    this.tituloModal = titulo;
    this.mensajeModal = mensaje;
    this.tipoModal = tipo;
    this.puntosModal = puntos;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  reiniciarJuego(): void {
    this.nivelActual = 1;
    this.intentos = 0;
    this.secuenciasCorrectas = 0;
    this.faseJuego = 'instrucciones';
    
    const emojisOriginales = ['👅', '👃🏼', '😁', '😘', '⬇️', '⬆️', '😮', '😐'];
    this.todosLosMovimientos.forEach((mov, index) => {
      mov.foto = null;
      mov.emoji = emojisOriginales[index];
      mov.colocado = false;
      mov.arrastrando = false;
    });
    
    this.zonasDestino = [];
    this.movimientosArrastrable = [];
    this.secuenciaActual = null;
  }

  siguienteJuego(): void {
    this.router.navigate(['/juego/linguales/ritmo-silabas']);
  }

  volverAJuegos(): void {
    this.router.navigate(['/juegos-terapeuticos']);
  }
}