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
      palabrasClave: ['guau', 'wau', 'wow', 'gua']
    },
    {
      id: 2,
      nombre: 'Gato',
      onomatopeya: '¡MIAU MIAU!',
      imagen: '🐱',
      audio: 'miau',
      filtro: 'gato',
      palabrasClave: ['miau', 'mia', 'meow']
    },
    {
      id: 3,
      nombre: 'Vaca',
      onomatopeya: '¡MUUU!',
      imagen: '🐄',
      audio: 'muuu',
      filtro: 'vaca',
      palabrasClave: ['mu', 'muu', 'muuu', 'moo']
    },
    {
      id: 4,
      nombre: 'Oveja',
      onomatopeya: '¡BEEE!',
      imagen: '🐑',
      audio: 'beee',
      filtro: 'oveja',
      palabrasClave: ['be', 'bee', 'beee', 'baa']
    },
    {
      id: 5,
      nombre: 'Pato',
      onomatopeya: '¡CUAC CUAC!',
      imagen: '🦆',
      audio: 'cuac',
      filtro: 'pato',
      palabrasClave: ['cuac', 'cuak', 'quack', 'cua']
    },
    {
      id: 6,
      nombre: 'Cerdo',
      onomatopeya: '¡OINC OINC!',
      imagen: '🐷',
      audio: 'oinc',
      filtro: 'cerdo',
      palabrasClave: ['oinc', 'oink', 'oin']
    },
    {
      id: 7,
      nombre: 'León',
      onomatopeya: '¡ROAAR!',
      imagen: '🦁',
      audio: 'roar',
      filtro: 'leon',
      palabrasClave: ['roar', 'roaar', 'rugido', 'grrr', 'rawr']
    },
    {
      id: 8,
      nombre: 'Abeja',
      onomatopeya: '¡BZZZ!',
      imagen: '🐝',
      audio: 'bzzz',
      filtro: 'abeja',
      palabrasClave: ['bzz', 'bzzz', 'buzz', 'zzzz']
    },
    {
      id: 9,
      nombre: 'Campana',
      onomatopeya: '¡DING DONG!',
      imagen: '🔔',
      audio: 'ding',
      filtro: 'campana',
      palabrasClave: ['ding', 'dong', 'din', 'tan']
    },
    {
      id: 10,
      nombre: 'Auto',
      onomatopeya: '¡BIP BIP!',
      imagen: '🚗',
      audio: 'bip',
      filtro: 'auto',
      palabrasClave: ['bip', 'beep', 'pip']
    },
    {
      id: 11,
      nombre: 'Reloj',
      onomatopeya: '¡TIC TAC!',
      imagen: '⏰',
      audio: 'tic',
      filtro: 'reloj',
      palabrasClave: ['tic', 'tac', 'tick', 'tock']
    },
    {
      id: 12,
      nombre: 'Aplausos',
      onomatopeya: '¡CLAP CLAP!',
      imagen: '👏',
      audio: 'clap',
      filtro: 'aplausos',
      palabrasClave: ['clap', 'aplausos', 'palm']
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
  videoWidth: number = 640;
  videoHeight: number = 480;

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
    this.verificarReconocimientoVoz();
    this.mostrarSonido();
  }

  ngAfterViewInit(): void {
    // Iniciar cámara después de que la vista esté lista
    setTimeout(() => {
      if (this.sonidoActual) {
        this.iniciarCamara();
      }
    }, 500);
  }

  ngOnDestroy(): void {
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
      
      // Reiniciar cámara si estaba activa
      if (this.camaraActiva) {
        this.detenerCamara();
        setTimeout(() => {
          this.iniciarCamara();
        }, 300);
      } else {
        this.iniciarCamara();
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
      console.error('No hay sonido actual');
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
        
        // Timeout de seguridad: si no detecta nada en 5 segundos, detener
        this.timeoutEscucha = setTimeout(() => {
          if (this.escuchandoAhora) {
            console.log('⏱️ Timeout: No se detectó voz');
            this.detenerEscucha();
            this.feedbackTipo = 'incorrecto';
            this.feedbackMensaje = '¡No te escuché! Intenta hablar más fuerte';
            this.mostrarFeedback = true;
            this.hablar('No te escuché, intenta de nuevo');
            setTimeout(() => {
              this.mostrarFeedback = false;
            }, 2000);
          }
        }, 5000);
      } catch (error) {
        console.error('Error al iniciar reconocimiento:', error);
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

    // Verificar si alguna palabra clave coincide
    const coincide = this.sonidoActual.palabrasClave.some(palabra => 
      textoLimpio.includes(palabra.toLowerCase())
    );

    if (coincide) {
      this.respuestaCorrecta();
    } else {
      this.respuestaIncorrecta();
    }
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
      }, 2000);
    }, 2000);
  }

  respuestaIncorrecta(): void {
    this.intentoActual++;
    this.detenerEscucha();
    
    if (this.intentoActual >= this.maxIntentos) {
      this.feedbackTipo = 'incorrecto';
      this.feedbackMensaje = `¡No te preocupes! El sonido es: ${this.sonidoActual?.onomatopeya}`;
      this.mostrarFeedback = true;
      this.hablar('No te preocupes, vamos al siguiente');
      
      setTimeout(() => {
        this.mostrarFeedback = false;
        this.indiceActual++;
        this.mostrarSonido();
      }, 3000);
    } else {
      this.feedbackTipo = 'incorrecto';
      this.feedbackMensaje = `¡Casi! Intenta de nuevo (${this.intentoActual}/${this.maxIntentos})`;
      this.mostrarFeedback = true;
      this.hablar('Intenta de nuevo');
      
      setTimeout(() => {
        this.mostrarFeedback = false;
      }, 2000);
    }
  }

  saltarSonido(): void {
    this.detenerEscucha();
    this.indiceActual++;
    this.mostrarSonido();
  }

  completarJuego(): void {
    this.juegoCompletado = true;
    this.detenerCamara();
    this.hablar('¡Felicitaciones! ¡Completaste todos los sonidos!');
  }

  reiniciarJuego(): void {
    this.indiceActual = 0;
    this.sonidoActual = null;
    this.mostrarCelebracion = false;
    this.juegoCompletado = false;
    this.mostrarSonido();
  }

  volverAlMenu(): void {
    this.detenerCamara();
    this.detenerReconocimientoVoz();
    this.router.navigate(['/juegos-terapeuticos']);
  }

  // ========================================
  // CÁMARA Y VIDEO
  // ========================================

  async iniciarCamara(): Promise<void> {
    try {
      console.log('📹 Iniciando cámara...');
      this.camaraError = '';
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: this.videoWidth }, 
          height: { ideal: this.videoHeight },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('✅ Cámara obtenida');

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        
        this.videoElement.nativeElement.onloadedmetadata = () => {
          console.log('📹 Metadata cargada, reproduciendo...');
          this.videoElement.nativeElement.play();
          this.camaraActiva = true;
          
          // Iniciar renderizado después de que el video esté listo
          setTimeout(() => {
            this.renderizarFiltro();
          }, 500);
        };
      }
    } catch (error: any) {
      console.error('❌ Error al acceder a la cámara:', error);
      this.camaraActiva = false;
      
      if (error.name === 'NotAllowedError') {
        this.camaraError = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara.';
      } else if (error.name === 'NotFoundError') {
        this.camaraError = 'No se encontró ninguna cámara en el dispositivo.';
      } else {
        this.camaraError = 'Error al iniciar la cámara. Intenta recargar la página.';
      }
    }
  }

  detenerCamara(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track de cámara detenido');
      });
      this.stream = null;
      this.camaraActiva = false;
    }
  }

  renderizarFiltro(): void {
    if (!this.camaraActiva || !this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      console.log('⚠️ No se puede renderizar: cámara no activa o elementos no disponibles');
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('❌ No se pudo obtener contexto del canvas');
      return;
    }

    // Ajustar tamaño del canvas al video
    canvas.width = video.videoWidth || this.videoWidth;
    canvas.height = video.videoHeight || this.videoHeight;

    console.log(`🎨 Canvas configurado: ${canvas.width}x${canvas.height}`);

    const renderFrame = () => {
      if (!this.camaraActiva) {
        console.log('🛑 Renderizado detenido');
        return;
      }

      try {
        // Dibujar video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Aplicar filtro según el animal
        if (this.sonidoActual) {
          this.aplicarFiltro(ctx, canvas.width, canvas.height);
        }

        requestAnimationFrame(renderFrame);
      } catch (error) {
        console.error('Error al renderizar frame:', error);
      }
    };

    renderFrame();
  }

  aplicarFiltro(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.sonidoActual) return;

    const centerX = width / 2;
    const centerY = height / 3;

    // Configurar estilo del emoji
    ctx.font = 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Sombra para el emoji
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    
    // Dibujar emoji del animal
    ctx.fillText(this.sonidoActual.imagen, centerX, centerY);
    
    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // ========================================
  // RECONOCIMIENTO DE VOZ
  // ========================================

  verificarReconocimientoVoz(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('⚠️ Speech Recognition no soportado en este navegador');
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
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 5;

    this.recognition.onstart = () => {
      console.log('🎤 Reconocimiento iniciado');
    };

    this.recognition.onresult = (event: any) => {
      if (this.timeoutEscucha) {
        clearTimeout(this.timeoutEscucha);
        this.timeoutEscucha = null;
      }

      const results = event.results[0];
      const transcript = results[0].transcript;
      this.transcripcion = transcript;
      console.log('🎤 Transcripción:', transcript);
      this.verificarRespuesta(transcript);
    };

    this.recognition.onerror = (event: any) => {
      console.error('❌ Error en reconocimiento de voz:', event.error);
      this.detenerEscucha();
      
      if (event.error === 'no-speech') {
        this.feedbackTipo = 'incorrecto';
        this.feedbackMensaje = '¡No te escuché! Intenta hablar más fuerte';
        this.mostrarFeedback = true;
        this.hablar('No te escuché');
        setTimeout(() => {
          this.mostrarFeedback = false;
        }, 2000);
      } else if (event.error === 'aborted') {
        console.log('Reconocimiento abortado');
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
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
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