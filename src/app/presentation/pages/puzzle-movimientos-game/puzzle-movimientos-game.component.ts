import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

interface MovimientoLingual {
  id: string;
  nombre: string;
  descripcion: string;
  emoji: string;
  instruccion: string;
  orden: number;
}

interface SecuenciaEjercicio {
  id: string;
  nombre: string;
  descripcion: string;
  movimientos: MovimientoLingual[];
  dificultad: 'facil' | 'medio' | 'dificil';
  categoria: string;
}

interface MovimientoDraggable extends MovimientoLingual {
  posicionActual: number;
  posicionCorrecta: number;
  colocado: boolean;
  arrastrando: boolean;
}

@Component({
  selector: 'app-puzzle-movimientos-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './puzzle-movimientos-game.component.html',
  styleUrls: ['./puzzle-movimientos-game.component.css']
})
export class PuzzleMovimientosGameComponent implements OnInit, OnDestroy {
  // Estados del juego
  faseJuego: 'instrucciones' | 'jugando' | 'verificando' | 'completado' = 'instrucciones';
  nivelActual: number = 1;
  maxNiveles: number = 6;
  puntaje: number = 0;
  vidas: number = 3;
  tiempoInicio: number = 0;
  tiempoTranscurrido: number = 0;
  tiempoLimite: number = 120; // 2 minutos por nivel
  intervaloTiempo: any;
  
  // Secuencias de ejercicios
  secuenciasDisponibles: SecuenciaEjercicio[] = [
    {
      id: 'secuencia-basica-1',
      nombre: 'Movimientos Básicos',
      descripcion: 'Secuencia básica de ejercicios linguales',
      dificultad: 'facil',
      categoria: 'basico',
      movimientos: [
        {
          id: 'sacar-lengua',
          nombre: 'Sacar Lengua',
          descripcion: 'Sacar la lengua hacia afuera',
          emoji: '👅',
          instruccion: 'Saca la lengua hacia afuera',
          orden: 1
        },
        {
          id: 'tocar-nariz',
          nombre: 'Tocar Nariz',
          descripcion: 'Tocar la nariz con la lengua',
          emoji: '👃',
          instruccion: 'Toca tu nariz con la lengua',
          orden: 2
        },
        {
          id: 'lengua-adentro',
          nombre: 'Meter Lengua',
          descripcion: 'Meter la lengua hacia adentro',
          emoji: '😮',
          instruccion: 'Mete la lengua hacia adentro',
          orden: 3
        }
      ]
    },
    {
      id: 'secuencia-lateral-1',
      nombre: 'Movimientos Laterales',
      descripcion: 'Ejercicios de movimiento lateral de lengua',
      dificultad: 'medio',
      categoria: 'lateral',
      movimientos: [
        {
          id: 'lengua-izquierda',
          nombre: 'Mover Izquierda',
          descripcion: 'Mover lengua hacia la izquierda',
          emoji: '⬅️',
          instruccion: 'Mueve la lengua hacia la izquierda',
          orden: 1
        },
        {
          id: 'lengua-centro',
          nombre: 'Posición Central',
          descripcion: 'Regresar lengua al centro',
          emoji: '⬆️',
          instruccion: 'Pon la lengua en el centro',
          orden: 2
        },
        {
          id: 'lengua-derecha',
          nombre: 'Mover Derecha',
          descripcion: 'Mover lengua hacia la derecha',
          emoji: '➡️',
          instruccion: 'Mueve la lengua hacia la derecha',
          orden: 3
        },
        {
          id: 'lengua-centro-final',
          nombre: 'Centro Final',
          descripcion: 'Regresar al centro y relajar',
          emoji: '😌',
          instruccion: 'Regresa al centro y relaja',
          orden: 4
        }
      ]
    },
    {
      id: 'secuencia-avanzada-1',
      nombre: 'Movimientos Avanzados',
      descripcion: 'Secuencia compleja de ejercicios linguales',
      dificultad: 'dificil',
      categoria: 'avanzado',
      movimientos: [
        {
          id: 'lengua-labio-superior',
          nombre: 'Tocar Labio Superior',
          descripcion: 'Tocar el labio superior con la lengua',
          emoji: '⬆️',
          instruccion: 'Toca tu labio superior',
          orden: 1
        },
        {
          id: 'movimiento-circular',
          nombre: 'Movimiento Circular',
          descripcion: 'Hacer círculos con la lengua',
          emoji: '🔄',
          instruccion: 'Haz círculos con la lengua',
          orden: 2
        },
        {
          id: 'chasquido-lengua',
          nombre: 'Chasquido',
          descripcion: 'Hacer chasquido con la lengua',
          emoji: '👏',
          instruccion: 'Haz un chasquido con la lengua',
          orden: 3
        },
        {
          id: 'lengua-labio-inferior',
          nombre: 'Tocar Labio Inferior',
          descripcion: 'Tocar el labio inferior con la lengua',
          emoji: '⬇️',
          instruccion: 'Toca tu labio inferior',
          orden: 4
        },
        {
          id: 'vibrar-lengua',
          nombre: 'Vibrar Lengua',
          descripcion: 'Hacer vibrar la lengua',
          emoji: '🌪️',
          instruccion: 'Haz vibrar tu lengua',
          orden: 5
        }
      ]
    }
  ];
  
  // Estado actual del puzzle
  secuenciaActual: SecuenciaEjercicio | null = null;
  movimientosArrastrable: MovimientoDraggable[] = [];
  zonasDestino: (string | null)[] = [];
  movimientoArrastrado: MovimientoDraggable | null = null;
  secuenciaCompleta: boolean = false;
  
  // Progreso y estadísticas
  intentos: number = 0;
  puntajePorNivel: number = 0;
  tiempoCompletado: number = 0;
  puzzlesCompletados: number = 0;
  secuenciasCorrectas: number = 0;
  mostrarPista: boolean = false;
  
  // Audio y efectos
  sonidosHabilitados: boolean = true;
  efectosVisuales: boolean = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.iniciarJuego();
  }

  ngOnDestroy() {
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
  }

  // === INICIALIZACIÓN DEL JUEGO ===
  
  iniciarJuego() {
    this.faseJuego = 'instrucciones';
    this.nivelActual = 1;
    this.puntaje = 0;
    this.vidas = 3;
    this.intentos = 0;
    this.puzzlesCompletados = 0;
    this.secuenciasCorrectas = 0;
    this.tiempoTranscurrido = 0;
    
    console.log('🎮 Iniciando Puzzle de Movimientos...');
  }

  empezarNivel() {
    this.faseJuego = 'jugando';
    this.cargarSecuencia();
    this.iniciarTemporizador();
    
    console.log(`🆙 Iniciando nivel ${this.nivelActual}`);
  }

  cargarSecuencia() {
    // Seleccionar secuencia según el nivel
    const indiceSecuencia = Math.min(this.nivelActual - 1, this.secuenciasDisponibles.length - 1);
    this.secuenciaActual = this.secuenciasDisponibles[indiceSecuencia];
    
    if (!this.secuenciaActual) return;
    
    // Crear movimientos arrastrables
    this.crearMovimientosArrastrables();
    
    // Inicializar zonas de destino
    this.zonasDestino = new Array(this.secuenciaActual.movimientos.length).fill(null);
    
    this.secuenciaCompleta = false;
    this.mostrarPista = false;
    this.puntajePorNivel = 0;
    this.tiempoInicio = Date.now();
    
    console.log(`📝 Secuencia cargada: ${this.secuenciaActual.nombre} (${this.secuenciaActual.movimientos.length} movimientos)`);
  }

  crearMovimientosArrastrables() {
    if (!this.secuenciaActual) return;
    
    this.movimientosArrastrable = this.secuenciaActual.movimientos.map((movimiento, index) => ({
      ...movimiento,
      posicionActual: -1, // No colocado
      posicionCorrecta: index,
      colocado: false,
      arrastrando: false
    }));
    
    // Mezclar orden para hacer el puzzle
    this.mezclarMovimientos();
  }

  mezclarMovimientos() {
    for (let i = this.movimientosArrastrable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.movimientosArrastrable[i], this.movimientosArrastrable[j]] = 
      [this.movimientosArrastrable[j], this.movimientosArrastrable[i]];
    }
  }

  // === FUNCIONALIDAD DRAG & DROP ===
  
  onDragStart(event: DragEvent, movimiento: MovimientoDraggable) {
    this.movimientoArrastrado = movimiento;
    movimiento.arrastrando = true;
    
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', movimiento.id);
    }
    
    console.log(`🫴 Arrastrando: ${movimiento.nombre}`);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDrop(event: DragEvent, posicionDestino: number) {
    event.preventDefault();
    
    if (!this.movimientoArrastrado || this.movimientoArrastrado.arrastrando === false) {
      return;
    }
    
    // Verificar si la zona ya está ocupada
    if (this.zonasDestino[posicionDestino] !== null) {
      this.intercambiarPosiciones(posicionDestino);
    } else {
      this.colocarEnZona(posicionDestino);
    }
    
    // Limpiar estado de arrastre
    this.movimientoArrastrado.arrastrando = false;
    this.movimientoArrastrado = null;
  }

  colocarEnZona(posicionDestino: number) {
    if (!this.movimientoArrastrado) return;
    
    // Remover de posición anterior si tenía una
    if (this.movimientoArrastrado.posicionActual !== -1) {
      this.zonasDestino[this.movimientoArrastrado.posicionActual] = null;
    }
    
    // Colocar en nueva posición
    this.movimientoArrastrado.posicionActual = posicionDestino;
    this.movimientoArrastrado.colocado = true;
    this.zonasDestino[posicionDestino] = this.movimientoArrastrado.id;
    
    console.log(`📍 ${this.movimientoArrastrado.nombre} colocado en posición ${posicionDestino + 1}`);
  }

  intercambiarPosiciones(posicionDestino: number) {
    if (!this.movimientoArrastrado) return;
    
    const posicionAnterior = this.movimientoArrastrado.posicionActual;
    
    // Intercambiar las posiciones en el array
    const movimientoEnDestino = this.movimientosArrastrable.find(m => m.posicionActual === posicionDestino);
    
    if (movimientoEnDestino) {
      movimientoEnDestino.posicionActual = posicionAnterior;
      this.zonasDestino[posicionAnterior] = movimientoEnDestino.id;
    }
    
    // Actualizar zonas
    this.movimientoArrastrado.posicionActual = posicionDestino;
    this.zonasDestino[posicionDestino] = this.movimientoArrastrado.id;
  }

  // === VERIFICACIÓN DE SECUENCIA ===
  
  verificarSecuencia() {
    if (!this.secuenciaActual) return;
    
    this.faseJuego = 'verificando';
    this.intentos++;
    
    // Verificar si todos los movimientos están colocados
    const todosColocados = this.movimientosArrastrable.every(m => m.colocado);
    if (!todosColocados) {
      this.mostrarError('¡Coloca todos los movimientos!');
      return;
    }
    
    // Verificar orden correcto
    let secuenciaCorrecta = true;
    
    for (let i = 0; i < this.zonasDestino.length; i++) {
      const movimientoId = this.zonasDestino[i];
      const movimientoEsperado = this.secuenciaActual.movimientos[i];
      
      if (movimientoId !== movimientoEsperado.id) {
        secuenciaCorrecta = false;
        break;
      }
    }
    
    if (secuenciaCorrecta) {
      this.secuenciaCompletada();
    } else {
      this.secuenciaIncorrecta();
    }
  }

  secuenciaCompletada() {
    this.secuenciaCompleta = true;
    this.secuenciasCorrectas++;
    this.puzzlesCompletados++;
    
    // Calcular puntaje
    this.tiempoCompletado = (Date.now() - this.tiempoInicio) / 1000;
    this.calcularPuntaje();
    
    console.log(`✅ ¡Secuencia completada! Puntaje: +${this.puntajePorNivel}`);
    
    setTimeout(() => {
      this.siguienteNivel();
    }, 2000);
  }

  secuenciaIncorrecta() {
    console.log('❌ Secuencia incorrecta');
    
    // Mostrar pista después de varios intentos
    if (this.intentos >= 3) {
      this.mostrarPista = true;
    }
    
    // Perder vida después de muchos intentos
    if (this.intentos >= 5) {
      this.perderVida();
    } else {
      this.faseJuego = 'jugando';
    }
  }

  mostrarError(mensaje: string) {
    console.log(`⚠️ ${mensaje}`);
    this.faseJuego = 'jugando';
  }

  // === PROGRESIÓN DE NIVELES ===
  
  siguienteNivel() {
    if (this.nivelActual >= this.maxNiveles) {
      this.juegoCompletado();
      return;
    }
    
    this.nivelActual++;
    this.intentos = 0;
    this.mostrarPista = false;
    
    this.cargarSecuencia();
    this.faseJuego = 'jugando';
    
    console.log(`🆙 Avanzando al nivel ${this.nivelActual}`);
  }

  perderVida() {
    this.vidas--;
    console.log(`💔 Vida perdida. Vidas restantes: ${this.vidas}`);
    
    if (this.vidas <= 0) {
      this.juegoTerminado();
    } else {
      // Reiniciar nivel actual
      this.intentos = 0;
      this.cargarSecuencia();
      this.faseJuego = 'jugando';
    }
  }

  juegoTerminado() {
    this.faseJuego = 'completado';
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
    
    console.log(`💀 Juego terminado. Puntaje final: ${this.puntaje}`);
  }

  juegoCompletado() {
    this.faseJuego = 'completado';
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
    
    console.log(`🎉 ¡Juego completado! Puntaje final: ${this.puntaje}`);
  }

  // === SISTEMA DE TIEMPO ===
  
  iniciarTemporizador() {
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
    
    this.intervaloTiempo = setInterval(() => {
      this.tiempoTranscurrido++;
      
      if (this.tiempoTranscurrido >= this.tiempoLimite) {
        this.perderVida();
      }
    }, 1000);
  }

  obtenerTiempoRestante(): number {
    return Math.max(0, this.tiempoLimite - this.tiempoTranscurrido);
  }

  formatearTiempo(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  }

  // === SISTEMA DE PUNTAJE ===
  
  calcularPuntaje() {
    if (!this.secuenciaActual) return;
    
    let puntajeBase = 100;
    
    // Bonus por dificultad
    switch (this.secuenciaActual.dificultad) {
      case 'facil': puntajeBase = 100; break;
      case 'medio': puntajeBase = 200; break;
      case 'dificil': puntajeBase = 300; break;
    }
    
    // Bonus por velocidad
    const bonusVelocidad = Math.max(0, 50 - Math.floor(this.tiempoCompletado));
    
    // Bonus por pocos intentos
    const bonusIntentos = Math.max(0, (5 - this.intentos) * 20);
    
    // Bonus por nivel
    const bonusNivel = this.nivelActual * 10;
    
    this.puntajePorNivel = puntajeBase + bonusVelocidad + bonusIntentos + bonusNivel;
    this.puntaje += this.puntajePorNivel;
  }

  obtenerEstrellas(): number {
    if (this.vidas >= 3 && this.nivelActual >= this.maxNiveles && this.puntaje >= 4000) return 3;
    if (this.vidas >= 2 && this.nivelActual >= 4 && this.puntaje >= 2500) return 2;
    if (this.puntaje >= 1500) return 1;
    return 0;
  }

  getIntentosPromedio(): string {
    return (this.intentos / Math.max(1, this.puzzlesCompletados)).toFixed(1);
  }

  // === UTILIDADES ADICIONALES ===
  
  obtenerMovimientoPorId(id: string): MovimientoDraggable | null {
    return this.movimientosArrastrable.find(m => m.id === id) || null;
  }

  obtenerPorcentajeProgreso(): number {
    return Math.round((this.nivelActual / this.maxNiveles) * 100);
  }

  // === NAVEGACIÓN ===
  
  reiniciarJuego() {
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
    this.iniciarJuego();
  }

  volverAJuegos() {
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
    this.router.navigate(['/juegos-terapeuticos']);
  }

  siguienteJuego() {
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
    this.router.navigate(['/juego', 'linguales', 'ritmo-silabas']);
  }

  saltarInstrucciones() {
    this.empezarNivel();
  }
}