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
export class SonidosDivertidosComponent implements OnInit, OnDestroy {

  // ========================================
  // VISTA ACTUAL - AGREGADO PARA INSTRUCCIONES
  // ========================================
  vistaActual: 'instrucciones' | 'jugando' = 'instrucciones';

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

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private historialService: HistorialActividadesService
  ) {}

  ngOnInit(): void {
    console.log('🎮 Sonidos Divertidos iniciado');
    
    // 🔝 SCROLL AUTOMÁTICO AL INICIO
    window.scrollTo(0, 0);
    
    this.verificarReconocimientoVoz();
    // NO mostrar el sonido hasta que se presione "Comenzar"
  }

  ngOnDestroy(): void {
    console.log('🔚 Componente destruyéndose');
    this.detenerReconocimientoVoz();
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
    
    // 🔝 SCROLL AL INICIO
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
      
      console.log('✅ Mostrando sonido:', this.sonidoActual.nombre, '(ID:', this.sonidoActual.id + ')');
      console.log('🎨 Emoji:', this.sonidoActual.imagen);
      console.log('🔊 Onomatopeya:', this.sonidoActual.onomatopeya);
    } else {
      console.log('🏁 Todos los sonidos completados!');
      this.completarJuego();
    }
  }

  reproducirSonido(): void {
    if (this.sonidoActual) {
      console.log('🔊 Reproduciendo sonido:', this.sonidoActual.onomatopeya);
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
    if (!this.sonidoActual) {
      console.error('❌ No hay sonido actual para verificar');
      return;
    }

    const textoLimpio = textoDetectado.toLowerCase().trim();
    console.log('🎤 Texto detectado:', textoDetectado);
    console.log('🧹 Texto limpio:', textoLimpio);
    console.log('🔍 Buscando en palabras clave:', this.sonidoActual.palabrasClave);

    const coincide = this.sonidoActual.palabrasClave.some(palabra => {
      const palabraLimpia = palabra.toLowerCase();
      const incluye = textoLimpio.includes(palabraLimpia) || palabraLimpia.includes(textoLimpio);
      const similitud = this.similitudCadenas(textoLimpio, palabraLimpia);
      
      console.log(`  - Comparando con "${palabra}": incluye=${incluye}, similitud=${similitud.toFixed(2)}`);
      
      return incluye || similitud > 0.7;
    });

    if (coincide) {
      console.log('✅ ¡COINCIDENCIA ENCONTRADA!');
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
    console.log('✅ Respuesta correcta!');
    this.detenerEscucha();
    
    this.ngZone.run(() => {
      this.feedbackTipo = 'correcto';
      this.feedbackMensaje = '¡Excelente! ¡Lo hiciste perfecto!';
      this.mostrarFeedback = true;
      console.log('💬 Mostrando feedback');
    });
    
    this.hablar('¡Muy bien! ¡Excelente sonido!');

    // Esperar 2 segundos y mostrar celebración
    setTimeout(() => {
      this.ngZone.run(() => {
        this.mostrarFeedback = false;
        this.mostrarCelebracion = true;
        console.log('🎉 Mostrando celebración');
      });

      // Esperar 2.5 segundos más y avanzar
      setTimeout(() => {
        this.ngZone.run(() => {
          console.log('➡️ Avanzando al siguiente sonido');
          this.mostrarCelebracion = false;
          this.indiceActual++;
          console.log('📍 Nuevo índice:', this.indiceActual);
          this.mostrarSonido();
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
      });
      
      this.hablar(`No te preocupes. El sonido era ${this.sonidoActual?.onomatopeya}. Vamos al siguiente`);
      
      setTimeout(() => {
        this.ngZone.run(() => {
          this.mostrarFeedback = false;
          this.indiceActual++;
          this.mostrarSonido();
        });
      }, 4000);
    } else {
      this.ngZone.run(() => {
        this.feedbackTipo = 'incorrecto';
        this.feedbackMensaje = `¡Casi! Escucha bien e intenta de nuevo (${this.intentoActual}/${this.maxIntentos})`;
        this.mostrarFeedback = true;
      });
      
      this.hablar('Casi casi. Escucha de nuevo e intenta otra vez');
      
      setTimeout(() => {
        this.ngZone.run(() => {
          this.mostrarFeedback = false;
        });
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
    
    // 🎯 REGISTRAR JUEGO EN HISTORIAL
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
    
    // 🔝 SCROLL AL INICIO
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    
    this.mostrarSonido();
  }

  volverAlMenu(): void {
    this.detenerReconocimientoVoz();
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
    console.log('🔊 TTS hablar:', texto);
    if ('speechSynthesis' in window) {
      // Cancelar cualquier audio que esté sonando
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.rate = 0.85;
      utterance.pitch = 1.3;
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