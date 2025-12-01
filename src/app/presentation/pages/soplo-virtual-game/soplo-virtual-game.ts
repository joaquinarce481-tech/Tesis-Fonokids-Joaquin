import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

// Interfaz de reconocimiento de voz para TypeScript
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Nivel {
  numero: number;
  nombre: string;
  descripcion: string;
  palabras: string[];
  dificultad: 'facil' | 'media' | 'dificil';
  icono: string;
  color: string;
}

interface IntentoPalabra {
  palabra: string;
  escuchado: string;
  correcto: boolean;
  confianza: number;
  timestamp: number;
}

@Component({
  selector: 'app-soplo-virtual-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './soplo-virtual-game.component.html',
  styleUrls: ['./soplo-virtual-game.component.css']
})
export class SoploVirtualGameComponent implements OnInit, OnDestroy {
  // Estados del juego
  faseJuego: 'instrucciones' | 'seleccion-nivel' | 'preparando' | 'jugando' | 'completado' | 'error' = 'instrucciones';
  nivelActual: number = 1;
  maxNiveles: number = 7;
  modoJuego: 'todos' | 'individual' = 'todos'; // Nuevo: modo de juego
  
  // Reconocimiento de voz
  recognition: any = null;
  recognitionActiva: boolean = false;
  esperandoPronunciacion: boolean = false;
  
  // Palabras y progreso
  palabraActual: string = '';
  indicePalabra: number = 0;
  palabrasCompletadas: number = 0;
  totalPalabras: number = 0;
  intentos: IntentoPalabra[] = [];
  
  // Niveles del juego
  niveles: Nivel[] = [
    {
      numero: 1,
      nombre: 'Vocales',
      descripcion: 'Aprende a pronunciar las 5 vocales claramente',
      palabras: ['A', 'E', 'I', 'O', 'U'],
      dificultad: 'facil',
      icono: '🅰️',
      color: '#10b981'
    },
    {
      numero: 2,
      nombre: 'Sílabas Simples',
      descripcion: 'Combina consonantes con vocales para formar sílabas',
      palabras: ['MA', 'PA', 'TA', 'LA', 'SA', 'ME', 'PE', 'TE'],
      dificultad: 'facil',
      icono: '🔤',
      color: '#3b82f6'
    },
    {
      numero: 3,
      nombre: 'Sílabas Complejas',
      descripcion: 'Practica sílabas trabadas con BR, PL, TR, CR, GR',
      palabras: ['BRA', 'PLA', 'TRA', 'CRA', 'GRA', 'FRE', 'PRI'],
      dificultad: 'media',
      icono: '🔠',
      color: '#8b5cf6'
    },
    {
      numero: 4,
      nombre: 'Palabras Cortas',
      descripcion: 'Pronuncia palabras completas de uso cotidiano',
      palabras: ['CASA', 'MESA', 'SOPA', 'PATO', 'GATO', 'LUNA', 'SOL'],
      dificultad: 'media',
      icono: '📝',
      color: '#f59e0b'
    },
    {
      numero: 5,
      nombre: 'Palabras Medias',
      descripcion: 'Palabras de 3 sílabas con diferentes sonidos',
      palabras: ['PELOTA', 'CABALLO', 'MANZANA', 'VENTANA', 'TORTUGA'],
      dificultad: 'media',
      icono: '📖',
      color: '#ef4444'
    },
    {
      numero: 6,
      nombre: 'Palabras Difíciles',
      descripcion: 'Desafía tu pronunciación con palabras más largas',
      palabras: ['REFRIGERADOR', 'BICICLETA', 'MARIPOSA', 'DINOSAURIO', 'ELEFANTE'],
      dificultad: 'dificil',
      icono: '🎯',
      color: '#ec4899'
    },
    {
      numero: 7,
      nombre: 'Trabalenguas',
      descripcion: 'El desafío final: frases completas difíciles de pronunciar',
      palabras: ['TRES TRISTES TIGRES', 'PABLITO CLAVO UN CLAVITO', 'EL PERRO DE SAN ROQUE'],
      dificultad: 'dificil',
      icono: '🌪️',
      color: '#6366f1'
    }
  ];
  
  // Animaciones y feedback
  mostrandoFeedback: boolean = false;
  mensajeFeedback: string = '';
  tipoFeedback: 'correcto' | 'incorrecto' | 'cerca' = 'correcto';
  ultimoEscuchado: string = ''; // Nuevo: para mostrar lo que escuchó
  
  // Text-to-Speech
  synth: SpeechSynthesis | null = null;
  
  // Permisos
  permisoMicrofono: boolean = false;
  errorMicrofono: string = '';

  // Audio de celebración
  escuchandoAudio: boolean = false;
  timeoutEscucha: any = null;
  timeoutGrabacion: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.synth = window.speechSynthesis;
  }

  ngOnInit() {
    this.iniciarJuego();
  }

  ngOnDestroy() {
    this.limpiarRecursos();
  }

  iniciarJuego() {
    this.nivelActual = 1;
    this.modoJuego = 'todos';
    this.faseJuego = 'instrucciones';
    console.log('🎤 Juego "Reto de Pronunciación" iniciado');
  }

  saltarInstrucciones() {
    this.faseJuego = 'seleccion-nivel';
  }

  seleccionarNivel(nivel: number) {
    this.nivelActual = nivel;
    this.modoJuego = 'individual';
    this.solicitarPermisoMicrofono();
  }

  jugarTodosLosNiveles() {
    this.nivelActual = 1;
    this.modoJuego = 'todos';
    this.solicitarPermisoMicrofono();
  }

  async solicitarPermisoMicrofono() {
    try {
      this.faseJuego = 'preparando';
      console.log('🎤 Solicitando permiso de micrófono...');
      
      // Verificar soporte de Web Speech API
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      }
      
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Permiso de micrófono concedido, stream:', stream);
      
      // Configurar reconocimiento de voz
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.lang = 'es-ES'; // Español de España
      this.recognition.continuous = false; // Solo una frase
      this.recognition.interimResults = false; // ✅ FALSE - Solo resultados finales
      this.recognition.maxAlternatives = 10; // Más alternativas para analizar
      
      console.log('🎤 Reconocimiento configurado:', {
        lang: this.recognition.lang,
        continuous: this.recognition.continuous,
        interimResults: this.recognition.interimResults,
        maxAlternatives: this.recognition.maxAlternatives
      });
      
      this.recognition.onstart = () => {
        this.ngZone.run(() => {
          console.log('🎤 Evento onstart - Reconocimiento iniciado');
        });
      };
      
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('🎤 Evento onresult disparado!', event);
        this.ngZone.run(() => {
          this.procesarResultado(event);
        });
      };
      
      this.recognition.onspeechstart = () => {
        console.log('🗣️ Detectado inicio de voz');
      };
      
      this.recognition.onspeechend = () => {
        console.log('🗣️ Detectado fin de voz');
      };
      
      this.recognition.onaudiostart = () => {
        console.log('🔊 Audio iniciado en reconocimiento');
      };
      
      this.recognition.onaudioend = () => {
        console.log('🔊 Audio finalizado en reconocimiento');
      };
      
      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.ngZone.run(() => {
          console.error('❌ Error en reconocimiento:', event.error);
          console.error('❌ Mensaje de error:', event.message);
          
          // Limpiar timeout de grabación
          if (this.timeoutGrabacion) {
            clearTimeout(this.timeoutGrabacion);
            this.timeoutGrabacion = null;
          }
          
          this.esperandoPronunciacion = false;
          this.recognitionActiva = false;
          this.cdr.detectChanges(); // FORZAR actualización de vista
          
          if (event.error === 'no-speech') {
            this.mostrarFeedbackTemporal('No escuché nada. Intenta de nuevo.', 'incorrecto');
          } else if (event.error === 'aborted') {
            console.log('🎤 Reconocimiento cancelado');
          } else if (event.error === 'audio-capture') {
            this.mostrarFeedbackTemporal('Error de audio. Verifica tu micrófono.', 'incorrecto');
          } else if (event.error === 'not-allowed') {
            this.mostrarFeedbackTemporal('Permiso de micrófono denegado.', 'incorrecto');
          } else {
            this.mostrarFeedbackTemporal('Error al escuchar. Intenta de nuevo.', 'incorrecto');
          }
        });
      };
      
      this.recognition.onend = () => {
        this.ngZone.run(() => {
          console.log('🎤 Evento onend - Reconocimiento finalizado');
          
          // Limpiar timeout de grabación
          if (this.timeoutGrabacion) {
            clearTimeout(this.timeoutGrabacion);
            this.timeoutGrabacion = null;
          }
          
          this.recognitionActiva = false;
          this.esperandoPronunciacion = false;
          this.cdr.detectChanges(); // FORZAR actualización de vista
        });
      };
      
      this.permisoMicrofono = true;
      console.log('✅ Reconocimiento de voz configurado');
      
      setTimeout(() => {
        this.empezarNivel();
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Error al configurar reconocimiento:', error);
      this.errorMicrofono = error.message || 'No se pudo acceder al micrófono. Verifica los permisos.';
      this.faseJuego = 'error';
    }
  }

  empezarNivel() {
    this.faseJuego = 'jugando';
    this.palabrasCompletadas = 0;
    this.indicePalabra = 0;
    this.intentos = [];
    
    const nivelData = this.niveles[this.nivelActual - 1];
    this.totalPalabras = nivelData.palabras.length;
    
    this.cargarSiguientePalabra();
    
    console.log(`📖 Nivel ${this.nivelActual}: ${nivelData.nombre} - ${this.totalPalabras} palabras`);
  }

  cargarSiguientePalabra() {
    const nivelData = this.niveles[this.nivelActual - 1];
    
    if (this.indicePalabra >= nivelData.palabras.length) {
      this.completarNivel();
      return;
    }
    
    this.palabraActual = nivelData.palabras[this.indicePalabra];
    this.esperandoPronunciacion = false;
    this.recognitionActiva = false;
    this.ultimoEscuchado = ''; // Limpiar lo que escuchó anteriormente
    
    console.log(`🎯 Palabra actual: ${this.palabraActual}`);
  }

  escucharEjemplo() {
    if (!this.synth) {
      console.error('❌ Speech synthesis no disponible');
      return;
    }
    
    if (this.escuchandoAudio) {
      console.log('⚠️ Ya se está reproduciendo audio');
      return;
    }
    
    console.log('🔊 Iniciando ejemplo de audio para:', this.palabraActual);
    
    // Cancelar cualquier síntesis anterior
    this.synth.cancel();
    
    // Establecer estado ANTES de hablar
    this.escuchandoAudio = true;
    this.cdr.detectChanges(); // FORZAR actualización de vista
    
    // Timeout de seguridad
    this.timeoutEscucha = setTimeout(() => {
      this.ngZone.run(() => {
        console.log('⏰ Timeout de escucha - reseteando estado');
        this.escuchandoAudio = false;
        this.cdr.detectChanges();
        if (this.synth) {
          this.synth.cancel();
        }
      });
    }, 10000);
    
    const utterance = new SpeechSynthesisUtterance(this.palabraActual);
    utterance.lang = 'es-ES';
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    utterance.onstart = () => {
      this.ngZone.run(() => {
        console.log('🔊 Audio iniciado');
        this.escuchandoAudio = true;
        this.cdr.detectChanges();
      });
    };
    
    utterance.onend = () => {
      this.ngZone.run(() => {
        console.log('✅ Audio terminado - RESETEANDO ESTADO');
        if (this.timeoutEscucha) {
          clearTimeout(this.timeoutEscucha);
          this.timeoutEscucha = null;
        }
        this.escuchandoAudio = false;
        this.cdr.detectChanges(); // FORZAR actualización de vista
      });
    };
    
    utterance.onerror = (error) => {
      this.ngZone.run(() => {
        console.error('❌ Error en síntesis de voz:', error);
        if (this.timeoutEscucha) {
          clearTimeout(this.timeoutEscucha);
          this.timeoutEscucha = null;
        }
        this.escuchandoAudio = false;
        this.cdr.detectChanges(); // FORZAR actualización de vista
      });
    };
    
    try {
      this.synth.speak(utterance);
      console.log('🎤 Utterance agregado a la cola');
    } catch (error) {
      console.error('❌ Error al iniciar síntesis:', error);
      if (this.timeoutEscucha) {
        clearTimeout(this.timeoutEscucha);
      }
      this.escuchandoAudio = false;
      this.cdr.detectChanges();
    }
  }

  empezarGrabacion() {
    if (!this.recognition) {
      console.error('❌ Reconocimiento no disponible');
      return;
    }
    
    if (this.recognitionActiva || this.esperandoPronunciacion) {
      console.log('⚠️ Ya hay una grabación en curso');
      return;
    }
    
    console.log('🎤 Iniciando grabación para:', this.palabraActual);
    
    this.esperandoPronunciacion = true;
    this.recognitionActiva = true;
    this.cdr.detectChanges(); // FORZAR actualización de vista
    
    // Timeout de seguridad - aumentado a 15 segundos
    this.timeoutGrabacion = setTimeout(() => {
      this.ngZone.run(() => {
        console.log('⏰ Timeout de grabación (15s) - reseteando estado');
        this.esperandoPronunciacion = false;
        this.recognitionActiva = false;
        this.cdr.detectChanges();
        if (this.recognition) {
          try {
            this.recognition.stop();
          } catch (e) {
            console.log('No se pudo detener el reconocimiento');
          }
        }
        this.mostrarFeedbackTemporal('Tiempo agotado. Intenta de nuevo.', 'incorrecto');
      });
    }, 15000); // Aumentado a 15 segundos
    
    try {
      this.recognition.start();
      console.log('🎤 Reconocimiento iniciado exitosamente');
      console.log('🎤 Esperando que pronuncies:', this.palabraActual);
    } catch (error) {
      console.error('❌ Error al iniciar grabación:', error);
      if (this.timeoutGrabacion) {
        clearTimeout(this.timeoutGrabacion);
        this.timeoutGrabacion = null;
      }
      this.recognitionActiva = false;
      this.esperandoPronunciacion = false;
      this.cdr.detectChanges();
    }
  }

  procesarResultado(event: SpeechRecognitionEvent) {
    console.log('📊 ========== PROCESANDO RESULTADO ==========');
    
    // Limpiar timeout de grabación
    if (this.timeoutGrabacion) {
      clearTimeout(this.timeoutGrabacion);
      this.timeoutGrabacion = null;
    }
    
    const results = event.results;
    console.log('📊 Results length:', results.length);
    
    if (results.length === 0) {
      console.error('❌ No hay resultados');
      this.esperandoPronunciacion = false;
      this.recognitionActiva = false;
      this.cdr.detectChanges();
      return;
    }
    
    // Con interimResults = false, siempre usamos results[0] que es el resultado final
    const resultado = results[0];
    
    console.log('✅ Procesando resultado final');
    console.log('📊 isFinal:', resultado.isFinal);
    
    if (resultado.length === 0) {
      console.error('❌ Resultado vacío');
      this.esperandoPronunciacion = false;
      this.recognitionActiva = false;
      this.cdr.detectChanges();
      return;
    }
    
    // Detener reconocimiento inmediatamente
    this.esperandoPronunciacion = false;
    this.recognitionActiva = false;
    this.cdr.detectChanges();
    
    // Normalizar la palabra esperada
    const palabraEsperadaNormalizada = this.normalizarTexto(this.palabraActual);
    console.log('🎯 Palabra esperada (normalizada):', palabraEsperadaNormalizada);
    
    // Analizar TODAS las alternativas
    console.log('📝 Analizando', resultado.length, 'alternativas:');
    
    let mejorCoincidencia = {
      transcript: '',
      confidence: 0,
      similitud: 0,
      esCorrecto: false,
      normalizado: ''
    };
    
    for (let i = 0; i < resultado.length; i++) {
      const alt = resultado[i];
      const transcriptNormalizado = this.normalizarTexto(alt.transcript);
      const similitud = this.calcularSimilitud(transcriptNormalizado, palabraEsperadaNormalizada);
      const esCorrecto = transcriptNormalizado === palabraEsperadaNormalizada;
      
      console.log(`  ${i + 1}. "${alt.transcript}" → "${transcriptNormalizado}"`);
      console.log(`     Confianza: ${(alt.confidence * 100).toFixed(0)}% | Similitud: ${(similitud * 100).toFixed(0)}% | Correcto: ${esCorrecto}`);
      
      // Buscar la mejor coincidencia (priorizar corrección, luego similitud, luego confianza)
      if (esCorrecto) {
        mejorCoincidencia = {
          transcript: alt.transcript,
          confidence: alt.confidence,
          similitud: 1.0,
          esCorrecto: true,
          normalizado: transcriptNormalizado
        };
        console.log('     ✅ ¡COINCIDENCIA EXACTA!');
        break; // Si encontramos coincidencia exacta, no seguir buscando
      } else if (similitud > mejorCoincidencia.similitud) {
        mejorCoincidencia = {
          transcript: alt.transcript,
          confidence: alt.confidence,
          similitud: similitud,
          esCorrecto: false,
          normalizado: transcriptNormalizado
        };
      }
    }
    
    console.log('🏆 MEJOR COINCIDENCIA:');
    console.log('   Original:', mejorCoincidencia.transcript);
    console.log('   Normalizado:', mejorCoincidencia.normalizado);
    console.log('   Esperado:', palabraEsperadaNormalizada);
    console.log('   Correcto:', mejorCoincidencia.esCorrecto);
    console.log('   Similitud:', (mejorCoincidencia.similitud * 100).toFixed(0) + '%');
    console.log('   Confianza:', (mejorCoincidencia.confidence * 100).toFixed(0) + '%');
    console.log('=====================================');
    
    // Guardar intento
    const intento: IntentoPalabra = {
      palabra: this.palabraActual,
      escuchado: mejorCoincidencia.transcript,
      correcto: mejorCoincidencia.esCorrecto,
      confianza: mejorCoincidencia.confidence,
      timestamp: Date.now()
    };
    this.intentos.push(intento);
    
    // Decidir resultado basado en la mejor coincidencia
    if (mejorCoincidencia.esCorrecto) {
      console.log('✅ Llamando a palabraCorrecta()');
      this.palabraCorrecta(mejorCoincidencia.confidence);
    } else if (mejorCoincidencia.similitud >= 0.7) {
      // Umbral de similitud 70% para ser más permisivo
      console.log('🟡 Llamando a palabraCerca()');
      this.palabraCerca(mejorCoincidencia.transcript, mejorCoincidencia.similitud);
    } else {
      console.log('❌ Llamando a palabraIncorrecta()');
      this.palabraIncorrecta(mejorCoincidencia.transcript);
    }
  }

  normalizarTexto(texto: string): string {
    // Eliminar acentos y tildes
    const sinAcentos = texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    // Convertir a mayúsculas
    const mayusculas = sinAcentos.toUpperCase();
    
    // Eliminar TODA puntuación y caracteres especiales
    const sinPuntuacion = mayusculas
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()¿?¡!"""''´`]/g, '');
    
    // Normalizar espacios múltiples a un solo espacio
    const espaciosNormalizados = sinPuntuacion
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('🔍 Normalización:', {
      original: texto,
      sinAcentos: sinAcentos,
      resultado: espaciosNormalizados
    });
    
    return espaciosNormalizados;
  }

  calcularSimilitud(str1: string, str2: string): number {
    // Algoritmo de Levenshtein mejorado
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    const similitud = (longer.length - editDistance) / longer.length;
    
    // BONUS: Dar puntos extra si contiene todas las letras importantes
    const letrasEsperadas = new Set(str2.split(''));
    const letrasEncontradas = str1.split('').filter(letra => letrasEsperadas.has(letra));
    const porcentajeLetras = letrasEncontradas.length / str2.length;
    
    // Similitud ponderada (70% Levenshtein + 30% letras coincidentes)
    const similitudFinal = (similitud * 0.7) + (porcentajeLetras * 0.3);
    
    console.log('📊 Cálculo de similitud:', {
      str1,
      str2,
      editDistance,
      similitudLevenshtein: (similitud * 100).toFixed(0) + '%',
      letrasCoincidentes: letrasEncontradas.length + '/' + str2.length,
      porcentajeLetras: (porcentajeLetras * 100).toFixed(0) + '%',
      similitudFinal: (similitudFinal * 100).toFixed(0) + '%'
    });
    
    return similitudFinal;
  }

  levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  palabraCorrecta(confianza: number) {
    console.log('✅✅✅ ¡PALABRA CORRECTA! ✅✅✅');
    
    this.ultimoEscuchado = ''; // Limpiar ya que fue correcto
    this.mostrarFeedbackTemporal('¡Excelente! 🎉', 'correcto');
    
    this.palabrasCompletadas++;
    this.indicePalabra++;
    
    console.log('📊 Progreso actualizado:', {
      palabrasCompletadas: this.palabrasCompletadas,
      totalPalabras: this.totalPalabras,
      indicePalabra: this.indicePalabra
    });
    
    // Vibración de éxito
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
    
    setTimeout(() => {
      this.ngZone.run(() => {
        console.log('➡️ Cargando siguiente palabra...');
        this.cargarSiguientePalabra();
      });
    }, 1500);
  }

  palabraCerca(escuchado: string, similitud: number) {
    console.log('🟡🟡🟡 PALABRA CASI CORRECTA 🟡🟡🟡');
    console.log('🟡 Similitud:', (similitud * 100).toFixed(0) + '%');
    
    this.ultimoEscuchado = escuchado;
    this.mostrarFeedbackTemporal('¡Casi! Inténtalo de nuevo 💪', 'cerca');
  }

  palabraIncorrecta(escuchado: string) {
    console.log('❌❌❌ PALABRA INCORRECTA ❌❌❌');
    
    this.ultimoEscuchado = escuchado;
    this.mostrarFeedbackTemporal('Intenta de nuevo 🔄', 'incorrecto');
  }

  mostrarFeedbackTemporal(mensaje: string, tipo: 'correcto' | 'incorrecto' | 'cerca') {
    console.log('💬 Mostrando feedback:', tipo, '-', mensaje);
    
    this.mensajeFeedback = mensaje;
    this.tipoFeedback = tipo;
    this.mostrandoFeedback = true;
    this.cdr.detectChanges(); // FORZAR actualización
    
    console.log('💬 Estado de feedback:', {
      mostrandoFeedback: this.mostrandoFeedback,
      mensajeFeedback: this.mensajeFeedback,
      tipoFeedback: this.tipoFeedback
    });
    
    setTimeout(() => {
      this.ngZone.run(() => {
        console.log('💬 Ocultando feedback');
        this.mostrandoFeedback = false;
        this.cdr.detectChanges();
      });
    }, 2500);
  }

  completarNivel() {
    this.faseJuego = 'preparando';
    
    console.log(`✅ Nivel ${this.nivelActual} completado`);
    
    // Si está en modo "todos los niveles" y no es el último nivel
    if (this.modoJuego === 'todos' && this.nivelActual < this.maxNiveles) {
      setTimeout(() => {
        this.nivelActual++;
        this.empezarNivel();
      }, 2000);
    } else {
      // Modo individual o último nivel de "todos"
      setTimeout(() => {
        this.completarJuego();
      }, 2000);
    }
  }

  completarJuego() {
    this.faseJuego = 'completado';
    
    console.log('🎉 ¡Juego completado!');
  }

  getNivelActualData(): Nivel {
    return this.niveles[this.nivelActual - 1];
  }

  getProgresoPorcentaje(): number {
    if (this.totalPalabras === 0) return 0;
    return (this.palabrasCompletadas / this.totalPalabras) * 100;
  }

  getPalabrasCorrectas(): number {
    return this.intentos.filter(intento => intento.correcto).length;
  }

  getTotalIntentos(): number {
    return this.intentos.length;
  }

  reiniciarJuego() {
    this.limpiarRecursos();
    this.iniciarJuego();
  }

  reiniciarNivel() {
    this.limpiarRecursos();
    this.solicitarPermisoMicrofono();
  }

  resetearEstadosBotones() {
    console.log('🔄 Reseteando estados manualmente...');
    this.escuchandoAudio = false;
    this.esperandoPronunciacion = false;
    this.recognitionActiva = false;
    
    if (this.timeoutEscucha) {
      clearTimeout(this.timeoutEscucha);
      this.timeoutEscucha = null;
    }
    
    if (this.timeoutGrabacion) {
      clearTimeout(this.timeoutGrabacion);
      this.timeoutGrabacion = null;
    }
    
    if (this.synth) {
      this.synth.cancel();
    }
    
    if (this.recognition && this.recognitionActiva) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.log('No se pudo detener reconocimiento');
      }
    }
    
    this.cdr.detectChanges();
    console.log('✅ Estados reseteados');
  }

  volverASeleccionNivel() {
    this.limpiarRecursos();
    this.faseJuego = 'seleccion-nivel';
  }

  volverAJuegos() {
    // Si está jugando o en pantalla de completado, ir a selección de niveles
    if (this.faseJuego === 'jugando' || this.faseJuego === 'completado') {
      this.limpiarRecursos();
      this.faseJuego = 'seleccion-nivel';
    } else {
      // Si está en instrucciones, error, o selección de nivel, ir al dashboard
      this.limpiarRecursos();
      this.router.navigate(['/juegos-terapeuticos']);
    }
  }

  volverAlDashboard() {
    this.limpiarRecursos();
    this.router.navigate(['/juegos-terapeuticos']);
  }

  siguienteJuego() {
    this.limpiarRecursos();
    this.router.navigate(['/juego', 'linguales', 'atrapa-lengua']);
  }

  limpiarRecursos() {
    // Limpiar timeouts
    if (this.timeoutEscucha) {
      clearTimeout(this.timeoutEscucha);
      this.timeoutEscucha = null;
    }
    
    if (this.timeoutGrabacion) {
      clearTimeout(this.timeoutGrabacion);
      this.timeoutGrabacion = null;
    }
    
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignorar errores al detener
      }
      this.recognition = null;
    }
    
    if (this.synth) {
      this.synth.cancel();
    }
    
    this.recognitionActiva = false;
    this.esperandoPronunciacion = false;
    this.escuchandoAudio = false;
    this.permisoMicrofono = false;
    
    console.log('🧹 Recursos limpiados');
  }
}