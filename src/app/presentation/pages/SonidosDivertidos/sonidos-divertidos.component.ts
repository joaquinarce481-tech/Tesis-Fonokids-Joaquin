import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Declarar SpeechRecognition para TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Sonido {
  id: number;
  nombre: string;
  onomatopeya: string;
  imagen: string;
  audio: string;
  filtro: string;
  palabrasClave: string[];
}

@Component({
  selector: 'app-sonidos-divertidos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sonidos-divertidos.component.html',
  styleUrls: ['./sonidos-divertidos.component.css']
})
export class SonidosDivertidosComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  sonidos: Sonido[] = [
    {
      id: 1,
      nombre: 'Perro',
      onomatopeya: '¡GUAU GUAU!',
      imagen: '🐕',
      audio: 'guau',
      filtro: 'perro',
      palabrasClave: ['guau', 'wau', 'wow', 'gua', 'guaú', 'wauf', 'gau', 'gua gua']
    },
    {
      id: 2,
      nombre: 'Gato',
      onomatopeya: '¡MIAU MIAU!',
      imagen: '🐱',
      audio: 'miau',
      filtro: 'gato',
      palabrasClave: ['miau', 'mia', 'meow', 'miau', 'miaú', 'mia mia']
    },
    {
      id: 3,
      nombre: 'Vaca',
      onomatopeya: '¡MUUU!',
      imagen: '🐄',
      audio: 'muuu',
      filtro: 'vaca',
      palabrasClave: ['mu', 'muu', 'muuu', 'moo', 'muuuu']
    },
    {
      id: 4,
      nombre: 'Oveja',
      onomatopeya: '¡BEEE!',
      imagen: '🐑',
      audio: 'beee',
      filtro: 'oveja',
      palabrasClave: ['be', 'bee', 'beee', 'baa', 'beeee', 've']
    },
    {
      id: 5,
      nombre: 'Pato',
      onomatopeya: '¡CUAC CUAC!',
      imagen: '🦆',
      audio: 'cuac',
      filtro: 'pato',
      palabrasClave: ['cuac', 'cuak', 'quack', 'cua', 'cuac cuac', 'cuá']
    },
    {
      id: 6,
      nombre: 'Cerdo',
      onomatopeya: '¡OINC OINC!',
      imagen: '🐷',
      audio: 'oinc',
      filtro: 'cerdo',
      palabrasClave: ['oinc', 'oink', 'oin', 'oinc oinc', 'oing']
    },
    {
      id: 7,
      nombre: 'León',
      onomatopeya: '¡ROAAR!',
      imagen: '🦁',
      audio: 'roar',
      filtro: 'leon',
      palabrasClave: ['roar', 'roaar', 'rugido', 'grrr', 'rawr', 'ruar', 'roar']
    },
    {
      id: 8,
      nombre: 'Abeja',
      onomatopeya: '¡BZZZ!',
      imagen: '🐝',
      audio: 'bzzz',
      filtro: 'abeja',
      palabrasClave: ['bzz', 'bzzz', 'buzz', 'zzzz', 'bz', 'bzzzz']
    },
    {
      id: 9,
      nombre: 'Campana',
      onomatopeya: '¡DING DONG!',
      imagen: '🔔',
      audio: 'ding',
      filtro: 'campana',
      palabrasClave: ['ding', 'dong', 'din', 'tan', 'ding dong', 'din don']
    },
    {
      id: 10,
      nombre: 'Auto',
      onomatopeya: '¡BIP BIP!',
      imagen: '🚗',
      audio: 'bip',
      filtro: 'auto',
      palabrasClave: ['bip', 'beep', 'pip', 'bip bip', 'pi pi']
    },
    {
      id: 11,
      nombre: 'Reloj',
      onomatopeya: '¡TIC TAC!',
      imagen: '⏰',
      audio: 'tic',
      filtro: 'reloj',
      palabrasClave: ['tic', 'tac', 'tick', 'tock', 'tic tac', 'ti ta']
    },
    {
      id: 12,
      nombre: 'Aplausos',
      onomatopeya: '¡CLAP CLAP!',
      imagen: '👏',
      audio: 'clap',
      filtro: 'aplausos',
      palabrasClave: ['clap', 'aplausos', 'palm', 'aplauso', 'clap clap']
    }
  ];

  sonidoActual: Sonido | null = null;
  indiceActual: number = 0;
  mostrarCelebracion: boolean = false;
  juegoCompletado: boolean = false;

  // Camera & AR
  camaraActiva: boolean = false;
  camaraError: string = '';
  stream: MediaStream | null = null;
  renderizando: boolean = false;
  intentosIniciarCamara: number = 0;
  maxIntentosIniciarCamara: number = 10;

  // Speech Recognition
  recognition: any = null;
  reconocimientoDisponible: boolean = false;
  escuchandoAhora: boolean = false;
  transcripcion: string = '';
  timeoutEscucha: any = null;
  
  // Feedback
  intentoActual: number = 0;
  maxIntentos: number = 3;
  mostrarFeedback: boolean = false;
  feedbackTipo: 'correcto' | 'incorrecto' | '' = '';
  feedbackMensaje: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    console.log('🎮 Componente iniciado');
    this.verificarReconocimientoVoz();
    this.mostrarSonido();
  }

  ngAfterViewInit(): void {
    console.log('👁️ Vista lista - ngAfterViewInit');
    console.log('🔍 videoElement:', this.videoElement);
    console.log('🔍 canvasElement:', this.canvasElement);
    
    // Esperar a que Angular termine de renderizar
    setTimeout(() => {
      console.log('⏰ Timeout cumplido, iniciando cámara...');
      this.intentarIniciarCamara();
    }, 1500);
  }

  ngOnDestroy(): void {
    console.log('🔚 Componente destruyéndose');
    this.detenerCamara();
    this.detenerReconocimientoVoz();
    if (this.timeoutEscucha) {
      clearTimeout(this.timeoutEscucha);
    }
  }

  // ========================================
  // LÓGICA DEL JUEGO
  // ========================================

  mostrarSonido(): void {
    if (this.indiceActual < this.sonidos.length) {
      this.sonidoActual = this.sonidos[this.indiceActual];
      this.intentoActual = 0;
      this.transcripcion = '';
      this.camaraError = '';
      this.mostrarFeedback = false;
      
      console.log('🎵 Mostrando sonido:', this.sonidoActual.nombre);
      
      // No reiniciar cámara si ya está activa, solo si cambia de sonido
      if (!this.camaraActiva && this.indiceActual > 0) {
        setTimeout(() => {
          this.intentarIniciarCamara();
        }, 500);
      }
    } else {
      this.completarJuego();
    }
  }

  reproducirSonido(): void {
    if (this.sonidoActual) {
      this.hablar(this.sonidoActual.onomatopeya);
    }
  }

  iniciarDeteccion(): void {
    if (!this.sonidoActual) {
      console.error('❌ No hay sonido actual');
      return;
    }

    if (!this.reconocimientoDisponible) {
      this.feedbackTipo = 'incorrecto';
      this.feedbackMensaje = 'Reconocimiento de voz no disponible. Usa Chrome o Edge.';
      this.mostrarFeedback = true;
      this.hablar('El reconocimiento de voz no está disponible');
      setTimeout(() => {
        this.mostrarFeedback = false;
      }, 3000);
      return;
    }
    
    this.escuchandoAhora = true;
    this.transcripcion = '';
    this.mostrarFeedback = false;
    
    console.log('🎤 Iniciando reconocimiento de voz...');
    
    if (this.recognition) {
      try {
        this.recognition.start();
        
        this.timeoutEscucha = setTimeout(() => {
          if (this.escuchandoAhora) {
            console.log('⏱️ Timeout: No se detectó voz');
            this.detenerEscucha();
            this.feedbackTipo = 'incorrecto';
            this.feedbackMensaje = '¡No te escuché! Presiona el botón e intenta de nuevo';
            this.mostrarFeedback = true;
            this.hablar('No te escuché, intenta de nuevo más fuerte');
            setTimeout(() => {
              this.mostrarFeedback = false;
            }, 3000);
          }
        }, 8000);
      } catch (error) {
        console.error('❌ Error al iniciar reconocimiento:', error);
        this.detenerEscucha();
      }
    }
  }

  detenerEscucha(): void {
    this.escuchandoAhora = false;
    if (this.timeoutEscucha) {
      clearTimeout(this.timeoutEscucha);
      this.timeoutEscucha = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.log('Recognition ya estaba detenido');
      }
    }
  }

  verificarRespuesta(textoDetectado: string): void {
    if (!this.sonidoActual) return;

    const textoLimpio = textoDetectado.toLowerCase().trim();
    console.log('🎤 Detectado:', textoLimpio);
    console.log('🔍 Buscando en:', this.sonidoActual.palabrasClave);

    const coincide = this.sonidoActual.palabrasClave.some(palabra => {
      const palabraLimpia = palabra.toLowerCase();
      return textoLimpio.includes(palabraLimpia) || 
             palabraLimpia.includes(textoLimpio) ||
             this.similitudCadenas(textoLimpio, palabraLimpia) > 0.7;
    });

    if (coincide) {
      console.log('✅ ¡Coincidencia encontrada!');
      this.respuestaCorrecta();
    } else {
      console.log('❌ No hay coincidencia');
      this.respuestaIncorrecta();
    }
  }

  similitudCadenas(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.calcularDistanciaEdicion(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  calcularDistanciaEdicion(str1: string, str2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= str1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= str2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[str2.length] = lastValue;
    }
    return costs[str2.length];
  }

  respuestaCorrecta(): void {
    this.detenerEscucha();
    this.feedbackTipo = 'correcto';
    this.feedbackMensaje = '¡Excelente! ¡Lo hiciste perfecto!';
    this.mostrarFeedback = true;
    this.hablar('¡Muy bien! ¡Excelente sonido!');

    setTimeout(() => {
      this.mostrarFeedback = false;
      this.mostrarCelebracion = true;

      setTimeout(() => {
        this.mostrarCelebracion = false;
        this.indiceActual++;
        this.mostrarSonido();
      }, 2500);
    }, 2000);
  }

  respuestaIncorrecta(): void {
    this.intentoActual++;
    this.detenerEscucha();
    
    if (this.intentoActual >= this.maxIntentos) {
      this.feedbackTipo = 'incorrecto';
      this.feedbackMensaje = `¡No te preocupes! El sonido era: ${this.sonidoActual?.onomatopeya}`;
      this.mostrarFeedback = true;
      this.hablar(`No te preocupes. El sonido era ${this.sonidoActual?.onomatopeya}. Vamos al siguiente`);
      
      setTimeout(() => {
        this.mostrarFeedback = false;
        this.indiceActual++;
        this.mostrarSonido();
      }, 4000);
    } else {
      this.feedbackTipo = 'incorrecto';
      this.feedbackMensaje = `¡Casi! Escucha bien e intenta de nuevo (${this.intentoActual}/${this.maxIntentos})`;
      this.mostrarFeedback = true;
      this.hablar('Casi casi. Escucha de nuevo e intenta otra vez');
      
      setTimeout(() => {
        this.mostrarFeedback = false;
      }, 2500);
    }
  }

  saltarSonido(): void {
    this.detenerEscucha();
    this.mostrarFeedback = false;
    this.indiceActual++;
    this.mostrarSonido();
  }

  completarJuego(): void {
    this.juegoCompletado = true;
    this.detenerCamara();
    this.hablar('¡Felicitaciones! ¡Completaste todos los sonidos! ¡Eres increíble!');
  }

  reiniciarJuego(): void {
    this.indiceActual = 0;
    this.sonidoActual = null;
    this.mostrarCelebracion = false;
    this.juegoCompletado = false;
    this.mostrarFeedback = false;
    this.intentosIniciarCamara = 0;
    this.mostrarSonido();
    setTimeout(() => {
      this.intentarIniciarCamara();
    }, 500);
  }

  volverAlMenu(): void {
    this.detenerCamara();
    this.detenerReconocimientoVoz();
    this.router.navigate(['/juegos-terapeuticos']);
  }

  // ========================================
  // CÁMARA Y VIDEO - VERSIÓN CORREGIDA
  // ========================================

  intentarIniciarCamara(): void {
    this.intentosIniciarCamara++;
    console.log(`🔄 Intento ${this.intentosIniciarCamara}/${this.maxIntentosIniciarCamara} de iniciar cámara`);

    if (this.intentosIniciarCamara > this.maxIntentosIniciarCamara) {
      console.error('❌ Máximo de intentos alcanzado');
      this.camaraError = 'No se pudieron cargar los elementos de la cámara. Recarga la página.';
      return;
    }

    // Verificar que los ViewChild existan Y tengan nativeElement
    const videoExiste = this.videoElement && this.videoElement.nativeElement;
    const canvasExiste = this.canvasElement && this.canvasElement.nativeElement;

    console.log('🔍 Verificación de elementos:');
    console.log('  - videoElement existe:', !!this.videoElement);
    console.log('  - videoElement.nativeElement existe:', !!videoExiste);
    console.log('  - canvasElement existe:', !!this.canvasElement);
    console.log('  - canvasElement.nativeElement existe:', !!canvasExiste);

    if (!videoExiste || !canvasExiste) {
      console.log('⚠️ Elementos no disponibles, reintentando en 500ms...');
      setTimeout(() => this.intentarIniciarCamara(), 500);
      return;
    }

    // Si llegamos aquí, los elementos existen
    console.log('✅ Elementos disponibles, procediendo a iniciar cámara');
    this.iniciarCamara();
  }

  async iniciarCamara(): Promise<void> {
    console.log('📹 INICIANDO CÁMARA...');
    
    try {
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement.nativeElement;

      console.log('✅ Referencias obtenidas:', { video, canvas });

      // Solicitar acceso a la cámara
      console.log('📸 Solicitando acceso a getUserMedia...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('✅ Stream obtenido:', this.stream);

      // Asignar stream al video
      video.srcObject = this.stream;
      video.muted = true;
      video.playsInline = true;

      // Esperar a que el video esté listo
      video.onloadedmetadata = async () => {
        console.log('📹 Metadata cargada');
        console.log('📐 Video dimensions:', video.videoWidth, 'x', video.videoHeight);

        try {
          await video.play();
          console.log('▶️ Video reproduciendo');

          // Configurar canvas
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          console.log('🎨 Canvas configurado:', canvas.width, 'x', canvas.height);

          // CRÍTICO: Marcar como activa ANTES de iniciar renderizado
          this.camaraActiva = true;
          this.camaraError = '';

          console.log('✅ Cámara ACTIVA');

          // Iniciar loop de renderizado
          this.renderLoop();

        } catch (playError) {
          console.error('❌ Error al reproducir video:', playError);
          this.camaraError = 'No se pudo reproducir el video. Recarga la página.';
          this.camaraActiva = false;
        }
      };

      video.onerror = (e) => {
        console.error('❌ Error en video element:', e);
        this.camaraError = 'Error al cargar el video';
        this.camaraActiva = false;
      };

    } catch (error: any) {
      console.error('❌ Error al acceder a la cámara:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      this.camaraActiva = false;

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.camaraError = '🚫 Permiso denegado. Por favor, permite el acceso a la cámara.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.camaraError = '📹 No se encontró ninguna cámara.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        this.camaraError = '⚠️ La cámara está siendo usada por otra aplicación.';
      } else {
        this.camaraError = '❌ Error al iniciar la cámara. Recarga la página.';
      }
    }
  }

  renderLoop(): void {
    if (!this.camaraActiva) {
      console.log('🛑 No se inicia renderLoop: cámara no activa');
      return;
    }

    if (this.renderizando) {
      console.log('⚠️ RenderLoop ya está ejecutándose');
      return;
    }

    this.renderizando = true;
    console.log('🎬 Iniciando loop de renderizado');

    const render = () => {
      if (!this.camaraActiva) {
        console.log('🛑 Renderizado detenido: cámara inactiva');
        this.renderizando = false;
        return;
      }

      const video = this.videoElement?.nativeElement;
      const canvas = this.canvasElement?.nativeElement;

      if (!video || !canvas) {
        console.log('⚠️ Video o canvas no disponibles en render');
        this.renderizando = false;
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('❌ No se pudo obtener contexto 2d');
        this.renderizando = false;
        return;
      }

      // Dibujar video en el canvas (espejo)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Aplicar filtro
      if (this.sonidoActual) {
        this.dibujarFiltro(ctx, canvas.width, canvas.height);
      }

      // Continuar el loop
      requestAnimationFrame(render);
    };

    render();
  }

  dibujarFiltro(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.sonidoActual) return;

    const centerX = width / 2;
    const centerY = height / 2.3;
    const time = Date.now() / 1000;

    // ===== RESPLANDOR EXTERIOR ANIMADO =====
    const outerGlow = ctx.createRadialGradient(centerX, centerY, 140, centerX, centerY, 200);
    outerGlow.addColorStop(0, 'rgba(102, 126, 234, 0.25)');
    outerGlow.addColorStop(0.5, 'rgba(118, 75, 162, 0.15)');
    outerGlow.addColorStop(1, 'rgba(240, 147, 251, 0.05)');
    
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 200, 0, Math.PI * 2);
    ctx.fill();

    // ===== CÍRCULO DE FONDO PRINCIPAL ANIMADO =====
    const mainBgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 160);
    mainBgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    mainBgGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
    mainBgGradient.addColorStop(0.7, 'rgba(102, 126, 234, 0.4)');
    mainBgGradient.addColorStop(1, 'rgba(118, 75, 162, 0.3)');
    
    ctx.fillStyle = mainBgGradient;
    ctx.beginPath();
    const mainPulse = Math.sin(time * 2) * 12 + 150;
    ctx.arc(centerX, centerY, mainPulse, 0, Math.PI * 2);
    ctx.fill();

    // ===== ANILLO EXTERIOR DOBLE GIRATORIO =====
    // Anillo externo
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.6)';
    ctx.lineWidth = 6;
    ctx.shadowColor = 'rgba(102, 126, 234, 0.5)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 155, 0, Math.PI * 2);
    ctx.stroke();
    
    // Anillo medio
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 145, 0, Math.PI * 2);
    ctx.stroke();
    
    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // ===== PARTÍCULAS ORBITANDO (más cantidad y más lindas) =====
    for (let i = 0; i < 12; i++) {
      const angle = (time * 0.5 + i * (Math.PI * 2 / 12));
      const distance = 135 + Math.sin(time * 2 + i) * 15;
      const px = centerX + Math.cos(angle) * distance;
      const py = centerY + Math.sin(angle) * distance;
      
      // Partícula con gradiente
      const size = 4 + Math.sin(time * 3 + i) * 2;
      const particleGradient = ctx.createRadialGradient(px, py, 0, px, py, size * 2);
      particleGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      particleGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.8)');
      particleGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      
      ctx.fillStyle = particleGradient;
      ctx.beginPath();
      ctx.arc(px, py, size * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Núcleo blanco brillante
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // ===== ESTRELLAS DECORATIVAS =====
    for (let i = 0; i < 8; i++) {
      const angle = (time * 0.8 + i * (Math.PI * 2 / 8));
      const distance = 165 + Math.sin(time * 1.5 + i) * 10;
      const sx = centerX + Math.cos(angle) * distance;
      const sy = centerY + Math.sin(angle) * distance;
      
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle + time);
      
      ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
      ctx.shadowBlur = 8;
      
      // Dibujar estrella
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const starAngle = (j * 4 * Math.PI) / 5;
        const starRadius = j % 2 === 0 ? 6 : 3;
        const starX = Math.cos(starAngle) * starRadius;
        const starY = Math.sin(starAngle) * starRadius;
        if (j === 0) {
          ctx.moveTo(starX, starY);
        } else {
          ctx.lineTo(starX, starY);
        }
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }
    
    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // ===== CÍRCULO BLANCO PRINCIPAL CON GRADIENTE MEJORADO =====
    const whiteGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 135);
    whiteGradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    whiteGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.92)');
    whiteGradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.8)');
    whiteGradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
    
    ctx.fillStyle = whiteGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 130, 0, Math.PI * 2);
    ctx.fill();

    // ===== BORDE DEL CÍRCULO PRINCIPAL (doble borde) =====
    // Borde exterior
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.8)';
    ctx.lineWidth = 7;
    ctx.shadowColor = 'rgba(102, 126, 234, 0.6)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 130, 0, Math.PI * 2);
    ctx.stroke();
    
    // Borde interior
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 125, 0, Math.PI * 2);
    ctx.stroke();
    
    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // ===== EMOJI DEL ANIMAL CON SOMBRA Y ANIMACIÓN MEJORADA =====
    ctx.font = 'bold 140px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Sombra externa profunda
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    
    // Animación de escala y rotación suave
    const scale = 1 + Math.sin(time * 2.5) * 0.06;
    const rotation = Math.sin(time * 1.5) * 0.05;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.fillText(this.sonidoActual.imagen, 0, 0);
    ctx.restore();
    
    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // ===== BRILLO SUPERIOR MEJORADO (múltiples capas) =====
    // Brillo principal
    const mainHighlight = ctx.createRadialGradient(centerX - 35, centerY - 45, 0, centerX - 35, centerY - 45, 60);
    mainHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    mainHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    mainHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = mainHighlight;
    ctx.beginPath();
    ctx.arc(centerX - 35, centerY - 45, 60, 0, Math.PI * 2);
    ctx.fill();
    
    // Brillo secundario
    const secondHighlight = ctx.createRadialGradient(centerX + 30, centerY - 35, 0, centerX + 30, centerY - 35, 35);
    secondHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    secondHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = secondHighlight;
    ctx.beginPath();
    ctx.arc(centerX + 30, centerY - 35, 35, 0, Math.PI * 2);
    ctx.fill();

    // ===== BADGE CON NOMBRE DEL ANIMAL (mejorado con gradiente) =====
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const textY = centerY + 95;
    const textWidth = ctx.measureText(this.sonidoActual.nombre).width;
    const badgePadding = 25;
    const badgeWidth = textWidth + badgePadding * 2;
    const badgeHeight = 52;
    const badgeX = centerX - badgeWidth / 2;
    
    // Sombra del badge
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    
    // Fondo del badge con gradiente
    const badgeGradient = ctx.createLinearGradient(badgeX, textY, badgeX + badgeWidth, textY + badgeHeight);
    badgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    badgeGradient.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
    
    ctx.fillStyle = badgeGradient;
    ctx.beginPath();
    ctx.roundRect(badgeX, textY - 6, badgeWidth, badgeHeight, 30);
    ctx.fill();
    
    // Borde del badge con gradiente
    const badgeBorderGradient = ctx.createLinearGradient(badgeX, textY, badgeX + badgeWidth, textY + badgeHeight);
    badgeBorderGradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
    badgeBorderGradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.8)');
    badgeBorderGradient.addColorStop(1, 'rgba(240, 147, 251, 0.8)');
    
    ctx.strokeStyle = badgeBorderGradient;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(badgeX, textY - 6, badgeWidth, badgeHeight, 30);
    ctx.stroke();
    
    // Resetear sombra antes del texto
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Texto del nombre con gradiente
    const textGradient = ctx.createLinearGradient(
      centerX - textWidth/2, 
      textY, 
      centerX + textWidth/2, 
      textY + badgeHeight
    );
    textGradient.addColorStop(0, '#667eea');
    textGradient.addColorStop(0.5, '#764ba2');
    textGradient.addColorStop(1, '#667eea');
    
    // Sombra del texto
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = textGradient;
    ctx.fillText(this.sonidoActual.nombre, centerX, textY + 8);
    
    // Resetear sombra final
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  detenerCamara(): void {
    console.log('🛑 Deteniendo cámara...');
    this.camaraActiva = false;
    this.renderizando = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track detenido');
      });
      this.stream = null;
    }
  }

  // ========================================
  // RECONOCIMIENTO DE VOZ
  // ========================================

  verificarReconocimientoVoz(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('⚠️ Speech Recognition no soportado');
      this.reconocimientoDisponible = false;
      return;
    }

    console.log('✅ Speech Recognition disponible');
    this.reconocimientoDisponible = true;
    this.inicializarReconocimientoVoz();
  }

  inicializarReconocimientoVoz(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 10;

    this.recognition.onstart = () => {
      console.log('🎤 Reconocimiento iniciado');
    };

    this.recognition.onresult = (event: any) => {
      if (this.timeoutEscucha) {
        clearTimeout(this.timeoutEscucha);
        this.timeoutEscucha = null;
      }

      const results = event.results[event.results.length - 1];
      const alternatives: string[] = [];
      
      for (let i = 0; i < results.length; i++) {
        alternatives.push(results[i].transcript);
      }

      const transcript = results[0].transcript;
      this.transcripcion = transcript;
      console.log('🎤 Transcripción:', transcript);

      if (results.isFinal) {
        let coincidenciaEncontrada = false;
        for (const alt of alternatives) {
          if (!coincidenciaEncontrada) {
            const textoLimpio = alt.toLowerCase().trim();
            const coincide = this.sonidoActual?.palabrasClave.some(palabra => {
              const palabraLimpia = palabra.toLowerCase();
              return textoLimpio.includes(palabraLimpia) || 
                     palabraLimpia.includes(textoLimpio) ||
                     this.similitudCadenas(textoLimpio, palabraLimpia) > 0.65;
            });
            
            if (coincide) {
              console.log('✅ Coincidencia en alternativa:', alt);
              coincidenciaEncontrada = true;
              this.verificarRespuesta(alt);
              break;
            }
          }
        }
        
        if (!coincidenciaEncontrada) {
          this.verificarRespuesta(transcript);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('❌ Error en reconocimiento:', event.error);
      this.detenerEscucha();
      
      if (event.error === 'no-speech') {
        this.feedbackTipo = 'incorrecto';
        this.feedbackMensaje = '¡No te escuché! Intenta hablar más fuerte';
        this.mostrarFeedback = true;
        this.hablar('No te escuché');
        setTimeout(() => {
          this.mostrarFeedback = false;
        }, 2500);
      } else if (event.error === 'not-allowed') {
        this.feedbackTipo = 'incorrecto';
        this.feedbackMensaje = 'Permiso de micrófono denegado';
        this.mostrarFeedback = true;
      }
    };

    this.recognition.onend = () => {
      console.log('🎤 Reconocimiento finalizado');
      this.escuchandoAhora = false;
      if (this.timeoutEscucha) {
        clearTimeout(this.timeoutEscucha);
        this.timeoutEscucha = null;
      }
    };
  }

  detenerReconocimientoVoz(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.log('Recognition ya estaba detenido');
      }
      this.recognition = null;
    }
  }

  // ========================================
  // UTILIDADES
  // ========================================

  private hablar(texto: string): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.rate = 0.85;
      utterance.pitch = 1.3;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  }

  get progreso(): number {
    return (this.indiceActual / this.sonidos.length) * 100;
  }

  get sonidosRestantes(): number {
    return this.sonidos.length - this.indiceActual;
  }
}