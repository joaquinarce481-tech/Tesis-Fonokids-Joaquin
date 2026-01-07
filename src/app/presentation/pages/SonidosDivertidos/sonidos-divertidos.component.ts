import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HistorialActividadesService } from '../../services/historial-actividades.service';

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
  sonidoTTS: string;
  imagen: string;
  audio: string;
  archivoAudio: string; // Ruta al archivo de audio real
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
export class SonidosDivertidosComponent implements OnInit, OnDestroy {

  // ========================================
  // VISTA ACTUAL
  // ========================================
  vistaActual: 'instrucciones' | 'jugando' = 'instrucciones';

  // Audio player para sonidos reales
  audioPlayer: HTMLAudioElement | null = null;

  sonidos: Sonido[] = [
    {
      id: 1,
      nombre: 'Perro',
      onomatopeya: '¡GUAU GUAU!',
      sonidoTTS: 'guau, guau',
      imagen: '🐕',
      audio: 'guau',
      archivoAudio: 'assets/sounds/perro.mp3',
      filtro: 'perro',
      palabrasClave: ['guau', 'wau', 'wow', 'gua', 'guaú', 'wauf', 'gau', 'gua gua', 'agua', 'aua', 'guaú guaú']
    },
    {
      id: 2,
      nombre: 'Gato',
      onomatopeya: '¡MIAU MIAU!',
      sonidoTTS: 'miau, miau',
      imagen: '🐱',
      audio: 'miau',
      archivoAudio: 'assets/sounds/gato.mp3',
      filtro: 'gato',
      palabrasClave: ['miau', 'mia', 'meow', 'miaú', 'mia mia', 'mia u', 'ya', 'miau miau']
    },
    {
      id: 3,
      nombre: 'Vaca',
      onomatopeya: '¡MUUU!',
      sonidoTTS: 'mu, muuu',
      imagen: '🐄',
      audio: 'muuu',
      archivoAudio: 'assets/sounds/vaca.mp3',
      filtro: 'vaca',
      palabrasClave: ['mu', 'muu', 'muuu', 'moo', 'muuuu', 'muy', 'mu mu', 'más', 'mú', 'hum', 'um', 'mus', 'muñ', 'mur', 'bus', 'mm', 'mmm', 'mmmm', 'boom', 'bum', 'bu', 'mo', 'mou', 'move', 'moon']
    },
    {
      id: 4,
      nombre: 'Oveja',
      onomatopeya: '¡BEEE!',
      sonidoTTS: 'be, beee',
      imagen: '🐑',
      audio: 'beee',
      archivoAudio: 'assets/sounds/oveja.mp3',
      filtro: 'oveja',
      palabrasClave: ['be', 'bee', 'beee', 'baa', 'beeee', 've', 'de', 'vez', 'ved', 'ven', 'vi', 'me', 'mee', 'bien', 'ver']
    },
    {
      id: 5,
      nombre: 'Pato',
      onomatopeya: '¡CUAC CUAC!',
      sonidoTTS: 'cuac, cuac',
      imagen: '🦆',
      audio: 'cuac',
      archivoAudio: 'assets/sounds/pato.mp3',
      filtro: 'pato',
      palabrasClave: ['cuac', 'cuak', 'quack', 'cua', 'cuac cuac', 'cuá', 'crack', 'guac', 'cuan', 'cual', 'ca', 'cac', 'pack', 'quac']
    },
    {
      id: 6,
      nombre: 'Cerdo',
      onomatopeya: '¡OINC OINC!',
      sonidoTTS: 'oinc, oinc',
      imagen: '🐷',
      audio: 'oinc',
      archivoAudio: 'assets/sounds/cerdo.mp3',
      filtro: 'cerdo',
      palabrasClave: ['oinc', 'oink', 'oin', 'oinc oinc', 'oing', 'oí', 'oing oing', 'oink oink', 'oing', 'coin', 'join', 'going']
    },
    {
      id: 7,
      nombre: 'León',
      onomatopeya: '¡ROAAR!',
      sonidoTTS: 'roar, rugido',
      imagen: '🦁',
      audio: 'roar',
      archivoAudio: 'assets/sounds/leon.mp3',
      filtro: 'leon',
      palabrasClave: ['roar', 'roaar', 'rugido', 'grrr', 'rawr', 'ruar', 'grr', 'grrr', 'rrr', 'roa', 'ra', 'rar', 'ar', 'arr', 'raw', 'road']
    },
    {
      id: 8,
      nombre: 'Campana',
      onomatopeya: '¡DING DONG!',
      sonidoTTS: 'din, don',
      imagen: '🔔',
      audio: 'ding',
      archivoAudio: 'assets/sounds/campana.mp3',
      filtro: 'campana',
      palabrasClave: ['ding', 'dong', 'din', 'tan', 'ding dong', 'din don', 'rin', 'tin', 'ring', 'din din', 'don', 'dan', 'ten']
    },
    {
      id: 9,
      nombre: 'Auto',
      onomatopeya: '¡BIP BIP!',
      sonidoTTS: 'bip, bip',
      imagen: '🚗',
      audio: 'bip',
      archivoAudio: 'assets/sounds/auto.mp3',
      filtro: 'auto',
      palabrasClave: ['bip', 'beep', 'pip', 'bip bip', 'pi pi', 'bis', 'pis', 'pi', 'bib', 'bib bib', 'vip', 'bit', 'big']
    },
    {
      id: 10,
      nombre: 'Reloj',
      onomatopeya: '¡TIC TAC!',
      sonidoTTS: 'tic, tac',
      imagen: '⏰',
      audio: 'tic',
      archivoAudio: 'assets/sounds/reloj.mp3',
      filtro: 'reloj',
      palabrasClave: ['tic', 'tac', 'tick', 'tock', 'tic tac', 'ti ta', 'tictac', 'di', 'ti', 'tic tic', 'tac tac', 'dic', 'tak']
    },
    {
      id: 11,
      nombre: 'Aplausos',
      onomatopeya: '¡CLAP CLAP!',
      sonidoTTS: 'clap, clap',
      imagen: '👏',
      audio: 'clap',
      archivoAudio: 'assets/sounds/aplausos.mp3',
      filtro: 'aplausos',
      palabrasClave: ['clap', 'aplausos', 'palm', 'aplauso', 'clap clap', 'clac', 'plap', 'clac clac', 'plap plap', 'cap', 'plaf']
    }
  ];

  sonidoActual: Sonido | null = null;
  indiceActual: number = 0;
  mostrarCelebracion: boolean = false;
  juegoCompletado: boolean = false;

  // Speech Recognition
  recognition: any = null;
  reconocimientoDisponible: boolean = false;
  escuchandoAhora: boolean = false;
  reconocimientoEnProceso: boolean = false;
  transcripcion: string = '';
  timeoutEscucha: any = null;
  yaVerificado: boolean = false;
  huboResultado: boolean = false;
  
  // Feedback
  intentoActual: number = 0;
  maxIntentos: number = 3;
  mostrarFeedback: boolean = false;
  feedbackTipo: 'correcto' | 'incorrecto' | '' = '';
  feedbackMensaje: string = '';

  // Estado del audio
  reproduciendo: boolean = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private historialService: HistorialActividadesService
  ) {}

  ngOnInit(): void {
    console.log('🎮 Sonidos Divertidos iniciado');
    
    window.scrollTo(0, 0);
    
    this.verificarReconocimientoVoz();
  }

  ngOnDestroy(): void {
    console.log('🔚 Componente destruyéndose');
    this.detenerReconocimientoVoz();
    this.detenerAudio();
    if (this.timeoutEscucha) {
      clearTimeout(this.timeoutEscucha);
    }
  }

  // ========================================
  // MÉTODO PARA INICIAR EL JUEGO
  // ========================================
  comenzarJuego(): void {
    console.log('🎮 Comenzando juego...');
    this.vistaActual = 'jugando';
    
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    
    this.mostrarSonido();
  }

  // ========================================
  // LÓGICA DEL JUEGO
  // ========================================

  mostrarSonido(): void {
    console.log('🎵 mostrarSonido() - Índice actual:', this.indiceActual, '/ Total:', this.sonidos.length);
    
    if (this.indiceActual < this.sonidos.length) {
      this.sonidoActual = this.sonidos[this.indiceActual];
      this.intentoActual = 0;
      this.transcripcion = '';
      this.mostrarFeedback = false;
      this.feedbackTipo = '';
      this.feedbackMensaje = '';
      this.yaVerificado = false;
      this.huboResultado = false;
      
      console.log('✅ Mostrando sonido:', this.sonidoActual.nombre, '(ID:', this.sonidoActual.id + ')');
      console.log('🎨 Emoji:', this.sonidoActual.imagen);
      console.log('🔊 Onomatopeya:', this.sonidoActual.onomatopeya);
      console.log('🎵 Archivo de audio:', this.sonidoActual.archivoAudio);
    } else {
      console.log('🏁 Todos los sonidos completados!');
      this.completarJuego();
    }
  }

  // ========================================
  // REPRODUCIR SONIDO REAL DEL ANIMAL
  // ========================================
  reproducirSonido(): void {
    if (!this.sonidoActual) return;
    
    if (this.reproduciendo) {
      console.log('⚠️ Ya se está reproduciendo un sonido');
      return;
    }

    console.log('🔊 Reproduciendo sonido real:', this.sonidoActual.archivoAudio);
    
    // Detener cualquier audio anterior
    this.detenerAudio();
    
    // Crear nuevo reproductor de audio
    this.audioPlayer = new Audio(this.sonidoActual.archivoAudio);
    this.reproduciendo = true;
    
    this.audioPlayer.onplay = () => {
      console.log('▶️ Audio iniciado');
      this.ngZone.run(() => {
        this.reproduciendo = true;
        this.cdr.detectChanges();
      });
    };
    
    this.audioPlayer.onended = () => {
      console.log('⏹️ Audio finalizado');
      this.ngZone.run(() => {
        this.reproduciendo = false;
        this.cdr.detectChanges();
      });
    };
    
    this.audioPlayer.onerror = (error) => {
      console.error('❌ Error al reproducir audio:', error);
      console.log('🔄 Intentando con TTS como fallback...');
      this.ngZone.run(() => {
        this.reproduciendo = false;
        // Fallback a TTS si el archivo no existe
        this.hablar(this.sonidoActual?.sonidoTTS || '');
        this.cdr.detectChanges();
      });
    };
    
    // Reproducir el audio
    this.audioPlayer.play().catch(error => {
      console.error('❌ Error en play():', error);
      this.reproduciendo = false;
      // Fallback a TTS
      this.hablar(this.sonidoActual?.sonidoTTS || '');
    });
  }

  detenerAudio(): void {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.audioPlayer = null;
    }
    this.reproduciendo = false;
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

    if (this.reconocimientoEnProceso || this.escuchandoAhora) {
      console.log('⚠️ Ya hay un reconocimiento en proceso');
      return;
    }
    
    // Detener audio si está reproduciendo
    this.detenerAudio();
    
    this.reconocimientoEnProceso = true;
    this.yaVerificado = false;
    this.huboResultado = false;
    
    this.detenerEscucha();
    
    setTimeout(() => {
      this.escuchandoAhora = true;
      this.transcripcion = '';
      this.mostrarFeedback = false;
      
      console.log('🎤 Iniciando reconocimiento de voz...');
      console.log('🎤 Sonido esperado:', this.sonidoActual?.nombre, '-', this.sonidoActual?.onomatopeya);
      
      if (this.recognition) {
        try {
          this.recognition.start();
          console.log('🎤 Recognition.start() ejecutado');
          
          this.timeoutEscucha = setTimeout(() => {
            if (this.escuchandoAhora && !this.yaVerificado) {
              console.log('⏱️ Timeout: No se detectó voz');
              this.manejarSinResultado();
            }
          }, 8000);
        } catch (error: any) {
          console.error('❌ Error al iniciar reconocimiento:', error);
          this.reconocimientoEnProceso = false;
          this.detenerEscucha();
        }
      } else {
        this.reconocimientoEnProceso = false;
      }
    }, 300);
  }

  manejarSinResultado(): void {
    console.log('🔇 Manejando sin resultado de voz');
    this.detenerEscucha();
    
    this.ngZone.run(() => {
      this.feedbackTipo = 'incorrecto';
      this.feedbackMensaje = '¡No te escuché! Presiona el botón e intenta de nuevo';
      this.mostrarFeedback = true;
      this.cdr.detectChanges();
    });
    
    this.hablar('No te escuché, intenta de nuevo más fuerte');
    
    setTimeout(() => {
      this.ngZone.run(() => {
        this.mostrarFeedback = false;
        this.cdr.detectChanges();
      });
    }, 3000);
  }

  detenerEscucha(): void {
    console.log('🛑 Deteniendo escucha...');
    this.escuchandoAhora = false;
    this.reconocimientoEnProceso = false;
    
    if (this.timeoutEscucha) {
      clearTimeout(this.timeoutEscucha);
      this.timeoutEscucha = null;
    }
    
    if (this.recognition) {
      try {
        this.recognition.abort();
        console.log('🛑 Recognition abortado');
      } catch (error) {
        console.log('⚠️ Recognition ya estaba detenido');
      }
    }
  }

  verificarRespuesta(textoDetectado: string): void {
    if (!this.sonidoActual) {
      console.error('❌ No hay sonido actual para verificar');
      return;
    }

    if (this.yaVerificado) {
      console.log('⚠️ Ya se verificó este resultado, ignorando...');
      return;
    }

    const textoLimpio = textoDetectado.toLowerCase().trim();
    console.log('🎤 Texto detectado:', textoDetectado);
    console.log('🧹 Texto limpio:', textoLimpio);
    console.log('🔍 Buscando en palabras clave:', this.sonidoActual.palabrasClave);
    console.log('🐮 Sonido actual:', this.sonidoActual.nombre);

    const coincide = this.sonidoActual.palabrasClave.some(palabra => {
      const palabraLimpia = palabra.toLowerCase();
      const incluye = textoLimpio.includes(palabraLimpia) || palabraLimpia.includes(textoLimpio);
      const similitud = this.similitudCadenas(textoLimpio, palabraLimpia);
      
      const esCoincidencia = incluye || similitud > 0.4;
      
      console.log(`  - Comparando con "${palabra}": incluye=${incluye}, similitud=${similitud.toFixed(2)}, coincide=${esCoincidencia}`);
      
      return esCoincidencia;
    });

    if (coincide) {
      console.log('✅ ¡COINCIDENCIA ENCONTRADA!');
      this.yaVerificado = true;
      this.respuestaCorrecta();
    } else {
      console.log('❌ No hay coincidencia - Texto detectado fue:', textoLimpio);
      this.yaVerificado = true;
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
    console.log('✅ Respuesta correcta!');
    this.detenerEscucha();
    
    this.ngZone.run(() => {
      this.feedbackTipo = 'correcto';
      this.feedbackMensaje = '¡Excelente! ¡Lo hiciste perfecto!';
      this.mostrarFeedback = true;
      console.log('💬 Mostrando feedback');
      this.cdr.detectChanges();
    });
    
    this.hablar('¡Muy bien! ¡Excelente sonido!');

    setTimeout(() => {
      this.ngZone.run(() => {
        this.mostrarFeedback = false;
        this.mostrarCelebracion = true;
        console.log('🎉 Mostrando celebración');
        this.cdr.detectChanges();
      });

      setTimeout(() => {
        this.ngZone.run(() => {
          console.log('➡️ Avanzando al siguiente sonido');
          this.mostrarCelebracion = false;
          this.indiceActual++;
          console.log('📍 Nuevo índice:', this.indiceActual);
          this.mostrarSonido();
          this.cdr.detectChanges();
        });
      }, 2500);
    }, 2000);
  }

  respuestaIncorrecta(): void {
    this.intentoActual++;
    this.detenerEscucha();
    
    if (this.intentoActual >= this.maxIntentos) {
      this.ngZone.run(() => {
        this.feedbackTipo = 'incorrecto';
        this.feedbackMensaje = `¡No te preocupes! El sonido era: ${this.sonidoActual?.onomatopeya}`;
        this.mostrarFeedback = true;
        this.cdr.detectChanges();
      });
      
      this.hablar(`No te preocupes. El sonido era ${this.sonidoActual?.sonidoTTS}. Vamos al siguiente`);
      
      setTimeout(() => {
        this.ngZone.run(() => {
          this.mostrarFeedback = false;
          this.indiceActual++;
          this.mostrarSonido();
          this.cdr.detectChanges();
        });
      }, 4000);
    } else {
      this.ngZone.run(() => {
        this.feedbackTipo = 'incorrecto';
        this.feedbackMensaje = `¡Casi! Escucha bien e intenta de nuevo (${this.intentoActual}/${this.maxIntentos})`;
        this.mostrarFeedback = true;
        this.cdr.detectChanges();
      });
      
      this.hablar('Casi casi. Escucha de nuevo e intenta otra vez');
      
      setTimeout(() => {
        this.ngZone.run(() => {
          this.mostrarFeedback = false;
          this.cdr.detectChanges();
        });
      }, 2500);
    }
  }

  saltarSonido(): void {
    this.detenerEscucha();
    this.detenerAudio();
    this.mostrarFeedback = false;
    this.indiceActual++;
    this.mostrarSonido();
  }

  completarJuego(): void {
    this.juegoCompletado = true;
    
    this.historialService.registrarJuego('Sonidos Divertidos').subscribe({
      next: () => console.log('✅ Sonidos Divertidos registrado en historial'),
      error: (error: any) => console.error('❌ Error registrando juego:', error)
    });
    
    this.hablar('¡Felicitaciones! ¡Completaste todos los sonidos! ¡Eres increíble!');
  }

  reiniciarJuego(): void {
    this.indiceActual = 0;
    this.sonidoActual = null;
    this.mostrarCelebracion = false;
    this.juegoCompletado = false;
    this.mostrarFeedback = false;
    this.vistaActual = 'jugando';
    this.yaVerificado = false;
    this.huboResultado = false;
    
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    
    this.mostrarSonido();
  }

  volverAlMenu(): void {
    this.detenerReconocimientoVoz();
    this.detenerAudio();
    this.router.navigate(['/juegos-terapeuticos']);
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
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 10;

    this.recognition.onstart = () => {
      console.log('🎤 Reconocimiento iniciado');
      this.huboResultado = false;
    };

    this.recognition.onresult = (event: any) => {
      console.log('🎤 onresult disparado');
      this.huboResultado = true;
      
      if (this.yaVerificado) {
        console.log('⚠️ Ya verificado, ignorando onresult');
        return;
      }

      if (this.timeoutEscucha) {
        clearTimeout(this.timeoutEscucha);
        this.timeoutEscucha = null;
      }

      const todasAlternativas: string[] = [];
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j++) {
          todasAlternativas.push(result[j].transcript);
        }
      }

      const ultimoResultado = event.results[event.results.length - 1];
      const isFinal = ultimoResultado.isFinal;
      const transcript = ultimoResultado[0].transcript;
      
      this.ngZone.run(() => {
        this.transcripcion = transcript;
        this.cdr.detectChanges();
      });
      
      console.log('🎤 Transcripción principal:', transcript, '| Final:', isFinal);
      console.log('🎤 TODAS las alternativas:', todasAlternativas);

      if (!this.yaVerificado) {
        this.verificarConTodasAlternativas(todasAlternativas, isFinal);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('❌ Error en reconocimiento:', event.error);
      
      if (event.error === 'aborted') {
        console.log('ℹ️ Error "aborted" ignorado (es intencional)');
        return;
      }
      
      this.detenerEscucha();
      
      if (event.error === 'no-speech') {
        if (!this.yaVerificado) {
          this.manejarSinResultado();
        }
      } else if (event.error === 'not-allowed') {
        this.ngZone.run(() => {
          this.feedbackTipo = 'incorrecto';
          this.feedbackMensaje = 'Permiso de micrófono denegado';
          this.mostrarFeedback = true;
          this.cdr.detectChanges();
        });
      }
    };

    this.recognition.onend = () => {
      console.log('🎤 Reconocimiento finalizado | huboResultado:', this.huboResultado, '| yaVerificado:', this.yaVerificado);
      
      const estabaEscuchando = this.escuchandoAhora;
      this.escuchandoAhora = false;
      this.reconocimientoEnProceso = false;
      
      if (this.timeoutEscucha) {
        clearTimeout(this.timeoutEscucha);
        this.timeoutEscucha = null;
      }

      if (estabaEscuchando && !this.huboResultado && !this.yaVerificado) {
        console.log('⚠️ onend sin resultado - mostrando feedback');
        this.manejarSinResultado();
      }
      
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
    };
  }

  verificarConTodasAlternativas(alternativas: string[], esFinal: boolean): void {
    if (!this.sonidoActual) return;

    console.log('🔍 Verificando con todas las alternativas:', alternativas);

    let coincidioEnAlguna = false;
    
    for (const alternativa of alternativas) {
      const textoLimpio = alternativa.toLowerCase().trim();
      
      const coincide = this.sonidoActual.palabrasClave.some(palabra => {
        const palabraLimpia = palabra.toLowerCase();
        const incluye = textoLimpio.includes(palabraLimpia) || palabraLimpia.includes(textoLimpio);
        const similitud = this.similitudCadenas(textoLimpio, palabraLimpia);
        return incluye || similitud > 0.35;
      });

      if (coincide) {
        console.log('✅ ¡COINCIDENCIA en alternativa:', alternativa);
        coincidioEnAlguna = true;
        break;
      }
    }

    if (coincidioEnAlguna) {
      this.yaVerificado = true;
      this.respuestaCorrecta();
    } else if (esFinal) {
      console.log('❌ Resultado final sin coincidencia en ninguna alternativa');
      this.yaVerificado = true;
      this.respuestaIncorrecta();
    }
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
    console.log('🔊 TTS hablar:', texto);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.rate = 0.7;
      utterance.pitch = 1.2;
      utterance.volume = 1;
      
      utterance.onstart = () => {
        console.log('🔊 TTS iniciado');
      };
      
      utterance.onend = () => {
        console.log('🔊 TTS finalizado');
      };
      
      utterance.onerror = (event) => {
        console.error('❌ Error en TTS:', event);
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('⚠️ speechSynthesis no disponible');
    }
  }

  get progreso(): number {
    return (this.indiceActual / this.sonidos.length) * 100;
  }

  get sonidosRestantes(): number {
    return this.sonidos.length - this.indiceActual;
  }
}