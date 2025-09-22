import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

interface GestoFacial {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  sonido?: string;
}

interface Secuencia {
  gestos: GestoFacial[];
  nivel: number;
}

@Component({
  selector: 'app-memoria-gestos-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memoria-gestos-game.component.html',
  styleUrls: ['./memoria-gestos-game.component.css']
})
export class MemoriaGestosGameComponent implements OnInit, OnDestroy {
  // Estados del juego
  faseJuego: 'instrucciones' | 'mostrando' | 'esperando' | 'jugando' | 'completado' | 'error' = 'instrucciones';
  nivelActual: number = 1;
  maxNiveles: number = 8;
  puntaje: number = 0;
  vidas: number = 3;
  tiempoInicio: number = 0;
  tiempoTranscurrido: number = 0;
  intervaloTiempo: any;
  
  // Gestos disponibles
  gestosDisponibles: GestoFacial[] = [
    {
      id: 'beso',
      nombre: 'Beso',
      emoji: '💋',
      descripcion: 'Hacer un beso con los labios',
      sonido: 'beso.mp3'
    },
    {
      id: 'soplo',
      nombre: 'Soplo',
      emoji: '💨',
      descripcion: 'Soplar fuerte',
      sonido: 'soplo.mp3'
    },
    {
      id: 'sonrisa',
      nombre: 'Sonrisa',
      emoji: '😊',
      descripcion: 'Sonreír ampliamente',
      sonido: 'sonrisa.mp3'
    },
    {
      id: 'lengua-afuera',
      nombre: 'Lengua Afuera',
      emoji: '😛',
      descripcion: 'Sacar la lengua',
      sonido: 'lengua.mp3'
    },
    {
      id: 'mejillas-infladas',
      nombre: 'Mejillas Infladas',
      emoji: '😤',
      descripcion: 'Inflar las mejillas',
      sonido: 'inflar.mp3'
    },
    {
      id: 'labios-fruncidos',
      nombre: 'Labios Fruncidos',
      emoji: '😗',
      descripcion: 'Fruncir los labios',
      sonido: 'fruncir.mp3'
    }
  ];
  
  // Secuencia actual
  secuenciaActual: GestoFacial[] = [];
  respuestaJugador: GestoFacial[] = [];
  gestoMostrando: GestoFacial | null = null;
  indiceGestoActual: number = 0;
  
  // Animaciones y efectos
  mostrandoSecuencia: boolean = false;
  gestoPulsado: string | null = null;
  tiempoMostrarGesto: number = 1000;
  tiempoPausa: number = 500;

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

  iniciarJuego() {
    this.tiempoInicio = Date.now();
    this.puntaje = 0;
    this.vidas = 3;
    this.nivelActual = 1;
    this.faseJuego = 'instrucciones';
    this.iniciarTemporizador();
    console.log('🧠 Juego "Memoria de Gestos" iniciado');
  }

  iniciarTemporizador() {
    this.intervaloTiempo = setInterval(() => {
      if (this.faseJuego !== 'completado') {
        this.tiempoTranscurrido = Math.floor((Date.now() - this.tiempoInicio) / 1000);
      }
    }, 1000);
  }

  // === CONTROL DEL JUEGO ===
  
  empezarNivel() {
    this.faseJuego = 'mostrando';
    this.generarSecuencia();
    setTimeout(() => {
      this.mostrarSecuencia();
    }, 500);
  }

  generarSecuencia() {
    this.secuenciaActual = [];
    this.respuestaJugador = [];
    
    // La secuencia aumenta de tamaño con cada nivel
    const longitudSecuencia = Math.min(2 + this.nivelActual, 6);
    
    for (let i = 0; i < longitudSecuencia; i++) {
      const gestoAleatorio = this.gestosDisponibles[
        Math.floor(Math.random() * this.gestosDisponibles.length)
      ];
      this.secuenciaActual.push(gestoAleatorio);
    }
    
    console.log(`🎯 Nivel ${this.nivelActual}: Secuencia generada`, this.secuenciaActual.map(g => g.nombre));
  }

  async mostrarSecuencia() {
    this.mostrandoSecuencia = true;
    this.indiceGestoActual = 0;
    
    for (let i = 0; i < this.secuenciaActual.length; i++) {
      this.gestoMostrando = this.secuenciaActual[i];
      this.indiceGestoActual = i;
      
      // Mostrar gesto con animación
      await this.esperar(this.tiempoMostrarGesto);
      
      // Pausa entre gestos
      this.gestoMostrando = null;
      await this.esperar(this.tiempoPausa);
    }
    
    this.mostrandoSecuencia = false;
    this.faseJuego = 'jugando';
    this.gestoMostrando = null;
  }

  seleccionarGesto(gesto: GestoFacial) {
    if (this.faseJuego !== 'jugando') return;
    
    this.gestoPulsado = gesto.id;
    this.respuestaJugador.push(gesto);
    
    // Verificar si el gesto es correcto
    const indiceActual = this.respuestaJugador.length - 1;
    const gestoCorrecto = this.secuenciaActual[indiceActual];
    
    if (gesto.id === gestoCorrecto.id) {
      // ¡Correcto!
      this.mostrarFeedbackPositivo();
      
      if (this.respuestaJugador.length === this.secuenciaActual.length) {
        // ¡Secuencia completada!
        this.completarNivel();
      }
    } else {
      // Error
      this.mostrarFeedbackNegativo();
      this.perderVida();
    }
    
    // Limpiar animación
    setTimeout(() => {
      this.gestoPulsado = null;
    }, 300);
  }

  completarNivel() {
    this.faseJuego = 'esperando';
    
    // Calcular puntos
    const puntosBase = 100;
    const bonusNivel = this.nivelActual * 50;
    const bonusVelocidad = Math.max(0, 10 - Math.floor(this.tiempoTranscurrido / 10)) * 10;
    const puntosNivel = puntosBase + bonusNivel + bonusVelocidad;
    
    this.puntaje += puntosNivel;
    
    console.log(`✅ Nivel ${this.nivelActual} completado. Puntos: +${puntosNivel}`);
    
    if (this.nivelActual >= this.maxNiveles) {
      // ¡Juego completado!
      setTimeout(() => {
        this.completarJuego();
      }, 1500);
    } else {
      // Siguiente nivel
      setTimeout(() => {
        this.nivelActual++;
        this.empezarNivel();
      }, 2000);
    }
  }

  perderVida() {
    this.vidas--;
    this.faseJuego = 'error';
    
    if (this.vidas <= 0) {
      // Game Over
      setTimeout(() => {
        this.gameOver();
      }, 1500);
    } else {
      // Repetir nivel
      setTimeout(() => {
        this.empezarNivel();
      }, 2000);
    }
  }

  completarJuego() {
    this.faseJuego = 'completado';
    
    // Bonus final
    const bonusVidas = this.vidas * 200;
    const bonusTiempo = Math.max(0, 300 - this.tiempoTranscurrido) * 5;
    this.puntaje += bonusVidas + bonusTiempo;
    
    console.log('🎉 ¡Juego completado!');
    console.log(`📊 Puntaje final: ${this.puntaje}`);
  }

  gameOver() {
    this.faseJuego = 'completado';
    console.log('💔 Game Over');
  }

  // === EFECTOS Y ANIMACIONES ===
  
  mostrarFeedbackPositivo() {
    console.log('✅ ¡Correcto!');
    // Vibración suave
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  mostrarFeedbackNegativo() {
    console.log('❌ Incorrecto');
    // Vibración más fuerte
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }

  // === UTILIDADES ===
  
  esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatearTiempo(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  }

  getEstrellas(): number {
    if (this.vidas === 3 && this.puntaje >= 2000) return 3;
    if (this.vidas >= 2 && this.puntaje >= 1500) return 2;
    if (this.puntaje >= 1000) return 1;
    return 0;
  }

  getDificultadTexto(): string {
    if (this.nivelActual <= 2) return 'Fácil';
    if (this.nivelActual <= 5) return 'Medio';
    return 'Difícil';
  }

  // === NAVEGACIÓN ===
  
  reiniciarJuego() {
    this.iniciarJuego();
  }

  volverAJuegos() {
    this.router.navigate(['/juegos-terapeuticos']);
  }

  siguienteJuego() {
    this.router.navigate(['/juego', 'labiales', 'soplo-virtual']);
  }

  saltarInstrucciones() {
    this.faseJuego = 'esperando';
    setTimeout(() => {
      this.empezarNivel();
    }, 500);
  }
}