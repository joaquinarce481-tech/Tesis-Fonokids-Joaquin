import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HistorialActividadesService } from '../../services/historial-actividades.service';

interface Palabra {
  id: number;
  silaba: string;
  nombre: string;
  imagen: string;
  audio: string;
}

@Component({
  selector: 'app-parejas-silabas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parejas-silabas.component.html',
  styleUrls: ['./parejas-silabas.component.css']
})
export class ParejasSilabasComponent implements OnInit, OnDestroy {

  
  vistaActual: 'instrucciones' | 'jugando' = 'instrucciones';

  
  todasLasPalabras: Palabra[] = [
    // Familia P
    { id: 1, silaba: 'PA', nombre: 'Pato', imagen: '🦆', audio: 'pa' },
    { id: 2, silaba: 'PE', nombre: 'Pelota', imagen: '⚽', audio: 'pe' },
    { id: 3, silaba: 'PI', nombre: 'Pila', imagen: '🔋', audio: 'pi' },
    { id: 4, silaba: 'PO', nombre: 'Pollo', imagen: '🐔', audio: 'po' },
    { id: 5, silaba: 'PU', nombre: 'Puerta', imagen: '🚪', audio: 'pu' },
    // Familia M
    { id: 6, silaba: 'MA', nombre: 'Mano', imagen: '✋', audio: 'ma' },
    { id: 7, silaba: 'ME', nombre: 'Medalla', imagen: '🏅', audio: 'me' },
    { id: 8, silaba: 'MI', nombre: 'Miel', imagen: '🍯', audio: 'mi' },
    { id: 9, silaba: 'MO', nombre: 'Mono', imagen: '🐵', audio: 'mo' },
    { id: 10, silaba: 'MU', nombre: 'Murciélago', imagen: '🦇', audio: 'mu' },
    // Familia T
    { id: 11, silaba: 'TA', nombre: 'Taza', imagen: '☕', audio: 'ta' },
    { id: 12, silaba: 'TE', nombre: 'Tele', imagen: '📺', audio: 'te' },
    { id: 13, silaba: 'TI', nombre: 'Tijera', imagen: '✂️', audio: 'ti' },
    { id: 14, silaba: 'TO', nombre: 'Tomate', imagen: '🍅', audio: 'to' },
    { id: 15, silaba: 'TU', nombre: 'Tulipán', imagen: '🌷', audio: 'tu' },
    // Familia S
    { id: 16, silaba: 'SA', nombre: 'Sapo', imagen: '🐸', audio: 'sa' },
    { id: 17, silaba: 'SE', nombre: 'Semáforo', imagen: '🚦', audio: 'se' },
    { id: 18, silaba: 'SI', nombre: 'Silla', imagen: '🪑', audio: 'si' },
    { id: 19, silaba: 'SO', nombre: 'Sol', imagen: '☀️', audio: 'so' },
    { id: 20, silaba: 'SU', nombre: 'Suma', imagen: '➕', audio: 'su' },
    // Familia L
    { id: 21, silaba: 'LA', nombre: 'Lápiz', imagen: '✏️', audio: 'la' },
    { id: 22, silaba: 'LE', nombre: 'León', imagen: '🦁', audio: 'le' },
    { id: 23, silaba: 'LI', nombre: 'Libro', imagen: '📚', audio: 'li' },
    { id: 24, silaba: 'LO', nombre: 'Loro', imagen: '🦜', audio: 'lo' },
    { id: 25, silaba: 'LU', nombre: 'Luna', imagen: '🌙', audio: 'lu' }
  ];

  
  todasLasSilabas: string[] = [];

  palabrasBarajadas: Palabra[] = [];
  silabas: string[] = []; 
  palabraActual: Palabra | null = null;
  indicePalabra: number = 0;
  
  silabaArrastrada: string | null = null;
  mostrarCelebracion: boolean = false;
  juegoCompletado: boolean = false;

  constructor(
    private router: Router,
    private historialService: HistorialActividadesService
  ) {}

  ngOnInit(): void {
    console.log('Parejas de Sílabas iniciado');
    
    
    window.scrollTo(0, 0);
    
   
    this.construirPoolGlobal();
  }

  ngOnDestroy(): void {
    
  }

 
  construirPoolGlobal(): void {
    this.todasLasSilabas = this.todasLasPalabras.map(p => p.silaba);
    console.log(' Pool global construido:', this.todasLasSilabas.length, 'sílabas');
  }

  
  generarSilabasMezcladas(): void {
    if (!this.palabraActual) return;
    
    const silabaCorrecta = this.palabraActual.silaba;
    
   
    const silabasDistractoras = this.todasLasSilabas.filter(s => s !== silabaCorrecta);
    
    
    const distractorasBarajadas = this.barajarArray([...silabasDistractoras]);
    
    
    const cuatroDistractoras = distractorasBarajadas.slice(0, 4);
    
    
    const cincoSilabas = [silabaCorrecta, ...cuatroDistractoras];
    
   
    this.silabas = this.barajarArray(cincoSilabas);
    
    console.log('🎲 Sílabas generadas:', this.silabas, '| Correcta:', silabaCorrecta);
  }

  
  barajarArray<T>(array: T[]): T[] {
    const resultado = [...array];
    for (let i = resultado.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
    }
    return resultado;
  }

 
  comenzarJuego(): void {
    console.log('🎮 Comenzando juego...');
    this.vistaActual = 'jugando';
    
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    
    this.iniciarJuego();
  }

  iniciarJuego(): void {
   
    this.palabrasBarajadas = this.barajarArray([...this.todasLasPalabras]);
    this.indicePalabra = 0;
    this.juegoCompletado = false;
    this.mostrarPalabra();
  }

  mostrarPalabra(): void {
    if (this.indicePalabra < this.palabrasBarajadas.length) {
      this.palabraActual = this.palabrasBarajadas[this.indicePalabra];
      
      this.generarSilabasMezcladas();
    } else {
      this.completarJuego();
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
        this.mostrarPalabra();
      }, 2000);
    }
  }

  respuestaIncorrecta(): void {
    this.hablar('¡Intenta de nuevo!');
    
    const dropZone = document.querySelector('.drop-zone');
    if (dropZone) {
      dropZone.classList.add('shake');
      setTimeout(() => {
        dropZone.classList.remove('shake');
      }, 500);
    }
  }

  completarJuego(): void {
    this.juegoCompletado = true;
    
   
    this.historialService.registrarJuego('Parejas de Sílabas').subscribe({
      next: () => console.log(' Parejas de Sílabas registrado en historial'),
      error: (error: any) => console.error(' Error registrando juego:', error)
    });
    
    this.hablar('¡Felicitaciones! ¡Completaste todas las sílabas!');
  }

  reiniciarJuego(): void {
    this.indicePalabra = 0;
    this.palabraActual = null;
    this.juegoCompletado = false;
    this.mostrarCelebracion = false;
    this.vistaActual = 'jugando';
    
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    
    this.iniciarJuego();
  }

  volverAlMenu(): void {
    this.router.navigate(['/juegos-terapeuticos']);
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

  get progresoJuego(): number {
    if (!this.palabrasBarajadas.length) return 0;
    return (this.indicePalabra / this.palabrasBarajadas.length) * 100;
  }

  get palabrasRestantes(): number {
    return this.palabrasBarajadas.length - this.indicePalabra;
  }

  get totalPalabras(): number {
    return this.todasLasPalabras.length;
  }

  get palabrasCompletadas(): number {
    return this.indicePalabra;
  }
}