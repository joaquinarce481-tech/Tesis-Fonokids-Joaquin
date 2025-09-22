import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Silaba {
  id: string;
  texto: string;
  sonido: string;
  tecla: string;
  color: string;
  emoji: string;
}

interface SilabaCayendo {
  id: string;
  silaba: Silaba;
  carril: number;
  posicionY: number;
  velocidad: number;
  activa: boolean;
  golpeada: boolean;
  tiempoCreacion: number;
}

interface NotaGolpeada {
  precision: 'perfecto' | 'bueno' | 'regular' | 'fallo';
  puntos: number;
  tiempo: number;
  posicion: { x: number; y: number };
}

@Component({
  selector: 'app-ritmo-silabas-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ritmo-silabas-game.component.html',
  styleUrls: ['./ritmo-silabas-game.component.css']
})
export class RitmoSilabasGameComponent implements OnInit, OnDestroy {
  // Estados del juego
  readonly Math = Math;
  faseJuego: 'instrucciones' | 'countdown' | 'jugando' | 'pausado' | 'completado' = 'instrucciones';
  nivelActual: number = 1;
  maxNiveles: number = 6;
  puntaje: number = 0;
  multiplicador: number = 1;
  combo: number = 0;
  maxCombo: number = 0;
  vidas: number = 3;
  precision: number = 100;
  
  // Tiempo y duración
  tiempoInicio: number = 0;
  tiempoTranscurrido: number = 0;
  duracionCancion: number = 60000; // 60 segundos por nivel
  tiempoRestante: number = 0;
  
  // Sílabas disponibles
  silabasDisponibles: Silaba[] = [
    {
      id: 'pa',
      texto: 'PA',
      sonido: 'pa',
      tecla: 'A',
      color: '#ef4444',
      emoji: '🔴'
    },
    {
      id: 'ta',
      texto: 'TA',
      sonido: 'ta',
      tecla: 'S',
      color: '#3b82f6',
      emoji: '🔵'
    },
    {
      id: 'ma',
      texto: 'MA',
      sonido: 'ma',
      tecla: 'D',
      color: '#10b981',
      emoji: '🟢'
    },
    {
      id: 'la',
      texto: 'LA',
      sonido: 'la',
      tecla: 'F',
      color: '#f59e0b',
      emoji: '🟡'
    }
  ];
  
  // Carriles del juego
  carriles: number = 4;
  silabasCayendo: SilabaCayendo[] = [];
  notasGolpeadas: NotaGolpeada[] = [];
  
  // Configuración del juego
  velocidadBase: number = 2;
  lineaGolpe: number = 580; // Posición Y donde se deben golpear las sílabas
  zonaMargen: number = 50; // Margen de error para golpear
  
  // Intervalos y animación
  intervaloJuego: any;
  intervaloGeneracion: any;
  intervaloCuenta: any;
  cuentaRegresiva: number = 3;
  
  // Estadísticas
  silabasGolpeadas: number = 0;
  silabasPerfectas: number = 0;
  silabasBuenas: number = 0;
  silabasRegulares: number = 0;
  silabasFalladas: number = 0;
  notasPerdidas: number = 0;
  
  // Audio y efectos
  sonidosHabilitados: boolean = true;
  efectosVisuales: boolean = true;
  
  // Teclas activas
  teclasPresionadas: Set<string> = new Set();

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

  // === CONTROL DE TECLAS ===
  
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.faseJuego !== 'jugando') return;
    
    const tecla = event.key.toLowerCase();
    
    // Prevenir múltiples eventos de la misma tecla
    if (this.teclasPresionadas.has(tecla)) return;
    this.teclasPresionadas.add(tecla);
    
    const silaba = this.silabasDisponibles.find(s => s.tecla.toLowerCase() === tecla);
    if (silaba) {
      this.golpearSilaba(silaba);
      event.preventDefault();
    }
  }
  
  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    const tecla = event.key.toLowerCase();
    this.teclasPresionadas.delete(tecla);
  }

  // === INICIALIZACIÓN DEL JUEGO ===
  
  iniciarJuego() {
    this.faseJuego = 'instrucciones';
    this.nivelActual = 1;
    this.puntaje = 0;
    this.vidas = 3;
    this.reiniciarEstadisticas();
    
    console.log('🎵 Iniciando Ritmo de Sílabas...');
  }

  empezarNivel() {
    this.faseJuego = 'countdown';
    this.cuentaRegresiva = 3;
    this.configurarNivel();
    
    this.intervaloCuenta = setInterval(() => {
      this.cuentaRegresiva--;
      if (this.cuentaRegresiva <= 0) {
        clearInterval(this.intervaloCuenta);
        this.iniciarRitmo();
      }
    }, 1000);
  }

  configurarNivel() {
    // Ajustar dificultad según el nivel
    this.velocidadBase = 2 + (this.nivelActual - 1) * 0.5;
    this.duracionCancion = Math.max(45000, 75000 - (this.nivelActual - 1) * 5000);
    
    // Limpiar arrays
    this.silabasCayendo = [];
    this.notasGolpeadas = [];
    this.teclasPresionadas.clear();
    
    console.log(`🎼 Configurando nivel ${this.nivelActual} - Velocidad: ${this.velocidadBase}`);
  }

  iniciarRitmo() {
    this.faseJuego = 'jugando';
    this.tiempoInicio = Date.now();
    this.tiempoRestante = this.duracionCancion;
    
    // Intervalo principal del juego
    this.intervaloJuego = setInterval(() => {
      this.actualizarJuego();
    }, 16); // ~60 FPS
    
    // Generación de sílabas
    this.intervaloGeneracion = setInterval(() => {
      this.generarSilaba();
    }, this.obtenerIntervaloGeneracion());
    
    console.log(`▶️ Iniciando ritmo - Nivel ${this.nivelActual}`);
  }

  // === LÓGICA PRINCIPAL ===
  
  actualizarJuego() {
    const tiempoActual = Date.now();
    this.tiempoTranscurrido = tiempoActual - this.tiempoInicio;
    this.tiempoRestante = Math.max(0, this.duracionCancion - this.tiempoTranscurrido);
    
    // Actualizar posiciones de sílabas
    this.silabasCayendo = this.silabasCayendo.filter(silaba => {
      silaba.posicionY += silaba.velocidad;
      
      // Eliminar sílabas que pasaron de la pantalla
      if (silaba.posicionY > 700) {
        if (!silaba.golpeada) {
          this.silabaFallada(silaba);
        }
        return false;
      }
      
      return true;
    });
    
    // Limpiar notas golpeadas antiguas
    this.notasGolpeadas = this.notasGolpeadas.filter(nota => 
      tiempoActual - nota.tiempo < 1000
    );
    
    // Verificar fin del nivel
    if (this.tiempoRestante <= 0) {
      this.completarNivel();
    }
    
    // Verificar game over
    if (this.vidas <= 0) {
      this.juegoTerminado();
    }
  }

  generarSilaba() {
    if (this.faseJuego !== 'jugando') return;
    
    const silabaAleatoria = this.silabasDisponibles[
      Math.floor(Math.random() * this.silabasDisponibles.length)
    ];
    
    const carrilAleatorio = Math.floor(Math.random() * this.carriles);
    
    const nuevaSilaba: SilabaCayendo = {
      id: `silaba-${Date.now()}-${Math.random()}`,
      silaba: silabaAleatoria,
      carril: carrilAleatorio,
      posicionY: -100,
      velocidad: this.velocidadBase + Math.random() * 1,
      activa: true,
      golpeada: false,
      tiempoCreacion: Date.now()
    };
    
    this.silabasCayendo.push(nuevaSilaba);
  }

  golpearSilaba(silabaObjetivo: Silaba) {
    // Buscar la sílaba más cercana a la línea de golpe
    const silabasCandidatas = this.silabasCayendo.filter(s => 
      s.silaba.id === silabaObjetivo.id && 
      !s.golpeada && 
      s.activa
    );
    
    if (silabasCandidatas.length === 0) {
      this.falloSinNota();
      return;
    }
    
    // Encontrar la más cercana a la línea de golpe
    let silabaMasCercana = silabasCandidatas[0];
    let menorDistancia = Math.abs(silabaMasCercana.posicionY - this.lineaGolpe);
    
    for (const silaba of silabasCandidatas) {
      const distancia = Math.abs(silaba.posicionY - this.lineaGolpe);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        silabaMasCercana = silaba;
      }
    }
    
    // Verificar si está dentro del margen
    if (menorDistancia <= this.zonaMargen) {
      this.golpeExitoso(silabaMasCercana, menorDistancia);
    } else {
      this.falloSinNota();
    }
  }

  golpeExitoso(silaba: SilabaCayendo, distancia: number) {
    silaba.golpeada = true;
    silaba.activa = false;
    
    let precision: 'perfecto' | 'bueno' | 'regular' | 'fallo';
    let puntos: number;
    
    if (distancia <= 10) {
      precision = 'perfecto';
      puntos = 100;
      this.silabasPerfectas++;
    } else if (distancia <= 25) {
      precision = 'bueno';
      puntos = 75;
      this.silabasBuenas++;
    } else {
      precision = 'regular';
      puntos = 50;
      this.silabasRegulares++;
    }
    
    // Aplicar multiplicador de combo
    puntos *= this.multiplicador;
    this.puntaje += puntos;
    this.silabasGolpeadas++;
    
    // Incrementar combo
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    
    // Actualizar multiplicador
    if (this.combo >= 10) {
      this.multiplicador = Math.min(4, Math.floor(this.combo / 10) + 1);
    }
    
    // Crear efecto visual
    const carrilPosX = this.obtenerPosicionCarril(silaba.carril);
    this.crearNotaGolpeada(precision, puntos, carrilPosX, this.lineaGolpe);
    
    // Reproducir sonido
    this.reproducirSonido(silaba.silaba.sonido);
    
    console.log(`✨ ${precision.toUpperCase()} +${puntos} pts (Combo: ${this.combo}x)`);
  }

  silabaFallada(silaba: SilabaCayendo) {
    this.silabasFalladas++;
    this.notasPerdidas++;
    this.combo = 0;
    this.multiplicador = 1;
    this.vidas--;
    
    console.log(`❌ Sílaba perdida: ${silaba.silaba.texto} (Vidas: ${this.vidas})`);
  }

  falloSinNota() {
    this.combo = 0;
    this.multiplicador = 1;
    
    console.log('❌ Tecla presionada sin sílaba');
  }

  // === UTILIDADES ===
  
  obtenerIntervaloGeneracion(): number {
    // Frecuencia aumenta con el nivel
    return Math.max(800, 2000 - (this.nivelActual - 1) * 200);
  }

  obtenerPosicionCarril(carril: number): number {
    const anchoCarril = 150;
    const inicioCarriles = 200;
    return inicioCarriles + (carril * anchoCarril) + (anchoCarril / 2);
  }

  crearNotaGolpeada(precision: string, puntos: number, x: number, y: number) {
    const nota: NotaGolpeada = {
      precision: precision as 'perfecto' | 'bueno' | 'regular' | 'fallo',
      puntos,
      tiempo: Date.now(),
      posicion: { x, y }
    };
    
    this.notasGolpeadas.push(nota);
  }

  calcularPrecision(): number {
    const total = this.silabasGolpeadas + this.silabasFalladas;
    return total > 0 ? Math.round((this.silabasGolpeadas / total) * 100) : 100;
  }

  formatearTiempo(milisegundos: number): string {
    const segundos = Math.floor(milisegundos / 1000);
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  }

  // === PROGRESIÓN DE NIVELES ===
  
  completarNivel() {
    this.limpiarIntervalos();
    this.precision = this.calcularPrecision();
    
    if (this.nivelActual >= this.maxNiveles) {
      this.juegoCompletado();
    } else {
      this.siguienteNivel();
    }
  }

  siguienteNivel() {
    this.nivelActual++;
    
    setTimeout(() => {
      this.empezarNivel();
    }, 2000);
    
    console.log(`🆙 Avanzando al nivel ${this.nivelActual}`);
  }

  juegoCompletado() {
    this.faseJuego = 'completado';
    this.limpiarIntervalos();
    
    console.log(`🎉 ¡Juego completado! Puntaje final: ${this.puntaje}`);
  }

  juegoTerminado() {
    this.faseJuego = 'completado';
    this.limpiarIntervalos();
    
    console.log(`💀 Juego terminado. Puntaje final: ${this.puntaje}`);
  }

  // === AUDIO ===
  
  reproducirSonido(sonido: string) {
    if (!this.sonidosHabilitados) return;
    
    // Aquí se reproduciría el sonido de la sílaba
    console.log(`🔊 Reproduciendo: ${sonido.toUpperCase()}`);
  }

  // === UTILIDADES ADICIONALES ===
  
  reiniciarEstadisticas() {
    this.combo = 0;
    this.maxCombo = 0;
    this.multiplicador = 1;
    this.silabasGolpeadas = 0;
    this.silabasPerfectas = 0;
    this.silabasBuenas = 0;
    this.silabasRegulares = 0;
    this.silabasFalladas = 0;
    this.notasPerdidas = 0;
  }

  limpiarIntervalos() {
    if (this.intervaloJuego) {
      clearInterval(this.intervaloJuego);
    }
    if (this.intervaloGeneracion) {
      clearInterval(this.intervaloGeneracion);
    }
    if (this.intervaloCuenta) {
      clearInterval(this.intervaloCuenta);
    }
  }

  obtenerEstrellas(): number {
    if (this.precision >= 95 && this.vidas >= 3 && this.nivelActual >= this.maxNiveles) return 3;
    if (this.precision >= 85 && this.vidas >= 2 && this.nivelActual >= 4) return 2;
    if (this.precision >= 70 && this.puntaje >= 5000) return 1;
    return 0;
  }

  // === NAVEGACIÓN ===
  
  pausarJuego() {
    if (this.faseJuego === 'jugando') {
      this.faseJuego = 'pausado';
      this.limpiarIntervalos();
    }
  }

  reanudarJuego() {
    if (this.faseJuego === 'pausado') {
      this.faseJuego = 'jugando';
      this.tiempoInicio = Date.now() - this.tiempoTranscurrido;
      
      this.intervaloJuego = setInterval(() => {
        this.actualizarJuego();
      }, 16);
    }
  }

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
    // Aquí iría la navegación al próximo juego (Mandibulares)
    this.router.navigate(['/juego', 'mandibulares', 'clasifica-sonidos']);
  }

  saltarInstrucciones() {
    this.empezarNivel();
  }
}