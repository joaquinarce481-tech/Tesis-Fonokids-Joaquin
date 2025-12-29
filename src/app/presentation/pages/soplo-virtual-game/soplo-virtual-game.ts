import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HistorialActividadesService } from '../../services/historial-actividades.service';

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
  umbralSimilitud: number; // Umbral específico por nivel
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
  modoJuego: 'todos' | 'individual' = 'todos';
  
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
  
  // EQUIVALENCIAS: Variaciones aceptables para vocales y sílabas
  private equivalencias: { [key: string]: string[] } = {
    // Vocales - SUPER permisivo (el reconocedor tiene problemas con sonidos cortos)
    'A': ['A', 'AH', 'HA', 'AA', 'LA A', 'LETRA A', 'AJA', 'JA', 'AJ', 'EA', 'YA', 'NA', 'MA', 'LA', 'TA', 'PA', 'SA', 'CA', 'DA', 'FA', 'GA', 'BA', 'VA', 'RA', 'KA', 'WA', 'ZA', 'HOLA', 'AGUA', 'ALA', 'ANA', 'ASA'],
    'E': ['E', 'EH', 'HE', 'EE', 'LA E', 'LETRA E', 'EJE', 'JE', 'EL', 'LE', 'ME', 'NE', 'PE', 'SE', 'TE', 'DE', 'FE', 'GE', 'BE', 'VE', 'RE', 'QUE', 'KE', 'WE', 'ZE', 'ESE', 'EME', 'ENE'],
    'I': ['I', 'IH', 'HI', 'II', 'LA I', 'LETRA I', 'Y', 'SI', 'MI', 'NI', 'TI', 'LI', 'PI', 'FI', 'DI', 'BI', 'VI', 'RI', 'KI', 'GI', 'QUI', 'CHI', 'SHI', 'YI', 'JI', 'AHI', 'AQUI'],
    'O': ['O', 'OH', 'HO', 'OO', 'LA O', 'LETRA O', 'JO', 'LO', 'NO', 'SO', 'TO', 'DO', 'MO', 'PO', 'CO', 'GO', 'BO', 'FO', 'RO', 'YO', 'KO', 'WO', 'ZO', 'OSO', 'OJO', 'ORO'],
    'U': ['U', 'UH', 'HU', 'UU', 'LA U', 'LETRA U', 'TU', 'SU', 'MU', 'LU', 'NU', 'PU', 'CU', 'DU', 'FU', 'GU', 'BU', 'RU', 'JU', 'KU', 'WU', 'ZU', 'UNO', 'UVA', 'USA'],
    // Sílabas simples - muy permisivo
    'MA': ['MA', 'MAH', 'AMA', 'MAMA', 'MAA', 'MAM', 'MAMI', 'MANO', 'MALO', 'MAS', 'MAR', 'MAL', 'MARCA', 'MASA'],
    'PA': ['PA', 'PAH', 'APA', 'PAPA', 'PAA', 'PAP', 'PAPI', 'PATO', 'PALO', 'PAN', 'PAR', 'PAZ', 'PASO', 'PASA'],
    'TA': ['TA', 'TAH', 'ATA', 'TATA', 'TAA', 'TAL', 'TAN', 'TAR', 'TAZA', 'TACO', 'TAPA'],
    'LA': ['LA', 'LAH', 'ALA', 'LALA', 'LAA', 'LAS', 'LAR', 'LADO', 'LATA', 'LAGO', 'LANA'],
    'SA': ['SA', 'SAH', 'ASA', 'SASA', 'SAA', 'SAL', 'SAN', 'SALA', 'SANO', 'SAPO', 'SACA'],
    'ME': ['ME', 'MEH', 'EME', 'MEME', 'MEE', 'MES', 'MESA', 'METE', 'MEMO', 'MENA'],
    'PE': ['PE', 'PEH', 'EPE', 'PEPE', 'PEE', 'PEZ', 'PESO', 'PENA', 'PELO', 'PERA'],
    'TE': ['TE', 'TEH', 'ETE', 'TETE', 'TEE', 'TEN', 'TELA', 'TEMA', 'TECHO'],
    // Sílabas complejas - permisivo
    'BRA': ['BRA', 'BARA', 'BRAA', 'ABRA', 'BRAVO', 'BRAZO', 'OBRA', 'LIBRA', 'CABRA', 'COBRA'],
    'PLA': ['PLA', 'PALA', 'PLAA', 'APLA', 'PLATO', 'PLAYA', 'PLANO', 'PLAZA', 'PLATA'],
    'TRA': ['TRA', 'TARA', 'TRAA', 'ATRA', 'TRATO', 'TRAPO', 'OTRO', 'CUATRO', 'TRABAJO'],
    'CRA': ['CRA', 'CARA', 'CRAA', 'ACRA', 'CREAR', 'CREMA'],
    'GRA': ['GRA', 'GARA', 'GRAA', 'AGRA', 'GRATO', 'GRANDE', 'GRASA', 'GRACIAS', 'TIGRA'],
    'FRE': ['FRE', 'FERE', 'FREE', 'AFRE', 'FRENO', 'FRESCO', 'FRESA', 'FRASE'],
    'PRI': ['PRI', 'PIRI', 'PRII', 'APRI', 'PRIMO', 'PRECIO', 'PRISA', 'PRIMERO'],
  };
  
  // Niveles del juego con umbrales específicos
  niveles: Nivel[] = [
    {
      numero: 1,
      nombre: 'Vocales',
      descripcion: 'Aprende a pronunciar las 5 vocales claramente',
      palabras: ['A', 'E', 'I', 'O', 'U'],
      dificultad: 'facil',
      icono: '🅰️',
      color: '#10b981',
      umbralSimilitud: 0.15 // MUY permisivo - cualquier sonido con la vocal cuenta
    },
    {
      numero: 2,
      nombre: 'Sílabas Simples',
      descripcion: 'Combina consonantes con vocales para formar sílabas',
      palabras: ['MA', 'PA', 'TA', 'LA', 'SA', 'ME', 'PE', 'TE'],
      dificultad: 'facil',
      icono: '🔤',
      color: '#3b82f6',
      umbralSimilitud: 0.25 // Muy permisivo para sílabas
    },
    {
      numero: 3,
      nombre: 'Sílabas Complejas',
      descripcion: 'Practica sílabas trabadas con BR, PL, TR, CR, GR',
      palabras: ['BRA', 'PLA', 'TRA', 'CRA', 'GRA', 'FRE', 'PRI'],
      dificultad: 'media',
      icono: '🔠',
      color: '#8b5cf6',
      umbralSimilitud: 0.30 // Permisivo
    },
    {
      numero: 4,
      nombre: 'Palabras Cortas',
      descripcion: 'Pronuncia palabras completas de uso cotidiano',
      palabras: ['CASA', 'MESA', 'SOPA', 'PATO', 'GATO', 'LUNA', 'SOL'],
      dificultad: 'media',
      icono: '📝',
      color: '#f59e0b',
      umbralSimilitud: 0.45
    },
    {
      numero: 5,
      nombre: 'Palabras Medias',
      descripcion: 'Palabras de 3 sílabas con diferentes sonidos',
      palabras: ['PELOTA', 'CABALLO', 'MANZANA', 'VENTANA', 'TORTUGA'],
      dificultad: 'media',
      icono: '📖',
      color: '#ef4444',
      umbralSimilitud: 0.50
    },
    {
      numero: 6,
      nombre: 'Palabras Difíciles',
      descripcion: 'Desafía tu pronunciación con palabras más largas',
      palabras: ['REFRIGERADOR', 'BICICLETA', 'MARIPOSA', 'DINOSAURIO', 'ELEFANTE'],
      dificultad: 'dificil',
      icono: '🎯',
      color: '#ec4899',
      umbralSimilitud: 0.55
    },
    {
      numero: 7,
      nombre: 'Trabalenguas',
      descripcion: 'El desafío final: frases completas difíciles de pronunciar',
      palabras: ['TRES TRISTES TIGRES', 'PABLITO CLAVO UN CLAVITO', 'EL PERRO DE SAN ROQUE'],
      dificultad: 'dificil',
      icono: '🌪️',
      color: '#6366f1',
      umbralSimilitud: 0.45 // Más permisivo porque son frases largas
    }
  ];
  
  // Animaciones y feedback
  mostrandoFeedback: boolean = false;
  mensajeFeedback: string = '';
  tipoFeedback: 'correcto' | 'incorrecto' | 'cerca' = 'correcto';
  ultimoEscuchado: string = '';
  
  // Text-to-Speech
  synth: SpeechSynthesis | null = null;
  
  // Permisos
  permisoMicrofono: boolean = false;
  errorMicrofono: string = '';

  // Timeouts y control
  escuchandoAudio: boolean = false;
  timeoutEscucha: any = null;
  timeoutGrabacion: any = null;
  
  // Flag para evitar procesamiento múltiple
  private procesandoResultado: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private historialService: HistorialActividadesService
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
    this.procesandoResultado = false;
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
      
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Permiso de micrófono concedido');
      
      // Detener el stream inmediatamente (solo lo usamos para verificar permiso)
      stream.getTracks().forEach(track => track.stop());
      
      this.configurarReconocimiento();
      
      this.permisoMicrofono = true;
      console.log('✅ Reconocimiento de voz configurado');
      
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.ngZone.run(() => {
            this.empezarNivel();
          });
        }, 1500);
      });
      
    } catch (error: any) {
      console.error('❌ Error al configurar reconocimiento:', error);
      this.errorMicrofono = error.message || 'No se pudo acceder al micrófono. Verifica los permisos.';
      this.faseJuego = 'error';
      this.cdr.detectChanges();
    }
  }

  private configurarReconocimiento() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.lang = 'es-ES';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 15; // Más alternativas para mejor detección
    
    this.recognition.onstart = () => {
      this.ngZone.run(() => {
        console.log('🎤 Reconocimiento iniciado');
        this.recognitionActiva = true;
        this.cdr.detectChanges();
      });
    };
    
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('🎤 Resultado recibido');
      this.ngZone.run(() => {
        this.procesarResultado(event);
      });
    };
    
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.ngZone.run(() => {
        console.error('❌ Error en reconocimiento:', event.error);
        
        this.limpiarTimeouts();
        this.resetearEstadosGrabacion();
        
        if (event.error === 'no-speech') {
          this.mostrarFeedbackTemporal('No escuché nada. Intenta de nuevo.', 'incorrecto');
        } else if (event.error === 'aborted') {
          console.log('🎤 Reconocimiento cancelado');
        } else if (event.error === 'audio-capture') {
          this.mostrarFeedbackTemporal('Error de audio. Verifica tu micrófono.', 'incorrecto');
        } else if (event.error === 'not-allowed') {
          this.mostrarFeedbackTemporal('Permiso de micrófono denegado.', 'incorrecto');
        } else if (event.error === 'network') {
          this.mostrarFeedbackTemporal('Error de red. Verifica tu conexión.', 'incorrecto');
        } else {
          this.mostrarFeedbackTemporal('Error al escuchar. Intenta de nuevo.', 'incorrecto');
        }
      });
    };
    
    this.recognition.onend = () => {
      this.ngZone.run(() => {
        console.log('🎤 Reconocimiento finalizado');
        this.limpiarTimeouts();
        this.resetearEstadosGrabacion();
      });
    };
    
    this.recognition.onspeechend = () => {
      console.log('🗣️ Fin de voz detectado');
    };
    
    this.recognition.onnomatch = () => {
      this.ngZone.run(() => {
        console.log('🎤 No se encontró coincidencia');
        this.mostrarFeedbackTemporal('No entendí. Intenta de nuevo.', 'incorrecto');
      });
    };
  }

  private limpiarTimeouts() {
    if (this.timeoutGrabacion) {
      clearTimeout(this.timeoutGrabacion);
      this.timeoutGrabacion = null;
    }
    if (this.timeoutEscucha) {
      clearTimeout(this.timeoutEscucha);
      this.timeoutEscucha = null;
    }
  }

  private resetearEstadosGrabacion() {
    this.esperandoPronunciacion = false;
    this.recognitionActiva = false;
    this.procesandoResultado = false;
    this.cdr.detectChanges();
  }

  empezarNivel() {
    this.faseJuego = 'jugando';
    this.palabrasCompletadas = 0;
    this.indicePalabra = 0;
    this.intentos = [];
    this.procesandoResultado = false;
    
    const nivelData = this.niveles[this.nivelActual - 1];
    this.totalPalabras = nivelData.palabras.length;
    
    this.cargarSiguientePalabra();
    
    console.log(`📖 Nivel ${this.nivelActual}: ${nivelData.nombre} - ${this.totalPalabras} palabras (umbral: ${nivelData.umbralSimilitud * 100}%)`);
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
    this.ultimoEscuchado = '';
    this.procesandoResultado = false;
    
    this.cdr.detectChanges();
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
    
    console.log('🔊 Reproduciendo ejemplo:', this.palabraActual);
    
    this.synth.cancel();
    this.escuchandoAudio = true;
    this.cdr.detectChanges();
    
    // Timeout de seguridad
    this.timeoutEscucha = setTimeout(() => {
      this.ngZone.run(() => {
        console.log('⏰ Timeout de escucha');
        this.escuchandoAudio = false;
        this.cdr.detectChanges();
        if (this.synth) {
          this.synth.cancel();
        }
      });
    }, 8000);
    
    const utterance = new SpeechSynthesisUtterance(this.palabraActual);
    utterance.lang = 'es-ES';
    utterance.rate = 0.7; // Más lento para niños
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    utterance.onend = () => {
      this.ngZone.run(() => {
        console.log('✅ Audio terminado');
        if (this.timeoutEscucha) {
          clearTimeout(this.timeoutEscucha);
          this.timeoutEscucha = null;
        }
        this.escuchandoAudio = false;
        this.cdr.detectChanges();
      });
    };
    
    utterance.onerror = (error) => {
      this.ngZone.run(() => {
        console.error('❌ Error en síntesis:', error);
        if (this.timeoutEscucha) {
          clearTimeout(this.timeoutEscucha);
          this.timeoutEscucha = null;
        }
        this.escuchandoAudio = false;
        this.cdr.detectChanges();
      });
    };
    
    try {
      this.synth.speak(utterance);
    } catch (error) {
      console.error('❌ Error al iniciar síntesis:', error);
      this.escuchandoAudio = false;
      this.cdr.detectChanges();
    }
  }

  empezarGrabacion() {
    if (!this.recognition) {
      console.error('❌ Reconocimiento no disponible');
      this.mostrarFeedbackTemporal('Error de micrófono. Recarga la página.', 'incorrecto');
      return;
    }
    
    if (this.recognitionActiva || this.esperandoPronunciacion || this.procesandoResultado) {
      console.log('⚠️ Ya hay una grabación en curso');
      return;
    }
    
    // Detener audio si está sonando
    if (this.escuchandoAudio && this.synth) {
      this.synth.cancel();
      this.escuchandoAudio = false;
    }
    
    console.log('🎤 Iniciando grabación para:', this.palabraActual);
    
    this.esperandoPronunciacion = true;
    this.recognitionActiva = true;
    this.procesandoResultado = false;
    this.cdr.detectChanges();
    
    // Timeout de seguridad más corto
    this.timeoutGrabacion = setTimeout(() => {
      this.ngZone.run(() => {
        console.log('⏰ Timeout de grabación (10s)');
        this.detenerGrabacion();
        this.mostrarFeedbackTemporal('Tiempo agotado. Intenta de nuevo.', 'incorrecto');
      });
    }, 10000);
    
    try {
      this.recognition.start();
      console.log('🎤 Esperando pronunciación de:', this.palabraActual);
    } catch (error: any) {
      console.error('❌ Error al iniciar grabación:', error);
      this.limpiarTimeouts();
      this.resetearEstadosGrabacion();
      
      // Si el error es porque ya está corriendo, intentar detener y reiniciar
      if (error.message && error.message.includes('already started')) {
        console.log('🔄 Reconocimiento ya iniciado, intentando reiniciar...');
        try {
          this.recognition.stop();
        } catch (e) {
          // Ignorar
        }
      }
    }
  }

  private detenerGrabacion() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.log('No se pudo detener reconocimiento');
      }
    }
    this.limpiarTimeouts();
    this.resetearEstadosGrabacion();
  }

  procesarResultado(event: SpeechRecognitionEvent) {
    // Evitar procesamiento múltiple
    if (this.procesandoResultado) {
      console.log('⚠️ Ya se está procesando un resultado');
      return;
    }
    
    this.procesandoResultado = true;
    console.log('📊 ========== PROCESANDO RESULTADO ==========');
    
    this.limpiarTimeouts();
    
    const results = event.results;
    
    if (!results || results.length === 0) {
      console.error('❌ No hay resultados');
      this.resetearEstadosGrabacion();
      return;
    }
    
    const resultado = results[0];
    
    if (!resultado || resultado.length === 0) {
      console.error('❌ Resultado vacío');
      this.resetearEstadosGrabacion();
      return;
    }
    
    this.esperandoPronunciacion = false;
    this.recognitionActiva = false;
    this.cdr.detectChanges();
    
    const palabraEsperadaNormalizada = this.normalizarTexto(this.palabraActual);
    const nivelData = this.niveles[this.nivelActual - 1];
    const umbralNivel = nivelData.umbralSimilitud;
    const esPalabraCorta = palabraEsperadaNormalizada.length <= 3; // Vocales y sílabas
    
    console.log('🎯 Palabra esperada:', palabraEsperadaNormalizada);
    console.log('📊 Umbral del nivel:', (umbralNivel * 100) + '%');
    console.log('📏 Es palabra corta:', esPalabraCorta);
    console.log('📝 Analizando', resultado.length, 'alternativas...');
    
    let mejorCoincidencia = {
      transcript: '',
      confidence: 0,
      similitud: 0,
      esCorrecto: false,
      normalizado: ''
    };
    
    // Equivalencias válidas para esta palabra
    const equivalenciasValidas = this.equivalencias[palabraEsperadaNormalizada] || [];
    
    for (let i = 0; i < resultado.length; i++) {
      const alt = resultado[i];
      const transcriptNormalizado = this.normalizarTexto(alt.transcript);
      
      // Si no hay nada, saltar
      if (!transcriptNormalizado) continue;
      
      console.log(`  ${i + 1}. "${alt.transcript}" → "${transcriptNormalizado}"`);
      
      // ============ DETECCIÓN PARA PALABRAS CORTAS (Vocales/Sílabas) ============
      if (esPalabraCorta) {
        
        // 1. Coincidencia exacta
        if (transcriptNormalizado === palabraEsperadaNormalizada) {
          console.log('     ✅ EXACTO');
          mejorCoincidencia = { transcript: alt.transcript, confidence: 1, similitud: 1, esCorrecto: true, normalizado: transcriptNormalizado };
          break;
        }
        
        // 2. Está en la lista de equivalencias
        if (equivalenciasValidas.includes(transcriptNormalizado)) {
          console.log('     ✅ EQUIVALENTE');
          mejorCoincidencia = { transcript: alt.transcript, confidence: 0.95, similitud: 0.95, esCorrecto: true, normalizado: transcriptNormalizado };
          break;
        }
        
        // 3. La palabra esperada está CONTENIDA en lo escuchado
        if (transcriptNormalizado.includes(palabraEsperadaNormalizada)) {
          console.log('     ✅ CONTIENE LA PALABRA');
          mejorCoincidencia = { transcript: alt.transcript, confidence: 0.9, similitud: 0.9, esCorrecto: true, normalizado: transcriptNormalizado };
          break;
        }
        
        // 4. Lo escuchado EMPIEZA con la palabra esperada
        if (transcriptNormalizado.startsWith(palabraEsperadaNormalizada)) {
          console.log('     ✅ EMPIEZA CON LA PALABRA');
          mejorCoincidencia = { transcript: alt.transcript, confidence: 0.9, similitud: 0.9, esCorrecto: true, normalizado: transcriptNormalizado };
          break;
        }
        
        // 5. Lo escuchado TERMINA con la palabra esperada
        if (transcriptNormalizado.endsWith(palabraEsperadaNormalizada)) {
          console.log('     ✅ TERMINA CON LA PALABRA');
          mejorCoincidencia = { transcript: alt.transcript, confidence: 0.9, similitud: 0.9, esCorrecto: true, normalizado: transcriptNormalizado };
          break;
        }
        
        // 6. Para VOCALES: verificar si la vocal está en CUALQUIER parte
        if (palabraEsperadaNormalizada.length === 1) {
          const vocal = palabraEsperadaNormalizada;
          if (transcriptNormalizado.includes(vocal)) {
            console.log('     ✅ VOCAL DETECTADA EN:', transcriptNormalizado);
            mejorCoincidencia = { transcript: alt.transcript, confidence: 0.85, similitud: 0.85, esCorrecto: true, normalizado: transcriptNormalizado };
            break;
          }
        }
        
        // 7. Para SÍLABAS: verificar si las letras principales están
        if (palabraEsperadaNormalizada.length === 2 || palabraEsperadaNormalizada.length === 3) {
          const primeraLetra = palabraEsperadaNormalizada[0];
          const segundaLetra = palabraEsperadaNormalizada[1];
          
          // Si contiene las dos primeras letras en orden
          const indexPrimera = transcriptNormalizado.indexOf(primeraLetra);
          const indexSegunda = transcriptNormalizado.indexOf(segundaLetra, indexPrimera + 1);
          
          if (indexPrimera !== -1 && indexSegunda !== -1 && indexSegunda > indexPrimera) {
            console.log('     ✅ SÍLABA DETECTADA (letras en orden)');
            mejorCoincidencia = { transcript: alt.transcript, confidence: 0.8, similitud: 0.8, esCorrecto: true, normalizado: transcriptNormalizado };
            break;
          }
          
          // Si al menos contiene la consonante principal y una vocal
          const consonantes = palabraEsperadaNormalizada.replace(/[AEIOU]/g, '');
          const vocales = palabraEsperadaNormalizada.replace(/[^AEIOU]/g, '');
          
          if (consonantes && vocales) {
            const tieneConsonante = transcriptNormalizado.includes(consonantes[0]);
            const tieneVocal = vocales.split('').some(v => transcriptNormalizado.includes(v));
            
            if (tieneConsonante && tieneVocal) {
              console.log('     ✅ SÍLABA DETECTADA (consonante + vocal)');
              if (mejorCoincidencia.similitud < 0.75) {
                mejorCoincidencia = { transcript: alt.transcript, confidence: 0.75, similitud: 0.75, esCorrecto: true, normalizado: transcriptNormalizado };
              }
            }
          }
        }
        
        // 8. Calcular similitud de todas formas
        const similitud = this.calcularSimilitud(transcriptNormalizado, palabraEsperadaNormalizada);
        console.log(`     Similitud: ${(similitud * 100).toFixed(0)}%`);
        
        if (similitud > mejorCoincidencia.similitud) {
          mejorCoincidencia = {
            transcript: alt.transcript,
            confidence: alt.confidence || 0.5,
            similitud: similitud,
            esCorrecto: similitud >= 0.6, // 60% para palabras cortas
            normalizado: transcriptNormalizado
          };
        }
        
      } else {
        // ============ DETECCIÓN PARA PALABRAS LARGAS ============
        
        // 1. Coincidencia exacta
        if (transcriptNormalizado === palabraEsperadaNormalizada) {
          console.log('     ✅ EXACTO');
          mejorCoincidencia = { transcript: alt.transcript, confidence: 1, similitud: 1, esCorrecto: true, normalizado: transcriptNormalizado };
          break;
        }
        
        // 2. Equivalencias
        if (equivalenciasValidas.includes(transcriptNormalizado)) {
          console.log('     ✅ EQUIVALENTE');
          mejorCoincidencia = { transcript: alt.transcript, confidence: 0.95, similitud: 0.95, esCorrecto: true, normalizado: transcriptNormalizado };
          break;
        }
        
        // 3. Contiene la palabra
        if (transcriptNormalizado.includes(palabraEsperadaNormalizada)) {
          console.log('     ✅ CONTIENE');
          mejorCoincidencia = { transcript: alt.transcript, confidence: 0.9, similitud: 0.9, esCorrecto: true, normalizado: transcriptNormalizado };
          break;
        }
        
        // 4. Calcular similitud
        const similitud = this.calcularSimilitud(transcriptNormalizado, palabraEsperadaNormalizada);
        console.log(`     Similitud: ${(similitud * 100).toFixed(0)}%`);
        
        if (similitud > mejorCoincidencia.similitud) {
          mejorCoincidencia = {
            transcript: alt.transcript,
            confidence: alt.confidence || 0.5,
            similitud: similitud,
            esCorrecto: similitud >= 0.85,
            normalizado: transcriptNormalizado
          };
        }
      }
    }
    
    console.log('🏆 MEJOR COINCIDENCIA:');
    console.log('   Escuchado:', mejorCoincidencia.transcript);
    console.log('   Normalizado:', mejorCoincidencia.normalizado);
    console.log('   Similitud:', (mejorCoincidencia.similitud * 100).toFixed(0) + '%');
    console.log('   Correcto:', mejorCoincidencia.esCorrecto);
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
    
    // Evaluar resultado
    if (mejorCoincidencia.esCorrecto) {
      this.palabraCorrecta(mejorCoincidencia.confidence);
    } else if (mejorCoincidencia.similitud >= umbralNivel) {
      this.palabraCerca(mejorCoincidencia.transcript, mejorCoincidencia.similitud);
    } else {
      this.palabraIncorrecta(mejorCoincidencia.transcript);
    }
  }

  normalizarTexto(texto: string): string {
    if (!texto) return '';
    
    // Quitar acentos
    const sinAcentos = texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    // Convertir a mayúsculas
    const mayusculas = sinAcentos.toUpperCase();
    
    // Quitar puntuación
    const sinPuntuacion = mayusculas
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()¿?¡!"""''´`]/g, '');
    
    // Normalizar espacios
    const resultado = sinPuntuacion
      .replace(/\s+/g, ' ')
      .trim();
    
    return resultado;
  }

  calcularSimilitud(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    // Distancia de Levenshtein
    const editDistance = this.levenshteinDistance(longer, shorter);
    const similitudLevenshtein = (longer.length - editDistance) / longer.length;
    
    // Porcentaje de letras coincidentes
    const letrasEsperadas = new Set(str2.split(''));
    const letrasEncontradas = str1.split('').filter(letra => letrasEsperadas.has(letra));
    const porcentajeLetras = str2.length > 0 ? letrasEncontradas.length / str2.length : 0;
    
    // Combinar ambas métricas
    const similitudFinal = (similitudLevenshtein * 0.6) + (Math.min(porcentajeLetras, 1) * 0.4);
    
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
    
    this.ultimoEscuchado = '';
    this.mostrarFeedbackTemporal('¡Excelente! 🎉', 'correcto');
    
    this.palabrasCompletadas++;
    this.indicePalabra++;
    
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
    
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.procesandoResultado = false;
          this.cargarSiguientePalabra();
        });
      }, 1800);
    });
  }

  palabraCerca(escuchado: string, similitud: number) {
    console.log('🟡🟡🟡 PALABRA CASI CORRECTA 🟡🟡🟡');
    console.log('🟡 Similitud:', (similitud * 100).toFixed(0) + '%');
    
    this.ultimoEscuchado = escuchado;
    this.mostrarFeedbackTemporal('¡Casi! Inténtalo de nuevo 💪', 'cerca');
    
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.procesandoResultado = false;
          this.cdr.detectChanges();
        });
      }, 2000);
    });
  }

  palabraIncorrecta(escuchado: string) {
    console.log('❌❌❌ PALABRA INCORRECTA ❌❌❌');
    
    this.ultimoEscuchado = escuchado;
    this.mostrarFeedbackTemporal('Intenta de nuevo 🔄', 'incorrecto');
    
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.procesandoResultado = false;
          this.cdr.detectChanges();
        });
      }, 2000);
    });
  }

  mostrarFeedbackTemporal(mensaje: string, tipo: 'correcto' | 'incorrecto' | 'cerca') {
    this.mensajeFeedback = mensaje;
    this.tipoFeedback = tipo;
    this.mostrandoFeedback = true;
    this.cdr.detectChanges();
    
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.mostrandoFeedback = false;
          this.cdr.detectChanges();
        });
      }, 2500);
    });
  }

  completarNivel() {
    this.faseJuego = 'preparando';
    console.log(`✅ Nivel ${this.nivelActual} completado`);
    
    if (this.modoJuego === 'todos' && this.nivelActual < this.maxNiveles) {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.ngZone.run(() => {
            this.nivelActual++;
            this.empezarNivel();
          });
        }, 2000);
      });
    } else {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.ngZone.run(() => {
            this.completarJuego();
          });
        }, 2000);
      });
    }
  }

  completarJuego() {
    this.faseJuego = 'completado';
    console.log('🎉 ¡Juego completado!');
    
    this.historialService.registrarJuego('Reto de Pronunciación').subscribe({
      next: () => console.log('✅ Reto de Pronunciación registrado en historial'),
      error: (error: any) => console.error('❌ Error registrando actividad:', error)
    });
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
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.solicitarPermisoMicrofono();
        });
      }, 500);
    });
  }

  resetearEstadosBotones() {
    console.log('🔄 Reseteando estados manualmente...');
    
    this.escuchandoAudio = false;
    this.esperandoPronunciacion = false;
    this.recognitionActiva = false;
    this.procesandoResultado = false;
    
    this.limpiarTimeouts();
    
    if (this.synth) {
      this.synth.cancel();
    }
    
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignorar
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
    if (this.faseJuego === 'jugando' || this.faseJuego === 'completado') {
      this.limpiarRecursos();
      this.faseJuego = 'seleccion-nivel';
    } else {
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
    console.log('🧹 Limpiando recursos...');
    
    this.limpiarTimeouts();
    
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignorar
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
    this.procesandoResultado = false;
    
    console.log('✅ Recursos limpiados');
  }
}