import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-arma-cara-game',
  templateUrl: './arma-cara-game.component.html',
  styleUrls: ['./arma-cara-game.component.css']
})


export class ArmaCaraGameComponent implements OnInit, OnDestroy {

  // ========== ESTADOS DEL JUEGO ==========
  pantalla: 'inicio' | 'seleccion' | 'juego' | 'completado' = 'inicio';
  modoJuego: 'practica' | 'contrarreloj' | 'desafio' | '' = '';
  emocionActual: string | null = null;
  nivel: number = 1;
  puntaje: number = 0;
  tiempo: number = 60;
  juegoActivo: boolean = false;
  arrastrandoParte: any = null;
  mostrarPista: boolean = false;
  racha: number = 0;
  totalJugados: number = 0;
  
  partesColocadas = {
    cejas: null as any,
    ojos: null as any,
    boca: null as any
  };

  private timerInterval: any;

  // ========== DEFINICIONES DE EMOCIONES ==========
  emociones: any = {
    feliz: {
      nombre: 'Feliz',
      emoji: '😊',
      color: '#FFD700',
      cejas: { emoji: '︶', descripcion: 'Cejas relajadas' },
      ojos: { emoji: '◡◡', descripcion: 'Ojos sonrientes' },
      boca: { emoji: '‿', descripcion: 'Sonrisa grande' },
      pista: 'Una gran sonrisa y ojos brillantes expresan felicidad'
    },
    triste: {
      nombre: 'Triste',
      emoji: '😢',
      color: '#87CEEB',
      cejas: { emoji: '︵', descripcion: 'Cejas caídas' },
      ojos: { emoji: '╥╥', descripcion: 'Ojos llorosos' },
      boca: { emoji: '︵', descripcion: 'Boca hacia abajo' },
      pista: 'Las comisuras caídas y cejas hacia abajo muestran tristeza'
    },
    sorprendido: {
      nombre: 'Sorprendido',
      emoji: '😲',
      color: '#FFA500',
      cejas: { emoji: '⌃', descripcion: 'Cejas levantadas' },
      ojos: { emoji: '○○', descripcion: 'Ojos muy abiertos' },
      boca: { emoji: 'O', descripcion: 'Boca abierta' },
      pista: 'Cejas arriba y boca abierta expresan sorpresa'
    },
    enojado: {
      nombre: 'Enojado',
      emoji: '😠',
      color: '#FF6347',
      cejas: { emoji: '︵︵', descripcion: 'Cejas fruncidas' },
      ojos: { emoji: '◣◢', descripcion: 'Ojos entrecerrados' },
      boca: { emoji: '⌢', descripcion: 'Boca tensa' },
      pista: 'Cejas juntas y boca apretada muestran enojo'
    },
    asustado: {
      nombre: 'Asustado',
      emoji: '😨',
      color: '#9370DB',
      cejas: { emoji: '︿', descripcion: 'Cejas preocupadas' },
      ojos: { emoji: '◉◉', descripcion: 'Ojos muy abiertos' },
      boca: { emoji: '△', descripcion: 'Boca temblorosa' },
      pista: 'Ojos muy abiertos y boca temblando expresan miedo'
    },
    amoroso: {
      nombre: 'Amoroso',
      emoji: '😍',
      color: '#FF69B4',
      cejas: { emoji: '︶', descripcion: 'Cejas relajadas' },
      ojos: { emoji: '♥♥', descripcion: 'Ojos de corazón' },
      boca: { emoji: '◡', descripcion: 'Sonrisa dulce' },
      pista: 'Ojos de corazón y sonrisa suave muestran amor'
    }
  };

  // ========== LISTA DE PARTES DISPONIBLES ==========
  partesDisponibles = {
    cejas: [
      { id: 'cejas1', emoji: '︶', nombre: 'Relajadas' },
      { id: 'cejas2', emoji: '︵', nombre: 'Caídas' },
      { id: 'cejas3', emoji: '⌃', nombre: 'Levantadas' },
      { id: 'cejas4', emoji: '︵︵', nombre: 'Fruncidas' },
      { id: 'cejas5', emoji: '︿', nombre: 'Preocupadas' }
    ],
    ojos: [
      { id: 'ojos1', emoji: '◡◡', nombre: 'Sonrientes' },
      { id: 'ojos2', emoji: '╥╥', nombre: 'Llorosos' },
      { id: 'ojos3', emoji: '○○', nombre: 'Abiertos' },
      { id: 'ojos4', emoji: '◣◢', nombre: 'Entrecerrados' },
      { id: 'ojos5', emoji: '◉◉', nombre: 'Muy abiertos' },
      { id: 'ojos6', emoji: '♥♥', nombre: 'Corazones' }
    ],
    boca: [
      { id: 'boca1', emoji: '‿', nombre: 'Sonrisa grande' },
      { id: 'boca2', emoji: '︵', nombre: 'Hacia abajo' },
      { id: 'boca3', emoji: 'O', nombre: 'Abierta' },
      { id: 'boca4', emoji: '⌢', nombre: 'Tensa' },
      { id: 'boca5', emoji: '△', nombre: 'Temblorosa' },
      { id: 'boca6', emoji: '◡', nombre: 'Dulce' }
    ]
  };

  ngOnInit(): void {
    // Cargar estadísticas del localStorage si existen
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.detenerTimer();
  }

  // ========== FUNCIONES DE NAVEGACIÓN ==========
  irASeleccion(modo: 'practica' | 'contrarreloj' | 'desafio'): void {
    this.modoJuego = modo;
    this.pantalla = 'seleccion';
  }

  iniciarJuego(emocionKey: string): void {
    this.emocionActual = emocionKey;
    this.partesColocadas = { cejas: null, ojos: null, boca: null };
    this.juegoActivo = true;
    this.pantalla = 'juego';
    this.mostrarPista = false;
    
    if (this.modoJuego === 'contrarreloj') {
      this.tiempo = 60;
      this.iniciarTimer();
    }
  }

  volverAlInicio(): void {
    this.pantalla = 'inicio';
    this.modoJuego = '';
    this.emocionActual = null;
    this.juegoActivo = false;
    this.partesColocadas = { cejas: null, ojos: null, boca: null };
    this.tiempo = 60;
    this.mostrarPista = false;
    this.detenerTimer();
  }

  volverASeleccion(): void {
    this.pantalla = 'seleccion';
    this.emocionActual = null;
    this.juegoActivo = false;
    this.partesColocadas = { cejas: null, ojos: null, boca: null };
    this.mostrarPista = false;
    this.detenerTimer();
  }

  // ========== FUNCIONES DE DRAG & DROP ==========
  handleDragStart(tipoParte: string, parte: any): void {
    this.arrastrandoParte = { tipo: tipoParte, parte: parte };
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  handleDrop(tipoParte: string): void {
    if (this.arrastrandoParte && this.arrastrandoParte.tipo === tipoParte) {
      this.partesColocadas[tipoParte as keyof typeof this.partesColocadas] = this.arrastrandoParte.parte;
    }
    this.arrastrandoParte = null;
  }

  quitarParte(tipoParte: string): void {
    this.partesColocadas[tipoParte as keyof typeof this.partesColocadas] = null;
  }

  // ========== TIMER ==========
  iniciarTimer(): void {
    this.timerInterval = setInterval(() => {
      this.tiempo--;
      if (this.tiempo <= 0) {
        this.detenerTimer();
        this.finalizarJuego(false);
      }
    }, 1000);
  }

  detenerTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ========== VERIFICACIÓN Y FINALIZACIÓN ==========
  verificarRespuesta(): void {
    if (!this.emocionActual) return;
    
    const emocion = this.emociones[this.emocionActual];
    const correcto = 
      this.partesColocadas.cejas?.emoji === emocion.cejas.emoji &&
      this.partesColocadas.ojos?.emoji === emocion.ojos.emoji &&
      this.partesColocadas.boca?.emoji === emocion.boca.emoji;
    
    if (correcto) {
      this.finalizarJuego(true);
    } else {
      alert('¡Casi! Revisa las partes e intenta nuevamente.');
    }
  }

  finalizarJuego(exito: boolean): void {
    this.juegoActivo = false;
    this.detenerTimer();
    
    if (exito) {
      const puntos = this.modoJuego === 'contrarreloj' ? this.tiempo * 10 : 100;
      this.puntaje += puntos;
      this.racha++;
    } else {
      this.racha = 0;
    }
    
    this.totalJugados++;
    this.guardarEstadisticas();
    this.pantalla = 'completado';
  }

  juegoCompletado(): boolean {
    return !!(this.partesColocadas.cejas && this.partesColocadas.ojos && this.partesColocadas.boca);
  }

  // ========== UTILIDADES ==========
  getEmocionesKeys(): string[] {
    return Object.keys(this.emociones);
  }

  togglePista(): void {
    this.mostrarPista = !this.mostrarPista;
  }

  getColorEmocion(emocionKey: string): string {
    return this.emociones[emocionKey]?.color || '#667eea';
  }

  // ========== PERSISTENCIA ==========
  cargarEstadisticas(): void {
    const stats = localStorage.getItem('armaCaraStats');
    if (stats) {
      const data = JSON.parse(stats);
      this.puntaje = data.puntaje || 0;
      this.racha = data.racha || 0;
      this.totalJugados = data.totalJugados || 0;
    }
  }

  guardarEstadisticas(): void {
    const stats = {
      puntaje: this.puntaje,
      racha: this.racha,
      totalJugados: this.totalJugados
    };
    localStorage.setItem('armaCaraStats', JSON.stringify(stats));
  }
}