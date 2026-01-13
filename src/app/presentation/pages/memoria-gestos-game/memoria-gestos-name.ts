import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HistorialActividadesService } from '../../services/historial-actividades.service';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh, Results } from '@mediapipe/face_mesh';

interface GestoFacial {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  instruccion: string;
  imagenCapturada?: string;
  usado?: boolean;
  uniqueId?: string;
}

interface Slot {
  gesto: GestoFacial | null;
  dragOver: boolean;
}

@Component({
  selector: 'app-memoria-gestos-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memoria-gestos-game.component.html',
  styleUrls: ['./memoria-gestos-game.component.css']
})
export class MemoriaGestosGameComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Estados del juego
  faseJuego: 'instrucciones' | 'capturando-inicial' | 'mostrando' | 'esperando' | 'jugando' | 'completado' | 'error' = 'instrucciones';
  nivelActual: number = 1;
  
  // ⭐ DIFICULTAD REDUCIDA: Solo 5 niveles en vez de 8
  maxNiveles: number = 5;
  
  // Gestos disponibles
  gestosDisponibles: GestoFacial[] = [
    {
      id: 'beso',
      nombre: 'Beso',
      emoji: '💋',
      descripcion: 'Hacer un beso con los labios',
      instruccion: 'Junta tus labios como si fueras a dar un beso',
      usado: false
    },
    {
      id: 'sonrisa',
      nombre: 'Sonrisa',
      emoji: '😊',
      descripcion: 'Sonreír ampliamente',
      instruccion: 'Sonríe mostrando tus dientes',
      usado: false
    },
    {
      id: 'lengua-afuera',
      nombre: 'Lengua Afuera',
      emoji: '😛',
      descripcion: 'Sacar la lengua',
      instruccion: 'Saca tu lengua lo más que puedas hacia afuera',
      usado: false
    },
    {
      id: 'soplo',
      nombre: 'Boca Abierta',
      emoji: '😮',
      descripcion: 'Abrir la boca grande',
      instruccion: 'Abre tu boca lo más grande posible',
      usado: false
    },
    {
      id: 'mejillas-infladas',
      nombre: 'Lengua Arriba',
      emoji: '⬆️',
      descripcion: 'Tocar la nariz con la lengua',
      instruccion: 'Toca tu nariz con la lengua hacia arriba',
      usado: false
    }
  ];
  
  // Captura inicial
  indiceCaptura: number = 0;
  gestoCapturando: GestoFacial | null = null;
  todasFotosTomadas: boolean = false;
  
  // Secuencia actual
  secuenciaActual: GestoFacial[] = [];
  respuestaJugador: (GestoFacial | null)[] = [];
  gestoMostrando: GestoFacial | null = null;
  indiceGestoActual: number = 0;
  
  // Drag and Drop
  slots: Slot[] = [];
  fotosDisponibles: GestoFacial[] = [];
  gestoDragging: GestoFacial | null = null;
  
  // MediaPipe
  faceMesh: FaceMesh | null = null;
  camera: Camera | null = null;
  
  // Detección
  movimientoDetectado: boolean = false;
  mensajeValidacion: string = '';
  
  // Animaciones y efectos
  mostrandoSecuencia: boolean = false;
  
  // ⭐ TIEMPOS MÁS LARGOS para que sea más fácil memorizar
  tiempoMostrarGesto: number = 2000;  // Antes: 1500
  tiempoPausa: number = 1000;         // Antes: 800
  
  resultadoDeteccion: 'correcto' | 'incorrecto' | null = null;
  mensajeDeteccion: string = '';
  
  // ⭐ Oportunidad de ver secuencia una vez más
  puedeVerSecuenciaOtraVez: boolean = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private historialService: HistorialActividadesService
  ) {}

  async ngOnInit() {
    this.iniciarJuego();
  }

  ngOnDestroy() {
    this.detenerCamara();
  }

  iniciarJuego() {
    this.nivelActual = 1;
    this.faseJuego = 'instrucciones';
    this.todasFotosTomadas = false;
    this.indiceCaptura = 0;
    
    this.gestosDisponibles.forEach(g => {
      g.imagenCapturada = undefined;
      g.usado = false;
    });
    
    console.log('🧠 Juego "Memoria de Gestos" iniciado');
  }

  // === CAPTURA INICIAL DE GESTOS ===
  
  iniciarCapturaInicial() {
    this.faseJuego = 'capturando-inicial';
    this.indiceCaptura = 0;
    this.prepararSiguienteCaptura();
  }

  prepararSiguienteCaptura() {
    if (this.indiceCaptura < this.gestosDisponibles.length) {
      this.gestoCapturando = this.gestosDisponibles[this.indiceCaptura];
      this.resultadoDeteccion = null;
      this.mensajeDeteccion = '';
      this.movimientoDetectado = false;
      this.mensajeValidacion = '';
    } else {
      this.todasFotosTomadas = true;
      this.gestoCapturando = null;
      this.detenerCamara();
      
      setTimeout(() => {
        this.empezarNivel();
      }, 1500);
    }
  }

  async iniciarCamara(): Promise<void> {
    try {
      console.log('🎥 Iniciando cámara...');
      
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
      console.log('✅ Cámara iniciada correctamente');
    } catch (error) {
      console.error('❌ Error al iniciar la cámara:', error);
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
    if (this.faseJuego !== 'capturando-inicial' || !this.gestoCapturando) return;

    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const video = this.videoElement.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.movimientoDetectado = false;
      this.mensajeValidacion = '❌ No detectamos tu cara. Acércate a la cámara';
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];

    this.movimientoDetectado = this.validarMovimiento(this.gestoCapturando.id, landmarks);

    if (this.movimientoDetectado) {
      this.mensajeValidacion = '✅ ¡Perfecto! Ahora toma la foto 📸';
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    } else {
      this.mensajeValidacion = `❌ ${this.getMensajeError(this.gestoCapturando.id)}`;
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
  }

  validarMovimiento(gestoId: string, landmarks: any[]): boolean {
    switch (gestoId) {
      case 'lengua-afuera':
        return this.detectarLenguaAfuera(landmarks);
      case 'mejillas-infladas':
        return this.detectarLenguaArriba(landmarks);
      case 'sonrisa':
        return this.detectarSonrisa(landmarks);
      case 'beso':
        return this.detectarBeso(landmarks);
      case 'soplo':
        return this.detectarBocaAbierta(landmarks);
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

  detectarBocaAbierta(landmarks: any[]): boolean {
    const labioSuperior = landmarks[13];
    const labioInferior = landmarks[14];
    const aperturaBoca = Math.abs(labioInferior.y - labioSuperior.y);
    
    return aperturaBoca > 0.05;
  }

  getMensajeError(gestoId: string): string {
    switch (gestoId) {
      case 'lengua-afuera':
        return '¡No vemos tu lengua! Sácala más 👅';
      case 'mejillas-infladas':
        return '¡Intenta tocar tu nariz con la lengua! ⬆️';
      case 'sonrisa':
        return '¡Sonríe más! Muestra tus dientes 😁';
      case 'beso':
        return '¡Junta más los labios como para dar un beso! 😘';
      case 'soplo':
        return '¡Abre más la boca! 😮';
      default:
        return 'Intenta de nuevo';
    }
  }

  detenerCamara() {
    try {
      if (this.camera) {
        this.camera.stop();
        this.camera = null;
      }
      if (this.faceMesh) {
        this.faceMesh.close();
        this.faceMesh = null;
      }
      if (this.videoElement && this.videoElement.nativeElement.srcObject) {
        const stream = this.videoElement.nativeElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        this.videoElement.nativeElement.srcObject = null;
      }
    } catch (error) {
      console.error('Error al detener cámara:', error);
    }
  }

  capturarFotoInicial(): void {
    if (!this.movimientoDetectado) {
      alert('Primero debes hacer el movimiento correctamente');
      return;
    }

    const canvas = this.canvasElement.nativeElement;
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);

    this.gestoCapturando!.imagenCapturada = fotoBase64;
    this.resultadoDeteccion = 'correcto';
    this.mensajeDeteccion = '¡Perfecto! Foto guardada';

    this.mostrarFlashCaptura();

    setTimeout(() => {
      this.indiceCaptura++;
      this.prepararSiguienteCaptura();
    }, 1000);
  }

  mostrarFlashCaptura(): void {
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setTimeout(() => {
    }, 100);
  }

  // === CONTROL DEL JUEGO ===
  
  empezarNivel() {
    this.faseJuego = 'mostrando';
    this.generarSecuencia();
    setTimeout(() => {
      this.mostrarSecuencia();
    }, 500);
  }

  // ⭐ SECUENCIAS MÁS CORTAS Y FÁCILES - SIN REPETIR TODOS IGUALES
  generarSecuencia() {
    this.secuenciaActual = [];
    this.respuestaJugador = [];
    
    // ⭐ Resetear la oportunidad de ver secuencia en cada nivel
    this.puedeVerSecuenciaOtraVez = true;
    
    // Nivel 1: 2 gestos, Nivel 2: 2 gestos, Nivel 3: 3 gestos, Nivel 4: 3 gestos, Nivel 5: 4 gestos
    let longitudSecuencia: number;
    if (this.nivelActual <= 2) {
      longitudSecuencia = 2;  // Niveles 1-2: solo 2 gestos
    } else if (this.nivelActual <= 4) {
      longitudSecuencia = 3;  // Niveles 3-4: 3 gestos
    } else {
      longitudSecuencia = 4;  // Nivel 5: 4 gestos
    }
    
    // ⭐ ASEGURAR que NO todos los gestos sean iguales
    let intentos = 0;
    const maxIntentos = 50;
    
    do {
      this.secuenciaActual = [];
      
      for (let i = 0; i < longitudSecuencia; i++) {
        const gestoAleatorio = this.gestosDisponibles[
          Math.floor(Math.random() * this.gestosDisponibles.length)
        ];
        this.secuenciaActual.push(gestoAleatorio);
      }
      
      intentos++;
    } while (this.todosGestosIguales() && intentos < maxIntentos);
    
    console.log(`🎯 Nivel ${this.nivelActual}: Secuencia de ${longitudSecuencia} gestos`, this.secuenciaActual.map(g => g.nombre));
  }
  
  // ⭐ Verificar si todos los gestos son iguales
  todosGestosIguales(): boolean {
    if (this.secuenciaActual.length <= 1) return false;
    
    const primerGestoId = this.secuenciaActual[0].id;
    return this.secuenciaActual.every(g => g.id === primerGestoId);
  }

  async mostrarSecuencia() {
    this.mostrandoSecuencia = true;
    this.indiceGestoActual = 0;
    
    for (let i = 0; i < this.secuenciaActual.length; i++) {
      this.gestoMostrando = this.secuenciaActual[i];
      this.indiceGestoActual = i;
      
      await this.esperar(this.tiempoMostrarGesto);
      
      this.gestoMostrando = null;
      await this.esperar(this.tiempoPausa);
    }
    
    this.mostrandoSecuencia = false;
    this.faseJuego = 'jugando';
    this.gestoMostrando = null;
    
    this.inicializarDragAndDrop();
  }

  // ⭐ Ver secuencia por última vez (una sola oportunidad por nivel)
  async verSecuenciaOtraVez() {
    if (!this.puedeVerSecuenciaOtraVez) return;
    
    // Deshabilitar el botón - solo se puede usar una vez
    this.puedeVerSecuenciaOtraVez = false;
    
    // Limpiar los slots antes de mostrar la secuencia
    this.slots.forEach(s => {
      if (s.gesto) {
        const gestoEnLista = this.fotosDisponibles.find(
          f => f.uniqueId === s.gesto!.uniqueId
        );
        if (gestoEnLista) {
          gestoEnLista.usado = false;
        }
        s.gesto = null;
      }
    });
    this.respuestaJugador = new Array(this.secuenciaActual.length).fill(null);
    
    // Mostrar la secuencia
    this.mostrandoSecuencia = true;
    this.indiceGestoActual = 0;
    
    for (let i = 0; i < this.secuenciaActual.length; i++) {
      this.gestoMostrando = this.secuenciaActual[i];
      this.indiceGestoActual = i;
      
      await this.esperar(this.tiempoMostrarGesto);
      
      this.gestoMostrando = null;
      await this.esperar(this.tiempoPausa);
    }
    
    this.mostrandoSecuencia = false;
    this.gestoMostrando = null;
    
    console.log('👀 Secuencia mostrada por última vez');
  }

  // ========== DRAG AND DROP LOGIC ========== //

  inicializarDragAndDrop() {
    this.slots = [];
    for (let i = 0; i < this.secuenciaActual.length; i++) {
      this.slots.push({ gesto: null, dragOver: false });
    }
    
    this.fotosDisponibles = this.secuenciaActual.map((gesto, index) => ({
      ...gesto,
      uniqueId: `${gesto.id}-${index}-${Date.now()}`,
      usado: false
    }));
    
    this.desordenarArray(this.fotosDisponibles);
    
    this.respuestaJugador = new Array(this.secuenciaActual.length).fill(null);
    
    console.log('🎮 Drag and drop inicializado con IDs únicos');
  }

  desordenarArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  onDragStart(event: DragEvent, gesto: GestoFacial) {
    if (gesto.usado) {
      event.preventDefault();
      return;
    }
    
    event.dataTransfer!.setData('gestoUniqueId', gesto.uniqueId || '');
    event.dataTransfer!.effectAllowed = 'move';
    this.gestoDragging = gesto;
    console.log('🎯 Dragging:', gesto.nombre, 'ID:', gesto.uniqueId);
  }

  onDragEnd(event: DragEvent) {
    this.gestoDragging = null;
  }

  onDragOver(event: DragEvent, slotIndex: number) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    
    this.slots[slotIndex].dragOver = true;
  }

  onDragLeave(event: DragEvent, slotIndex: number) {
    this.slots[slotIndex].dragOver = false;
  }

  onDrop(event: DragEvent, slotIndex: number) {
    event.preventDefault();
    
    const gestoUniqueId = event.dataTransfer!.getData('gestoUniqueId');
    
    const gesto = this.fotosDisponibles.find(f => f.uniqueId === gestoUniqueId);
    
    if (!gesto || gesto.usado) {
      this.slots[slotIndex].dragOver = false;
      return;
    }
    
    if (this.slots[slotIndex].gesto) {
      const gestoAnterior = this.fotosDisponibles.find(
        f => f.uniqueId === this.slots[slotIndex].gesto!.uniqueId
      );
      if (gestoAnterior) {
        gestoAnterior.usado = false;
      }
    }
    
    gesto.usado = true;
    
    this.slots[slotIndex].gesto = gesto;
    this.slots[slotIndex].dragOver = false;
    
    this.respuestaJugador[slotIndex] = gesto;
    
    console.log('✅ Foto colocada en slot', slotIndex + 1, 'ID:', gesto.uniqueId);
    console.log('📊 Progreso:', this.respuestaJugador.filter(r => r !== null).length, '/', this.secuenciaActual.length);
    
    this.gestoDragging = null;
  }

  removerFoto(slotIndex: number) {
    const gesto = this.slots[slotIndex].gesto;
    
    if (gesto) {
      const gestoEnLista = this.fotosDisponibles.find(
        f => f.uniqueId === gesto.uniqueId
      );
      
      if (gestoEnLista) {
        gestoEnLista.usado = false;
      }
      
      this.slots[slotIndex].gesto = null;
      this.respuestaJugador[slotIndex] = null;
      
      console.log('🗑️ Foto removida del slot', slotIndex + 1, 'ID:', gesto.uniqueId);
    }
  }

  verificarOrden() {
    console.log('🔍 Verificando orden...');
    
    let correcto = true;
    
    for (let i = 0; i < this.secuenciaActual.length; i++) {
      if (!this.respuestaJugador[i] || 
          this.respuestaJugador[i]!.id !== this.secuenciaActual[i].id) {
        correcto = false;
        break;
      }
    }
    
    if (correcto) {
      console.log('✅ ¡Orden correcto!');
      this.completarNivel();
    } else {
      console.log('❌ Orden incorrecto');
      this.mostrarError();
    }
  }

  completarNivel() {
    this.faseJuego = 'esperando';
    
    console.log(`✅ Nivel ${this.nivelActual} completado`);
    
    if (this.nivelActual >= this.maxNiveles) {
      setTimeout(() => {
        this.completarJuego();
      }, 1500);
    } else {
      setTimeout(() => {
        this.nivelActual++;
        this.empezarNivel();
      }, 2000);
    }
  }

  mostrarError() {
    this.faseJuego = 'error';
    
    setTimeout(() => {
      this.slots.forEach(s => {
        if (s.gesto) {
          const gestoEnLista = this.fotosDisponibles.find(
            f => f.uniqueId === s.gesto!.uniqueId
          );
          if (gestoEnLista) {
            gestoEnLista.usado = false;
          }
          s.gesto = null;
        }
      });
      
      this.respuestaJugador = new Array(this.secuenciaActual.length).fill(null);
      this.faseJuego = 'jugando';
    }, 2000);
  }

  completarJuego() {
    this.faseJuego = 'completado';
    console.log('🎉 ¡Juego completado!');
    
    this.historialService.registrarJuego('Memoria de Gestos Labiales').subscribe({
      next: () => console.log('✅ Memoria de Gestos registrado en historial'),
      error: (error: any) => console.error('❌ Error registrando actividad:', error)
    });
  }

  // === UTILIDADES ===
  
  esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getDificultadTexto(): string {
    if (this.nivelActual <= 2) return 'Fácil';
    if (this.nivelActual <= 4) return 'Medio';
    return 'Difícil';
  }

  getFotosCapturadas(): number {
    return this.gestosDisponibles.filter(g => g.imagenCapturada).length;
  }

  trackByGestoUniqueId(index: number, gesto: GestoFacial): string {
    return gesto.uniqueId || gesto.id;
  }

  // === NAVEGACIÓN ===
  
  reiniciarJuego() {
    this.iniciarJuego();
  }

  volverAJuegos() {
    this.router.navigate(['/juegos-terapeuticos']);
  }

  siguienteJuego() {
    this.router.navigate(['/juego', 'labiales', 'soplo-virtual']);
  }

  saltarInstrucciones() {
    this.iniciarCapturaInicial();
    
    setTimeout(() => {
      this.iniciarCamara();
    }, 100);
  }
}