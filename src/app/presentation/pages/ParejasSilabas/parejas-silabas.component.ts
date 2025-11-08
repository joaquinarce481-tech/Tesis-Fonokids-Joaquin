import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Palabra {
  id: number;
  silaba: string;
  nombre: string;
  imagen: string;
  audio: string;
}

interface Nivel {
  id: number;
  consonante: string;
  titulo: string;
  palabras: Palabra[];
}

@Component({
  selector: 'app-parejas-silabas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parejas-silabas.component.html',
  styleUrls: ['./parejas-silabas.component.css']
})
export class ParejasSilabasComponent implements OnInit, OnDestroy {
  niveles: Nivel[] = [
    {
      id: 1,
      consonante: 'P',
      titulo: 'Familia de la P',
      palabras: [
        { id: 1, silaba: 'PA', nombre: 'Pato', imagen: '🦆', audio: 'pa' },
        { id: 2, silaba: 'PE', nombre: 'Pelota', imagen: '⚽', audio: 'pe' },
        { id: 3, silaba: 'PI', nombre: 'Pila', imagen: '🔋', audio: 'pi' },
        { id: 4, silaba: 'PO', nombre: 'Pollo', imagen: '🐔', audio: 'po' },
        { id: 5, silaba: 'PU', nombre: 'Puerta', imagen: '🚪', audio: 'pu' }
      ]
    },
    {
      id: 2,
      consonante: 'M',
      titulo: 'Familia de la M',
      palabras: [
        { id: 6, silaba: 'MA', nombre: 'Mano', imagen: '✋', audio: 'ma' },
        { id: 7, silaba: 'ME', nombre: 'Mesa', imagen: '🪑', audio: 'me' },
        { id: 8, silaba: 'MI', nombre: 'Miel', imagen: '🍯', audio: 'mi' },
        { id: 9, silaba: 'MO', nombre: 'Mono', imagen: '🐵', audio: 'mo' },
        { id: 10, silaba: 'MU', nombre: 'Muñeca', imagen: '🪆', audio: 'mu' }
      ]
    },
    {
      id: 3,
      consonante: 'T',
      titulo: 'Familia de la T',
      palabras: [
        { id: 11, silaba: 'TA', nombre: 'Taza', imagen: '☕', audio: 'ta' },
        { id: 12, silaba: 'TE', nombre: 'Tele', imagen: '📺', audio: 'te' },
        { id: 13, silaba: 'TI', nombre: 'Tijera', imagen: '✂️', audio: 'ti' },
        { id: 14, silaba: 'TO', nombre: 'Tomate', imagen: '🍅', audio: 'to' },
        { id: 15, silaba: 'TU', nombre: 'Tulipán', imagen: '🌷', audio: 'tu' }
      ]
    },
    {
      id: 4,
      consonante: 'S',
      titulo: 'Familia de la S',
      palabras: [
        { id: 16, silaba: 'SA', nombre: 'Sapo', imagen: '🐸', audio: 'sa' },
        { id: 17, silaba: 'SE', nombre: 'Semáforo', imagen: '🚦', audio: 'se' },
        { id: 18, silaba: 'SI', nombre: 'Silla', imagen: '🪑', audio: 'si' },
        { id: 19, silaba: 'SO', nombre: 'Sol', imagen: '☀️', audio: 'so' },
        { id: 20, silaba: 'SU', nombre: 'Suma', imagen: '➕', audio: 'su' }
      ]
    },
    {
      id: 5,
      consonante: 'L',
      titulo: 'Familia de la L',
      palabras: [
        { id: 21, silaba: 'LA', nombre: 'Lana', imagen: '🧶', audio: 'la' },
        { id: 22, silaba: 'LE', nombre: 'León', imagen: '🦁', audio: 'le' },
        { id: 23, silaba: 'LI', nombre: 'Libro', imagen: '📚', audio: 'li' },
        { id: 24, silaba: 'LO', nombre: 'Loro', imagen: '🦜', audio: 'lo' },
        { id: 25, silaba: 'LU', nombre: 'Luna', imagen: '🌙', audio: 'lu' }
      ]
    }
  ];

  nivelActual: Nivel | null = null;
  indiceNivel: number = 0;
  palabrasBarajadas: Palabra[] = [];
  silabas: string[] = [];
  palabraActual: Palabra | null = null;
  indicePalabra: number = 0;
  
  silabaArrastrada: string | null = null;
  mostrarCelebracion: boolean = false;
  nivelCompletado: boolean = false;
  juegoCompletado: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.iniciarNivel();
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }

  iniciarNivel(): void {
    if (this.indiceNivel < this.niveles.length) {
      this.nivelActual = this.niveles[this.indiceNivel];
      this.palabrasBarajadas = [...this.nivelActual.palabras].sort(() => Math.random() - 0.5);
      this.silabas = this.nivelActual.palabras.map(p => p.silaba).sort(() => Math.random() - 0.5);
      this.indicePalabra = 0;
      this.nivelCompletado = false;
      this.mostrarPalabra();
    } else {
      this.completarJuego();
    }
  }

  mostrarPalabra(): void {
    if (this.indicePalabra < this.palabrasBarajadas.length) {
      this.palabraActual = this.palabrasBarajadas[this.indicePalabra];
    } else {
      this.completarNivel();
    }
  }

  onDragStart(silaba: string, event: DragEvent): void {
    this.silabaArrastrada = silaba;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', silaba);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    
    if (this.silabaArrastrada && this.palabraActual) {
      if (this.silabaArrastrada === this.palabraActual.silaba) {
        this.respuestaCorrecta();
      } else {
        this.respuestaIncorrecta();
      }
    }
    
    this.silabaArrastrada = null;
  }

  respuestaCorrecta(): void {
    if (this.palabraActual) {
      this.hablar(`¡Muy bien! ${this.palabraActual.silaba} de ${this.palabraActual.nombre}`);
      this.mostrarCelebracion = true;

      setTimeout(() => {
        this.mostrarCelebracion = false;
        this.indicePalabra++;
        
        // Remover la sílaba usada
        const index = this.silabas.indexOf(this.palabraActual!.silaba);
        if (index > -1) {
          this.silabas.splice(index, 1);
        }
        
        this.mostrarPalabra();
      }, 2000);
    }
  }

  respuestaIncorrecta(): void {
    this.hablar('¡Intenta de nuevo!');
    // Efecto visual de error
    const dropZone = document.querySelector('.drop-zone');
    if (dropZone) {
      dropZone.classList.add('shake');
      setTimeout(() => {
        dropZone.classList.remove('shake');
      }, 500);
    }
  }

  completarNivel(): void {
    this.nivelCompletado = true;
    if (this.nivelActual) {
      this.hablar(`¡Excelente! ¡Completaste la familia de la ${this.nivelActual.consonante}!`);
    }
  }

  siguienteNivel(): void {
    this.indiceNivel++;
    this.iniciarNivel();
  }

  completarJuego(): void {
    this.juegoCompletado = true;
    this.hablar('¡Felicitaciones! ¡Completaste todas las familias de sílabas!');
  }

  reiniciarJuego(): void {
    this.indiceNivel = 0;
    this.indicePalabra = 0;
    this.nivelActual = null;
    this.palabraActual = null;
    this.nivelCompletado = false;
    this.juegoCompletado = false;
    this.mostrarCelebracion = false;
    this.iniciarNivel();
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

  get progresoNivel(): number {
    if (!this.palabrasBarajadas.length) return 0;
    return (this.indicePalabra / this.palabrasBarajadas.length) * 100;
  }

  get palabrasRestantes(): number {
    return this.palabrasBarajadas.length - this.indicePalabra;
  }

  get nivelActualNumero(): number {
    return this.indiceNivel + 1;
  }

  get totalNiveles(): number {
    return this.niveles.length;
  }
}