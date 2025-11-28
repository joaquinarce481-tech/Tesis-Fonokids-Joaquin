import { Component, OnInit, OnDestroy } from '@angular/core';
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
  faseJuego: 'instrucciones' | 'preparando' | 'jugando' | 'completado' | 'error' = 'instrucciones';
  nivelActual: number = 1;
  maxNiveles: number = 7;
  puntaje: number = 0;
  tiempoInicio: number = 0;
  tiempoTranscurrido: number = 0;
  tiempoLimite: number = 120; // 2 minutos por nivel
  intervaloTiempo: any;
  
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
      palabras: ['A', 'E', 'I', 'O', 'U'],
      dificultad: 'facil',
      icono: '🅰️',
      color: '#10b981'
    },
    {
      numero: 2,
      nombre: 'Sílabas Simples',
      palabras: ['MA', 'PA', 'TA', 'LA', 'SA', 'ME', 'PE', 'TE'],
      dificultad: 'facil',
      icono: '🔤',
      color: '#3b82f6'
    },
    {
      numero: 3,
      nombre: 'Sílabas Complejas',
      palabras: ['BRA', 'PLA', 'TRA', 'CRA', 'GRA', 'FRE', 'PRI'],
      dificultad: 'media',
      icono: '🔠',
      color: '#8b5cf6'
    },
    {
      numero: 4,
      nombre: 'Palabras Cortas',
      palabras: ['CASA', 'MESA', 'SOPA', 'PATO', 'GATO', 'LUNA', 'SOL'],
      dificultad: 'media',
      icono: '📝',
      color: '#f59e0b'
    },
    {
      numero: 5,
      nombre: 'Palabras Medias',
      palabras: ['PELOTA', 'CABALLO', 'MANZANA', 'VENTANA', 'TORTUGA'],
      dificultad: 'media',
      icono: '📖',
      color: '#ef4444'
    },
    {
      numero: 6,
      nombre: 'Palabras Difíciles',
      palabras: ['REFRIGERADOR', 'BICICLETA', 'MARIPOSA', 'DINOSAURIO', 'ELEFANTE'],
      dificultad: 'dificil',
      icono: '🎯',
      color: '#ec4899'
    },
    {
      numero: 7,
      nombre: 'Trabalenguas',
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
  
  // Text-to-Speech
  synth: SpeechSynthesis | null = null;
  
  // Permisos
  permisoMicrofono: boolean = false;
  errorMicrofono: string = '';

  // Audio de celebración
  escuchandoAudio: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute
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
    this.tiempoInicio = Date.now();
    this.puntaje = 0;
    this.nivelActual = 1;
    this.faseJuego = 'instrucciones';
    this.iniciarTemporizador();
    console.log('🎤 Juego "Reto de Pronunciación" iniciado');
  }

  iniciarTemporizador() {
    this.intervaloTiempo = setInterval(() => {
      if (this.faseJuego === 'jugando') {
        this.tiempoTranscurrido = Math.floor((Date.now() - this.tiempoInicio) / 1000);
        
        if (this.tiempoTranscurrido >= this.tiempoLimite) {
          this.tiempoAgotado();
        }
      }
    }, 1000);
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
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Configurar reconocimiento de voz
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.lang = 'es-ES'; // Español
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 3;
      
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        this.procesarResultado(event);
      };
      
      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('❌ Error en reconocimiento:', event.error);
        if (event.error === 'no-speech') {
          this.mostrarFeedbackTemporal('No escuché nada. Intenta de nuevo.', 'incorrecto');
          this.esperandoPronunciacion = false;
          this.recognitionActiva = false;
        }
      };
      
      this.recognition.onend = () => {
        this.recognitionActiva = false;
        console.log('🎤 Reconocimiento finalizado');
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
    this.tiempoInicio = Date.now();
    this.tiempoTranscurrido = 0;
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
    
    console.log(`🎯 Palabra actual: ${this.palabraActual}`);
  }

  escucharEjemplo() {
    if (!this.synth || this.escuchandoAudio) return;
    
    this.escuchandoAudio = true;
    
    // Cancelar cualquier síntesis anterior
    this.synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(this.palabraActual);
    utterance.lang = 'es-ES';
    utterance.rate = 0.8; // Más lento para niños
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    utterance.onend = () => {
      this.escuchandoAudio = false;
      console.log('🔊 Ejemplo reproducido');
    };
    
    utterance.onerror = () => {
      this.escuchandoAudio = false;
      console.error('❌ Error al reproducir ejemplo');
    };
    
    this.synth.speak(utterance);
  }

  empezarGrabacion() {
    if (!this.recognition || this.recognitionActiva || this.esperandoPronunciacion) {
      return;
    }
    
    this.esperandoPronunciacion = true;
    this.recognitionActiva = true;
    
    try {
      this.recognition.start();
      console.log('🎤 Grabación iniciada - Esperando pronunciación de:', this.palabraActual);
    } catch (error) {
      console.error('❌ Error al iniciar grabación:', error);
      this.recognitionActiva = false;
      this.esperandoPronunciacion = false;
    }
  }

  procesarResultado(event: SpeechRecognitionEvent) {
    const results = event.results;
    const resultado = results[0];
    const transcript = resultado[0].transcript.toUpperCase().trim();
    const confidence = resultado[0].confidence;
    
    console.log('🎤 Escuchado:', transcript, '- Confianza:', (confidence * 100).toFixed(0) + '%');
    console.log('🎯 Esperado:', this.palabraActual);
    
    // Normalizar para comparación
    const transcriptNormalizado = this.normalizarTexto(transcript);
    const palabraEsperadaNormalizada = this.normalizarTexto(this.palabraActual);
    
    const esCorrecto = transcriptNormalizado === palabraEsperadaNormalizada;
    const similitud = this.calcularSimilitud(transcriptNormalizado, palabraEsperadaNormalizada);
    
    // Guardar intento
    const intento: IntentoPalabra = {
      palabra: this.palabraActual,
      escuchado: transcript,
      correcto: esCorrecto,
      confianza: confidence,
      timestamp: Date.now()
    };
    this.intentos.push(intento);
    
    if (esCorrecto) {
      this.palabraCorrecta(confidence);
    } else if (similitud > 0.6) {
      this.palabraCerca(transcript, similitud);
    } else {
      this.palabraIncorrecta(transcript);
    }
    
    this.esperandoPronunciacion = false;
  }

  normalizarTexto(texto: string): string {
    return texto
      .toUpperCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ');
  }

  calcularSimilitud(str1: string, str2: string): number {
    // Algoritmo de Levenshtein simplificado
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
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
    console.log('✅ ¡Palabra correcta!');
    
    this.mostrarFeedbackTemporal('¡Excelente! 🎉', 'correcto');
    
    // Puntuación basada en confianza
    const puntos = Math.floor(100 * confianza) + (this.nivelActual * 50);
    this.puntaje += puntos;
    
    this.palabrasCompletadas++;
    this.indicePalabra++;
    
    // Vibración de éxito
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
    
    setTimeout(() => {
      this.cargarSiguientePalabra();
    }, 1500);
  }

  palabraCerca(escuchado: string, similitud: number) {
    console.log('🟡 Palabra casi correcta');
    
    this.mostrarFeedbackTemporal(`Casi lo logras! Escuché: "${escuchado}"`, 'cerca');
    
    // Dar puntos parciales
    this.puntaje += Math.floor(50 * similitud);
  }

  palabraIncorrecta(escuchado: string) {
    console.log('❌ Palabra incorrecta');
    
    this.mostrarFeedbackTemporal(`Intenta de nuevo. Escuché: "${escuchado}"`, 'incorrecto');
  }

  mostrarFeedbackTemporal(mensaje: string, tipo: 'correcto' | 'incorrecto' | 'cerca') {
    this.mensajeFeedback = mensaje;
    this.tipoFeedback = tipo;
    this.mostrandoFeedback = true;
    
    setTimeout(() => {
      this.mostrandoFeedback = false;
    }, 2000);
  }

  completarNivel() {
    this.faseJuego = 'preparando';
    
    const bonusTiempo = Math.max(0, this.tiempoLimite - this.tiempoTranscurrido) * 10;
    const bonusNivel = this.nivelActual * 200;
    this.puntaje += bonusTiempo + bonusNivel;
    
    console.log(`✅ Nivel ${this.nivelActual} completado. Bonus: +${bonusTiempo + bonusNivel}`);
    
    if (this.nivelActual >= this.maxNiveles) {
      setTimeout(() => {
        this.completarJuego();
      }, 2000);
    } else {
      setTimeout(() => {
        this.nivelActual++;
        this.empezarNivel();
      }, 2000);
    }
  }

  completarJuego() {
    this.faseJuego = 'completado';
    
    const bonusCompletado = 2000;
    this.puntaje += bonusCompletado;
    
    console.log('🎉 ¡Juego completado!');
    console.log(`📊 Puntaje final: ${this.puntaje}`);
  }

  tiempoAgotado() {
    this.faseJuego = 'completado';
    console.log('⏰ Tiempo agotado');
  }

  formatearTiempo(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  }

  getTiempoRestante(): number {
    return Math.max(0, this.tiempoLimite - this.tiempoTranscurrido);
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

  getEstrellas(): number {
    const precision = this.intentos.filter(i => i.correcto).length / Math.max(1, this.intentos.length);
    
    if (this.nivelActual >= this.maxNiveles && precision >= 0.9) return 3;
    if (this.nivelActual >= 4 && precision >= 0.7) return 2;
    if (precision >= 0.5) return 1;
    return 0;
  }

  reiniciarJuego() {
    this.limpiarRecursos();
    this.iniciarJuego();
    this.solicitarPermisoMicrofono();
  }

  volverAJuegos() {
    this.limpiarRecursos();
    this.router.navigate(['/juegos-terapeuticos']);
  }

  siguienteJuego() {
    this.limpiarRecursos();
    this.router.navigate(['/juego', 'linguales', 'atrapa-lengua']);
  }

  limpiarRecursos() {
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
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
    this.permisoMicrofono = false;
    
    console.log('🧹 Recursos limpiados');
  }

  saltarInstrucciones() {
    this.solicitarPermisoMicrofono();
  }
}