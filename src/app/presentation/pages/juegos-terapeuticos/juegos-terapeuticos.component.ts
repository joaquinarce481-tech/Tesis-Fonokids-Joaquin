import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface CategoriaJuego {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  emoji: string;
  color: string;
  imagen: string;
  juegos: JuegoInfo[];
}

interface JuegoInfo {
  id: string;
  nombre: string;
  descripcion: string;
  dificultad: 'facil' | 'medio' | 'dificil';
  tipo: 'drag-drop' | 'memoria' | 'reaccion' | 'puzzle' | 'audio' | 'ia-ruleta' | 'silabas';
  emoji: string;
}

@Component({
  selector: 'app-juegos-terapeuticos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './juegos-terapeuticos.component.html',
  styleUrls: ['./juegos-terapeuticos.component.css']
})
export class JuegosTerapeuticosComponent implements OnInit {
  categoriaSeleccionada: string | null = null;

  categorias: CategoriaJuego[] = [
    {
      id: 'labiales',
      titulo: 'Juegos Labiales',
      subtitulo: 'Interactua con tus labios',
      descripcion: 'Juegos para mejorar la fuerza y coordinación de los músculos de los labios',
      emoji: '💋',
      color: 'from-pink-400 to-pink-600',
      imagen: 'Labiales.png',
      juegos: [
        {
          id: 'arma-cara-labiales',
          nombre: 'Arma la Cara - Labios',
          descripcion: 'Arrastra y coloca los labios en la posición correcta',
          dificultad: 'facil',
          tipo: 'drag-drop',
          emoji: ''
        },
        {
          id: 'memoria-gestos-labiales',
          nombre: 'Memoria de Gestos Labiales',
          descripcion: 'Recuerda las secuencias de movimientos labiales',
          dificultad: 'medio',
          tipo: 'memoria',
          emoji: ''
        },
        {
          id: 'soplo-virtual',
          nombre: 'Reto de Pronunciación',
          descripcion: 'Pronuncia correctamente las palabras que aparecen',
          dificultad: 'medio',
          tipo: 'audio',
          emoji: ''
        }
      ]
    },
    {
      id: 'linguales',
      titulo: 'Ejercicios Linguales',
      subtitulo: 'Entrena tu lengua',
      descripcion: 'Actividades para mejorar la movilidad y precisión de la lengua',
      emoji: '👅',
      color: 'from-red-400 to-red-600',
      imagen: 'Linguales.png',
      juegos: [
        {
          id: 'puzzle-movimientos',
          nombre: 'Puzzle de Movimientos',
          descripcion: 'Ordena la secuencia correcta de ejercicios linguales',
          dificultad: 'medio',
          tipo: 'puzzle',
          emoji: ''
        },
        {
          id: 'ritmo-silabas',
          nombre: 'Ritmo de Sílabas',
          descripcion: 'Presiona las teclas al ritmo de las sílabas',
          dificultad: 'medio',
          tipo: 'reaccion',
          emoji: '🎵'
        }
      ]
    },
    {
      id: 'mandibulares',
      titulo: 'Ejercicios Mandibulares',
      subtitulo: 'Fortalece tu mandíbula',
      descripcion: 'Ejercicios para mejorar la articulación y fuerza mandibular',
      emoji: '🦴',
      color: 'from-blue-400 to-blue-600',
      imagen: 'Mandibulares.png',
      juegos: [
        {
          id: 'clasifica-sonidos',
          nombre: 'EN MANTENIMIENTO',
          descripcion: 'Agrupa sonidos en labiales, dentales y linguales',
          dificultad: 'medio',
          tipo: 'drag-drop',
          emoji: '🔤'
        },
        {
          id: 'memoria-silabas',
          nombre: 'EN MANTENIMIENTO',
          descripcion: 'Empareja sílabas iguales (pa-pa, ta-ta)',
          dificultad: 'facil',
          tipo: 'memoria',
          emoji: '🎯'
        },
        {
          id: 'secuencia-ejercicios',
          nombre: 'EN MANTENIMIENTO',
          descripcion: 'Ordena los pasos: inflar → soplar → sacar lengua',
          dificultad: 'dificil',
          tipo: 'puzzle',
          emoji: '📋'
        },
        // ========== NUEVOS JUEGOS MANDIBULARES ==========
        {
          id: 'sonidos-divertidos',
          nombre: 'Sonidos Divertidos',
          descripcion: 'Practica onomatopeyas divertidas con animales y objetos',
          dificultad: 'facil',
          tipo: 'audio',
          emoji: '🎵'
        },
        {
          id: 'parejas-silabas',
          nombre: 'Parejas de Sílabas',
          descripcion: 'Arrastra las sílabas correctas hacia sus imágenes',
          dificultad: 'medio',
          tipo: 'silabas',
          emoji: '🎯'
        }
      ]
    },
    {
      id: 'ruleta-praxias',
      titulo: 'Ruleta de Praxias IA',
      subtitulo: 'Inteligencia Artificial',
      descripcion: 'Ruleta interactiva con detección por cámara e inteligencia artificial',
      emoji: '🎯',
      color: 'from-purple-400 to-purple-600',
      imagen: 'PraxiaNiño.png',
      juegos: [
        {
          id: 'ruleta-praxias-ia',
          nombre: 'Ruleta con IA',
          descripcion: 'Gira la ruleta y demuestra con tu cámara que puedes hacer el ejercicio',
          dificultad: 'medio',
          tipo: 'ia-ruleta',
          emoji: '🤖'
        }
      ]
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    console.log('🎮 Juegos Terapéuticos cargados');
  }

  seleccionarCategoria(categoria: CategoriaJuego) {
    this.categoriaSeleccionada = categoria.id;
    console.log(`📂 Categoría seleccionada: ${categoria.titulo}`);
  }

  volverACategorias() {
    this.categoriaSeleccionada = null;
  }

  jugarJuego(juego: JuegoInfo, categoria: CategoriaJuego) {
    console.log(`🎮 Iniciando juego: ${juego.nombre} de ${categoria.titulo}`);

    // Ruleta de Praxias con IA
    if (juego.id === 'ruleta-praxias-ia') {
      this.router.navigate(['/ruleta-praxias']);
      return;
    }

    // ========== NAVEGACIÓN PARA NUEVOS JUEGOS MANDIBULARES ==========
    if (juego.id === 'sonidos-divertidos') {
      this.router.navigate(['/sonidos-divertidos']);
      return;
    }

    if (juego.id === 'parejas-silabas') {
      this.router.navigate(['/parejas-silabas']);
      return;
    }

    // Navegación genérica para otros juegos
    this.router.navigate(['/juego', categoria.id, juego.id]);
  }

  volverAlDashboard() {
    this.router.navigate(['/dashboard']);
  }

  getDificultadColor(dificultad: string): string {
    switch (dificultad) {
      case 'facil': return 'dificultad-facil';
      case 'medio': return 'dificultad-medio';
      case 'dificil': return 'dificultad-dificil';
      default: return 'dificultad-normal';
    }
  }

  getDificultadTexto(dificultad: string): string {
    switch (dificultad) {
      case 'facil': return 'Fácil';
      case 'medio': return 'Medio';
      case 'dificil': return 'Difícil';
      default: return 'Normal';
    }
  }

  getDuracion(dificultad: string): string {
    switch (dificultad) {
      case 'facil': return '5s';
      case 'medio': return '10s';
      case 'dificil': return '15s';
      default: return '8s';
    }
  }

  onImageError(event: any, categoria: CategoriaJuego) {
    event.target.style.display = 'none';
    const container = event.target.parentElement;
    if (container) {
      container.classList.add('no-image');
      container.innerHTML = `<span class="emoji-fallback">${categoria.emoji}</span>`;
    }
  }
}