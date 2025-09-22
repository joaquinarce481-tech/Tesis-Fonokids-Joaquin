import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Lengua {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  tiempoAparicion: number;
  tiempoVida: number;
  capturada: boolean;
  tipo: 'normal' | 'especial' | 'bonus';
}

@Component({
  selector: 'app-atrapa-lengua-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atrapa-lengua-game.component.html',
  styleUrls: ['./atrapa-lengua-game.component.css']
})
export class AtrapaLenguaGameComponent implements OnInit, OnDestroy {
  // Estados del juego
  faseJuego: 'instrucciones' | 'preparando' | 'jugando' | 'completado' = 'instrucciones';
  nivelActual: number = 1;
  maxNiveles: number = 8;
  puntaje: number = 0;
  combo: number = 0;
  maxCombo: number = 0;
  vidas: number = 3;
  tiempoInicio: number = 0;
  tiempoTranscurrido: number = 0;
  tiempoJuego: number = 45; // segundos por nivel
  intervaloTiempo: any;
  
  // Lenguas
  lenguas: Lengua[] = [];
  lenguasCapturadas: number = 0;
  lenguasPerdidas: number = 0;
  objetivoLenguas: number = 15; // lenguas a capturar por nivel
  
  // Configuración de juego
  velocidadAparicion: number = 2000; // milisegundos entre apariciones
  tiempoVidaLengua: number = 1500; // tiempo que la lengua está visible
  maxLenguasSimultaneas: number = 3;
  
  // Efectos y animaciones
  efectosVisuales: any[] = [];
  intervalos: any[] = [];
  
  // Audio feedback
  sonidosHabilitados: boolean = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.iniciarJuego();
  }

  ngOnDestroy() {
    this.limpiarIntervalos();
  }

  // === INICIALIZACIÓN ===
  
  iniciarJuego() {
    this.tiempoInicio = Date.now();
    this.puntaje = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.vidas = 3;
    this.nivelActual = 1;
    this.lenguasCapturadas = 0;
    this.lenguasPerdidas = 0;
    this.faseJuego = 'instrucciones';
    this.lenguas = [];
    this.efectosVisuales = [];
    
    console.log('👅 Juego "Atrapa la Lengua" iniciado');
  }

  empezarNivel() {
    this.faseJuego = 'preparando';
    this.tiempoInicio = Date.now();
    this.tiempoTranscurrido = 0;
    this.lenguas = [];
    this.efectosVisuales = [];
    this.lenguasCapturadas = 0;
    this.lenguasPerdidas = 0;
    
    // Ajustar dificultad por nivel
    this.ajustarDificultad();
    
    console.log(`🎯 Nivel ${this.nivelActual}: Objetivo ${this.objetivoLenguas} lenguas`);
    
    // Countdown
    this.mostrarCountdown();
  }

  ajustarDificultad() {
    // Velocidad de aparición: más rápido en niveles altos
    this.velocidadAparicion = Math.max(800, 2000 - (this.nivelActual * 150));
    
    // Tiempo de vida: menos tiempo en niveles altos
    this.tiempoVidaLengua = Math.max(800, 1500 - (this.nivelActual * 80));
    
    // Más lenguas simultáneas en niveles altos
    this.maxLenguasSimultaneas = Math.min(6, 3 + Math.floor(this.nivelActual / 2));
    
    // Más lenguas objetivo en niveles altos
    this.objetivoLenguas = 15 + (this.nivelActual * 3);
  }

  mostrarCountdown() {
    let contador = 3;
    
    const intervaloCountdown = setInterval(() => {
      if (contador <= 0) {
        clearInterval(intervaloCountdown);
        this.iniciarJuegoActivo();
      }
      contador--;
    }, 1000);
    
    this.intervalos.push(intervaloCountdown);
  }

  iniciarJuegoActivo() {
    this.faseJuego = 'jugando';
    
    // Iniciar temporizador principal
    this.iniciarTemporizador();
    
    // Iniciar generación de lenguas
    this.iniciarGeneracionLenguas();
  }

  // === CONTROL DE TIEMPO ===
  
  iniciarTemporizador() {
    this.intervaloTiempo = setInterval(() => {
      this.tiempoTranscurrido = Math.floor((Date.now() - this.tiempoInicio) / 1000);
      
      if (this.tiempoTranscurrido >= this.tiempoJuego) {
        this.finalizarNivel();
      }
    }, 100);
    
    this.intervalos.push(this.intervaloTiempo);
  }

  // === GENERACIÓN DE LENGUAS ===
  
  iniciarGeneracionLenguas() {
    const intervaloGeneracion = setInterval(() => {
      if (this.faseJuego === 'jugando' && this.lenguas.filter(l => l.visible).length < this.maxLenguasSimultaneas) {
        this.generarLengua();
      }
    }, this.velocidadAparicion);
    
    this.intervalos.push(intervaloGeneracion);
  }

  generarLengua() {
    const lengua: Lengua = {
      id: `lengua-${Date.now()}-${Math.random()}`,
      x: Math.random() * (window.innerWidth - 100) + 50,
      y: Math.random() * (window.innerHeight - 300) + 150, // Evitar header y footer
      visible: true,
      tiempoAparicion: Date.now(),
      tiempoVida: this.tiempoVidaLengua,
      capturada: false,
      tipo: this.determinarTipoLengua()
    };
    
    this.lenguas.push(lengua);
    
    // Programar desaparición
    setTimeout(() => {
      if (!lengua.capturada && lengua.visible) {
        this.lenguaDesaparece(lengua);
      }
    }, this.tiempoVidaLengua);
  }

  determinarTipoLengua(): 'normal' | 'especial' | 'bonus' {
    const rand = Math.random();
    
    if (rand < 0.1) return 'bonus'; // 10% bonus (más puntos)
    if (rand < 0.25) return 'especial'; // 15% especial (combo multiplier)
    return 'normal'; // 75% normal
  }

  // === INTERACCIÓN ===
  
  capturarLengua(lengua: Lengua, event: MouseEvent) {
    if (!lengua.visible || lengua.capturada || this.faseJuego !== 'jugando') return;
    
    event.preventDefault();
    event.stopPropagation();
    
    lengua.capturada = true;
    lengua.visible = false;
    this.lenguasCapturadas++;
    
    // Calcular puntos
    const puntosBase = this.calcularPuntos(lengua);
    this.puntaje += puntosBase;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    
    // Efectos visuales
    this.mostrarEfectoCaptura(lengua, puntosBase);
    
    // Efectos de sonido
    this.reproducirSonidoCaptura(lengua.tipo);
    
    // Vibración
    if ('vibrate' in navigator) {
      const vibracion = lengua.tipo === 'bonus' ? [50, 30, 50] : [50];
      navigator.vibrate(vibracion);
    }
    
    console.log(`👅 Lengua capturada! +${puntosBase} puntos. Combo: ${this.combo}`);
    
    // Verificar si se completó el objetivo
    if (this.lenguasCapturadas >= this.objetivoLenguas) {
      setTimeout(() => this.completarNivel(), 300);
    }
  }

  calcularPuntos(lengua: Lengua): number {
    let puntos = 50; // Puntos base
    
    // Multiplicador por tipo
    switch (lengua.tipo) {
      case 'especial':
        puntos = 75;
        break;
      case 'bonus':
        puntos = 100;
        break;
    }
    
    // Multiplicador por combo
    const multiplicadorCombo = Math.min(3, 1 + (this.combo * 0.1));
    puntos = Math.floor(puntos * multiplicadorCombo);
    
    // Bonus por velocidad de reacción
    const tiempoReaccion = Date.now() - lengua.tiempoAparicion;
    if (tiempoReaccion < 500) {
      puntos += 25; // Bonus por reacción rápida
    }
    
    return puntos;
  }

  lenguaDesaparece(lengua: Lengua) {
    if (lengua.capturada) return;
    
    lengua.visible = false;
    this.lenguasPerdidas++;
    this.combo = 0; // Romper combo
    
    // Perder vida si se pierden muchas lenguas
    if (this.lenguasPerdidas > 0 && this.lenguasPerdidas % 5 === 0) {
      this.perderVida();
    }
    
    console.log(`👅 Lengua perdida. Total perdidas: ${this.lenguasPerdidas}`);
  }

  perderVida() {
    this.vidas--;
    this.mostrarEfectoPerderVida();
    
    if (this.vidas <= 0) {
      this.gameOver();
    }
  }

  // === FINALIZACIÓN DE NIVELES ===
  
  finalizarNivel() {
    if (this.lenguasCapturadas >= this.objetivoLenguas) {
      this.completarNivel();
    } else {
      this.fallarNivel();
    }
  }

  completarNivel() {
    this.faseJuego = 'preparando';
    this.limpiarIntervalos();
    
    // Bonificaciones
    const bonusTiempo = Math.max(0, (this.tiempoJuego - this.tiempoTranscurrido) * 10);
    const bonusCombo = this.maxCombo * 20;
    const bonusNivel = this.nivelActual * 100;
    
    this.puntaje += bonusTiempo + bonusCombo + bonusNivel;
    
    console.log(`✅ Nivel ${this.nivelActual} completado!`);
    console.log(`📊 Lenguas capturadas: ${this.lenguasCapturadas}/${this.objetivoLenguas}`);
    
    if (this.nivelActual >= this.maxNiveles) {
      setTimeout(() => this.completarJuego(), 2000);
    } else {
      setTimeout(() => {
        this.nivelActual++;
        this.empezarNivel();
      }, 2500);
    }
  }

  fallarNivel() {
    this.perderVida();
    
    if (this.vidas > 0) {
      // Reintentar nivel
      setTimeout(() => {
        this.empezarNivel();
      }, 2000);
    }
  }

  completarJuego() {
    this.faseJuego = 'completado';
    this.limpiarIntervalos();
    
    // Bonus final
    const bonusVidas = this.vidas * 500;
    const bonusComboMax = this.maxCombo * 100;
    this.puntaje += bonusVidas + bonusComboMax;
    
    console.log('🎉 ¡Juego completado!');
    console.log(`📊 Puntaje final: ${this.puntaje}`);
  }

  gameOver() {
    this.faseJuego = 'completado';
    this.limpiarIntervalos();
    console.log('💔 Game Over');
  }

  // === EFECTOS VISUALES ===
  
  mostrarEfectoCaptura(lengua: Lengua, puntos: number) {
    const efecto = {
      id: Math.random(),
      x: lengua.x,
      y: lengua.y,
      puntos: puntos,
      tipo: lengua.tipo,
      tiempo: Date.now()
    };
    
    this.efectosVisuales.push(efecto);
    
    // Remover efecto después de la animación
    setTimeout(() => {
      this.efectosVisuales = this.efectosVisuales.filter(e => e.id !== efecto.id);
    }, 1000);
  }

  mostrarEfectoPerderVida() {
    // Efecto visual cuando se pierde una vida
    console.log('💔 Vida perdida');
  }

  // === AUDIO ===
  
  reproducirSonidoCaptura(tipo: string) {
    if (!this.sonidosHabilitados) return;
    
    // Aquí se pueden agregar sonidos reales
    console.log(`🔊 Sonido: captura-${tipo}`);
  }

  // === UTILIDADES ===
  
  getTiempoRestante(): number {
    return Math.max(0, this.tiempoJuego - this.tiempoTranscurrido);
  }

  getProgreso(): number {
    return Math.min(100, (this.lenguasCapturadas / this.objetivoLenguas) * 100);
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getEstrellas(): number {
    if (this.vidas >= 3 && this.nivelActual >= this.maxNiveles && this.puntaje >= 5000) return 3;
    if (this.vidas >= 2 && this.nivelActual >= 5 && this.puntaje >= 3000) return 2;
    if (this.puntaje >= 1500) return 1;
    return 0;
  }

  // === NAVEGACIÓN ===
  
  reiniciarJuego() {
    this.limpiarIntervalos();
    this.iniciarJuego();
  }

  volverAJuegos() {
    this.limpiarIntervalos();
    this.router.navigate(['/juegos-terapeuticos']);
  }

  siguienteJuego() {
    this.limpiarIntervalos();
    this.router.navigate(['/juego', 'linguales', 'puzzle-movimientos']);
  }

  saltarInstrucciones() {
    this.empezarNivel();
  }

  // === LIMPIEZA ===
  
  limpiarIntervalos() {
    this.intervalos.forEach(intervalo => clearInterval(intervalo));
    this.intervalos = [];
    
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
      this.intervaloTiempo = null;
    }
  }
}