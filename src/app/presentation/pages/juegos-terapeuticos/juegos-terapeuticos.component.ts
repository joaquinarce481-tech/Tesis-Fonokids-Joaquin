import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface JuegoInfo {
  id: string;
  nombre: string;
  descripcion: string;
  dificultad: 'facil' | 'medio' | 'dificil';
  tipo: 'drag-drop' | 'memoria' | 'reaccion' | 'puzzle' | 'audio' | 'ia-ruleta' | 'silabas';
  emoji: string;
  ruta: string;
  color: string; // Color del gradiente del juego
  imagen: string; // Ruta de la imagen del juego
}

@Component({
  selector: 'app-juegos-terapeuticos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './juegos-terapeuticos.component.html',
  styleUrls: ['./juegos-terapeuticos.component.css']
})
export class JuegosTerapeuticosComponent implements OnInit {
  
  juegos: JuegoInfo[] = [
    {
      id: 'ruleta-praxias-ia',
      nombre: 'Ruleta con IA',
      descripcion: 'Gira la ruleta y demuestra con tu cámara que puedes hacer el ejercicio',
      dificultad: 'medio',
      tipo: 'ia-ruleta',
      emoji: '🤖',
      ruta: '/ruleta-praxias',
      color: 'from-purple-400 to-purple-600',
      imagen: 'PraxiaNiño.png'
    },
    {
      id: 'arma-cara-labiales',
      nombre: 'Arma la Cara - Labios',
      descripcion: 'Arrastra y coloca los labios en la posición correcta',
      dificultad: 'facil',
      tipo: 'drag-drop',
      emoji: '💋',
      ruta: '/juego/labiales/arma-cara-labiales',
      color: 'from-pink-400 to-pink-600',
      imagen: 'arma-cara-labiales.png'
    },
    {
      id: 'memoria-gestos-labiales',
      nombre: 'Memoria de Gestos Labiales',
      descripcion: 'Recuerda las secuencias de movimientos labiales',
      dificultad: 'medio',
      tipo: 'memoria',
      emoji: '🧠',
      ruta: '/juego/labiales/memoria-gestos-labiales',
      color: 'from-pink-400 to-pink-600',
      imagen: 'memoria-gestos-labiales.png'
    },
    {
      id: 'soplo-virtual',
      nombre: 'Reto de Pronunciación',
      descripcion: 'Pronuncia correctamente las palabras que aparecen',
      dificultad: 'medio',
      tipo: 'audio',
      emoji: '🗣️',
      ruta: '/juego/labiales/soplo-virtual',
      color: 'from-pink-400 to-pink-600',
      imagen: 'reto-pronunciacion.png'
    },
    {
      id: 'puzzle-movimientos',
      nombre: 'Puzzle de Movimientos',
      descripcion: 'Ordena la secuencia correcta de ejercicios linguales',
      dificultad: 'medio',
      tipo: 'puzzle',
      emoji: '🧩',
      ruta: '/juego/linguales/puzzle-movimientos',
      color: 'from-red-400 to-red-600',
      imagen: 'puzzle-movimientos.png'
    },
    {
      id: 'ritmo-silabas-game',
      nombre: 'Carrera de Sílabas',
      descripcion: 'Corre y salta pronunciando las sílabas correctamente',
      dificultad: 'medio',
      tipo: 'reaccion',
      emoji: '🏃‍♂️',
      ruta: '/juego/linguales/ritmo-silabas',
      color: 'from-red-400 to-red-600',
      imagen: 'carrerasilabas.png'
    },
    {
      id: 'sonidos-divertidos',
      nombre: 'Sonidos Divertidos',
      descripcion: 'Practica onomatopeyas divertidas con animales y objetos',
      dificultad: 'facil',
      tipo: 'audio',
      emoji: '🎵',
      ruta: '/sonidos-divertidos',
      color: 'from-blue-400 to-blue-600',
      imagen: 'SonidosAnimales.png'
    },
    {
      id: 'parejas-silabas',
      nombre: 'Parejas de Sílabas',
      descripcion: 'Arrastra las sílabas correctas hacia sus imágenes',
      dificultad: 'medio',
      tipo: 'silabas',
      emoji: '🎯',
      ruta: '/parejas-silabas',
      color: 'from-blue-400 to-blue-600',
      imagen: 'pareja-silabas.png'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    console.log('🎮 Juegos Terapéuticos cargados - Vista unificada');
  }

  jugarJuego(juego: JuegoInfo) {
    console.log(`🎮 Intentando iniciar juego: ${juego.nombre}`);
    console.log(`📍 Ruta destino: ${juego.ruta}`);
    
    // Navegar a la ruta del juego
    this.router.navigate([juego.ruta]).then(
      (success) => {
        if (success) {
          console.log(`✅ Navegación exitosa a: ${juego.ruta}`);
        } else {
          console.error(`❌ Falló la navegación a: ${juego.ruta}`);
          console.error(`💡 Verifica que la ruta esté configurada en app.routes.ts`);
        }
      },
      (error) => {
        console.error(`❌ Error al navegar a: ${juego.ruta}`, error);
      }
    );
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
      case 'facil': return '5-10 min';
      case 'medio': return '10-15 min';
      case 'dificil': return '15-20 min';
      default: return '10 min';
    }
  }
}