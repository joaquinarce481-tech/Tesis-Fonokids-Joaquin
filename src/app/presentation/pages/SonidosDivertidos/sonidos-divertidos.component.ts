import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Sonido {
  id: number;
  nombre: string;
  onomatopeya: string;
  imagen: string;
  audio: string;
}

@Component({
  selector: 'app-sonidos-divertidos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sonidos-divertidos.component.html',
  styleUrls: ['./sonidos-divertidos.component.css']
})
export class SonidosDivertidosComponent implements OnInit, OnDestroy {
  sonidos: Sonido[] = [
    {
      id: 1,
      nombre: 'Perro',
      onomatopeya: '¡GUAU GUAU!',
      imagen: '🐕',
      audio: 'guau'
    },
    {
      id: 2,
      nombre: 'Gato',
      onomatopeya: '¡MIAU MIAU!',
      imagen: '🐱',
      audio: 'miau'
    },
    {
      id: 3,
      nombre: 'Vaca',
      onomatopeya: '¡MUUU!',
      imagen: '🐄',
      audio: 'muuu'
    },
    {
      id: 4,
      nombre: 'Oveja',
      onomatopeya: '¡BEEE!',
      imagen: '🐑',
      audio: 'beee'
    },
    {
      id: 5,
      nombre: 'Pato',
      onomatopeya: '¡CUAC CUAC!',
      imagen: '🦆',
      audio: 'cuac'
    },
    {
      id: 6,
      nombre: 'Cerdo',
      onomatopeya: '¡OINC OINC!',
      imagen: '🐷',
      audio: 'oinc'
    },
    {
      id: 7,
      nombre: 'León',
      onomatopeya: '¡ROAAR!',
      imagen: '🦁',
      audio: 'roar'
    },
    {
      id: 8,
      nombre: 'Abeja',
      onomatopeya: '¡BZZZ!',
      imagen: '🐝',
      audio: 'bzzz'
    },
    {
      id: 9,
      nombre: 'Campana',
      onomatopeya: '¡DING DONG!',
      imagen: '🔔',
      audio: 'ding'
    },
    {
      id: 10,
      nombre: 'Auto',
      onomatopeya: '¡BIP BIP!',
      imagen: '🚗',
      audio: 'bip'
    },
    {
      id: 11,
      nombre: 'Reloj',
      onomatopeya: '¡TIC TAC!',
      imagen: '⏰',
      audio: 'tic'
    },
    {
      id: 12,
      nombre: 'Aplausos',
      onomatopeya: '¡CLAP CLAP!',
      imagen: '👏',
      audio: 'clap'
    }
  ];

  sonidoActual: Sonido | null = null;
  indiceActual: number = 0;
  mostrarCelebracion: boolean = false;
  juegoCompletado: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.mostrarSonido();
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }

  mostrarSonido(): void {
    if (this.indiceActual < this.sonidos.length) {
      this.sonidoActual = this.sonidos[this.indiceActual];
    } else {
      this.completarJuego();
    }
  }

  reproducirSonido(): void {
    if (this.sonidoActual) {
      this.hablar(this.sonidoActual.onomatopeya);
    }
  }

  siguienteSonido(): void {
    this.mostrarCelebracion = true;
    
    setTimeout(() => {
      this.mostrarCelebracion = false;
      this.indiceActual++;
      this.mostrarSonido();
    }, 2000);
  }

  completarJuego(): void {
    this.juegoCompletado = true;
    this.hablar('¡Felicitaciones! ¡Completaste todos los sonidos!');
  }

  reiniciarJuego(): void {
    this.indiceActual = 0;
    this.sonidoActual = null;
    this.mostrarCelebracion = false;
    this.juegoCompletado = false;
    this.mostrarSonido();
  }

  volverAlMenu(): void {
    this.router.navigate(['/ejercicios']);
  }

  private hablar(texto: string): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  }

  get progreso(): number {
    return (this.indiceActual / this.sonidos.length) * 100;
  }

  get sonidosRestantes(): number {
    return this.sonidos.length - this.indiceActual;
  }
}