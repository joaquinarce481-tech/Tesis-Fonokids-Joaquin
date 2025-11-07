import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-arma-cara-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './arma-cara-game.component.html',
  styleUrls: ['./arma-cara-game.component.css']
})
export class ArmaCaraGameComponent implements OnInit, OnDestroy {

  // ========== ESTADOS DEL JUEGO ==========
  pantalla: 'inicio' | 'juego' | 'completado' = 'inicio';
  emocionActual: string | null = null;
  juegoActivo: boolean = false;
  arrastrandoParte: any = null;
  totalJugados: number = 0;
  mostrarModalError: boolean = false;
  
  partesColocadas = {
    cejas: null as any,
    ojos: null as any,
    boca: null as any
  };

  // ========== DEFINICIONES DE EMOCIONES ==========
  emociones: any = {
    feliz: {
      nombre: 'Feliz',
      emoji: '😊',
      color: '#FFD700',
      imagen: 'assets/images/emociones/feliz.png',
      cejas: { 
        emoji: '︶', 
        descripcion: 'Cejas relajadas',
        imagen: 'assets/images/partes/cejas-relajadas.png'
      },
      ojos: { 
        emoji: '◡◡', 
        descripcion: 'Ojos sonrientes',
        imagen: 'assets/images/partes/ojos-sonrientes.png'
      },
      boca: { 
        emoji: '‿', 
        descripcion: 'Sonrisa grande',
        imagen: 'assets/images/partes/boca-sonrisa.png'
      }
    },
    triste: {
      nombre: 'Triste',
      emoji: '😢',
      color: '#87CEEB',
      imagen: 'assets/images/emociones/triste.png',
      cejas: { 
        emoji: '︵', 
        descripcion: 'Cejas caídas',
        imagen: 'assets/images/partes/cejas-caidas.png'
      },
      ojos: { 
        emoji: '╥╥', 
        descripcion: 'Ojos llorosos',
        imagen: 'assets/images/partes/ojos-llorosos.png'
      },
      boca: { 
        emoji: '︵', 
        descripcion: 'Boca hacia abajo',
        imagen: 'assets/images/partes/boca-triste.png'
      }
    },
    sorprendido: {
      nombre: 'Sorprendido',
      emoji: '😲',
      color: '#FFA500',
      imagen: 'assets/images/emociones/sorprendido.png',
      cejas: { 
        emoji: '⌃', 
        descripcion: 'Cejas levantadas',
        imagen: 'assets/images/partes/cejas-levantadas.png'
      },
      ojos: { 
        emoji: '○○', 
        descripcion: 'Ojos muy abiertos',
        imagen: 'assets/images/partes/ojos-abiertos.png'
      },
      boca: { 
        emoji: 'O', 
        descripcion: 'Boca abierta',
        imagen: 'assets/images/partes/boca-abierta.png'
      }
    },
    enojado: {
      nombre: 'Enojado',
      emoji: '😠',
      color: '#FF6347',
      imagen: 'assets/images/emociones/enojado.png',
      cejas: { 
        emoji: '︵︵', 
        descripcion: 'Cejas fruncidas',
        imagen: 'assets/images/partes/cejas-fruncidas.png'
      },
      ojos: { 
        emoji: '◣◢', 
        descripcion: 'Ojos entrecerrados',
        imagen: 'assets/images/partes/ojos-entrecerrados.png'
      },
      boca: { 
        emoji: '⌢', 
        descripcion: 'Boca tensa',
        imagen: 'assets/images/partes/boca-tensa.png'
      }
    },
    asustado: {
      nombre: 'Asustado',
      emoji: '😨',
      color: '#9370DB',
      imagen: 'assets/images/emociones/asustado.png',
      cejas: { 
        emoji: '︿', 
        descripcion: 'Cejas preocupadas',
        imagen: 'assets/images/partes/cejas-preocupadas.png'
      },
      ojos: { 
        emoji: '◉◉', 
        descripcion: 'Ojos muy abiertos',
        imagen: 'assets/images/partes/ojos-muy-abiertos.png'
      },
      boca: { 
        emoji: '△', 
        descripcion: 'Boca temblorosa',
        imagen: 'assets/images/partes/boca-temblorosa.png'
      }
    },
    amoroso: {
      nombre: 'Amoroso',
      emoji: '😍',
      color: '#FF69B4',
      imagen: 'assets/images/emociones/amoroso.png',
      cejas: { 
        emoji: '︶', 
        descripcion: 'Cejas relajadas',
        imagen: 'assets/images/partes/cejas-relajadas.png'
      },
      ojos: { 
        emoji: '♥♥', 
        descripcion: 'Ojos de corazón',
        imagen: 'assets/images/partes/ojos-corazon.png'
      },
      boca: { 
        emoji: '◡', 
        descripcion: 'Sonrisa dulce',
        imagen: 'assets/images/partes/boca-dulce.png'
      }
    }
  };

  // ========== LISTA DE PARTES DISPONIBLES ==========
  partesDisponibles = {
    cejas: [
      { id: 'cejas1', emoji: '︶', nombre: 'Relajadas', imagen: 'assets/images/partes/cejas-relajadas.png' },
      { id: 'cejas2', emoji: '︵', nombre: 'Caídas', imagen: 'assets/images/partes/cejas-caidas.png' },
      { id: 'cejas3', emoji: '⌃', nombre: 'Levantadas', imagen: 'assets/images/partes/cejas-levantadas.png' },
      { id: 'cejas4', emoji: '︵︵', nombre: 'Fruncidas', imagen: 'assets/images/partes/cejas-fruncidas.png' },
      { id: 'cejas5', emoji: '︿', nombre: 'Preocupadas', imagen: 'assets/images/partes/cejas-preocupadas.png' }
    ],
    ojos: [
      { id: 'ojos1', emoji: '◡◡', nombre: 'Sonrientes', imagen: 'assets/images/partes/ojos-sonrientes.png' },
      { id: 'ojos2', emoji: '╥╥', nombre: 'Llorosos', imagen: 'assets/images/partes/ojos-llorosos.png' },
      { id: 'ojos3', emoji: '○○', nombre: 'Abiertos', imagen: 'assets/images/partes/ojos-abiertos.png' },
      { id: 'ojos4', emoji: '◣◢', nombre: 'Entrecerrados', imagen: 'assets/images/partes/ojos-entrecerrados.png' },
      { id: 'ojos5', emoji: '◉◉', nombre: 'Muy abiertos', imagen: 'assets/images/partes/ojos-muy-abiertos.png' },
      { id: 'ojos6', emoji: '♥♥', nombre: 'Corazones', imagen: 'assets/images/partes/ojos-corazon.png' }
    ],
    boca: [
      { id: 'boca1', emoji: '‿', nombre: 'Sonrisa grande', imagen: 'assets/images/partes/boca-sonrisa.png' },
      { id: 'boca2', emoji: '︵', nombre: 'Hacia abajo', imagen: 'assets/images/partes/boca-triste.png' },
      { id: 'boca3', emoji: 'O', nombre: 'Abierta', imagen: 'assets/images/partes/boca-abierta.png' },
      { id: 'boca4', emoji: '⌢', nombre: 'Tensa', imagen: 'assets/images/partes/boca-tensa.png' },
      { id: 'boca5', emoji: '△', nombre: 'Temblorosa', imagen: 'assets/images/partes/boca-temblorosa.png' },
      { id: 'boca6', emoji: '◡', nombre: 'Dulce', imagen: 'assets/images/partes/boca-dulce.png' }
    ]
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {}

  // ========== FUNCIONES DE NAVEGACIÓN ==========
  irASeleccion(): void {
    // En lugar de ir a la pantalla de selección, elegir emoción al azar e iniciar juego
    const emocionesKeys = this.getEmocionesKeys();
    const emocionAleatoria = emocionesKeys[Math.floor(Math.random() * emocionesKeys.length)];
    this.iniciarJuego(emocionAleatoria);
  }

  iniciarJuego(emocionKey: string): void {
    this.emocionActual = emocionKey;
    this.partesColocadas = { cejas: null, ojos: null, boca: null };
    this.juegoActivo = true;
    this.pantalla = 'juego';
  }

  volverAlInicio(): void {
    this.pantalla = 'inicio';
    this.emocionActual = null;
    this.juegoActivo = false;
    this.partesColocadas = { cejas: null, ojos: null, boca: null };
  }

  volverASeleccion(): void {
    // Cambiar para que elija otra emoción al azar
    const emocionesKeys = this.getEmocionesKeys();
    const emocionAleatoria = emocionesKeys[Math.floor(Math.random() * emocionesKeys.length)];
    this.iniciarJuego(emocionAleatoria);
  }

  volverADashboard(): void {
    this.router.navigate(['/juegos-terapeuticos']);
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
      this.mostrarModalError = true;
    }
  }

  cerrarModalError(): void {
    this.mostrarModalError = false;
  }

  finalizarJuego(exito: boolean): void {
    this.juegoActivo = false;
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

  getColorEmocion(emocionKey: string): string {
    return this.emociones[emocionKey]?.color || '#667eea';
  }

  getPartesColocadasCount(): number {
    let count = 0;
    if (this.partesColocadas.cejas) count++;
    if (this.partesColocadas.ojos) count++;
    if (this.partesColocadas.boca) count++;
    return count;
  }

  // ========== PERSISTENCIA ==========
  cargarEstadisticas(): void {
    const stats = localStorage.getItem('armaCaraStats');
    if (stats) {
      const data = JSON.parse(stats);
      this.totalJugados = data.totalJugados || 0;
    }
  }

  guardarEstadisticas(): void {
    const stats = {
      totalJugados: this.totalJugados
    };
    localStorage.setItem('armaCaraStats', JSON.stringify(stats));
  }
}