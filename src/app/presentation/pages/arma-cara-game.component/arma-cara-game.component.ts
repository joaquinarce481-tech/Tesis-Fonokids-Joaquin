import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

interface ParteCara {
  id: string;
  nombre: string;
  emoji: string;
  posicionCorrecta: { x: number; y: number };
  posicionActual: { x: number; y: number };
  colocada: boolean;
  arrastrando: boolean;
}

@Component({
  selector: 'app-arma-cara-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './arma-cara-game.component.html',
  styleUrls: ['./arma-cara-game.component.css']
})
export class ArmaCaraGameComponent implements OnInit, OnDestroy {
  // Estado del juego
  juegoCompletado: boolean = false;
  puntaje: number = 0;
  intentos: number = 0;
  tiempoInicio: number = 0;
  tiempoTranscurrido: number = 0;
  intervaloTiempo: any;
  
  // Elementos arrastrables
  partesCara: ParteCara[] = [
    {
      id: 'labios',
      nombre: 'Labios',
      emoji: '💋',
      posicionCorrecta: { x: 250, y: 320 },
      posicionActual: { x: 50, y: 500 },
      colocada: false,
      arrastrando: false
    },
    {
      id: 'lengua',
      nombre: 'Lengua',
      emoji: '👅',
      posicionCorrecta: { x: 250, y: 350 },
      posicionActual: { x: 150, y: 500 },
      colocada: false,
      arrastrando: false
    },
    {
      id: 'mejillas',
      nombre: 'Mejillas',
      emoji: '😊',
      posicionCorrecta: { x: 180, y: 280 },
      posicionActual: { x: 250, y: 500 },
      colocada: false,
      arrastrando: false
    }
  ];

  // Variables para drag & drop
  elementoArrastrado: ParteCara | null = null;
  offsetX: number = 0;
  offsetY: number = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.iniciarJuego();
    this.iniciarTemporizador();
  }

  ngOnDestroy() {
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
  }

  iniciarJuego() {
    this.tiempoInicio = Date.now();
    this.puntaje = 0;
    this.intentos = 0;
    this.juegoCompletado = false;
    
    // Randomizar posiciones iniciales
    this.partesCara.forEach((parte, index) => {
      parte.posicionActual = {
        x: 50 + (index * 120),
        y: 500 + (Math.random() * 50)
      };
      parte.colocada = false;
      parte.arrastrando = false;
    });

    console.log('🎮 Juego "Arma la cara" iniciado');
  }

  iniciarTemporizador() {
    this.intervaloTiempo = setInterval(() => {
      if (!this.juegoCompletado) {
        this.tiempoTranscurrido = Math.floor((Date.now() - this.tiempoInicio) / 1000);
      }
    }, 1000);
  }

  // === EVENTOS DE DRAG & DROP ===
  onDragStart(event: DragEvent, parte: ParteCara) {
    if (parte.colocada) return; // No permitir arrastrar piezas ya colocadas
    
    this.elementoArrastrado = parte;
    parte.arrastrando = true;
    
    // Calcular offset para drag suave
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.offsetX = event.clientX - rect.left;
    this.offsetY = event.clientY - rect.top;
    
    console.log(`🎯 Arrastrando: ${parte.nombre}`);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault(); // Permitir drop
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    
    if (!this.elementoArrastrado) return;

    // Obtener coordenadas del contenedor del juego
    const gameContainer = document.querySelector('.game-area');
    if (!gameContainer) return;
    
    const rect = gameContainer.getBoundingClientRect();
    const x = event.clientX - rect.left - this.offsetX;
    const y = event.clientY - rect.top - this.offsetY;

    // Actualizar posición
    this.elementoArrastrado.posicionActual = { x, y };
    this.elementoArrastrado.arrastrando = false;
    
    // Verificar si está en la posición correcta
    this.verificarPosicion(this.elementoArrastrado);
    
    this.intentos++;
    this.elementoArrastrado = null;
  }

  onDragEnd(event: DragEvent) {
    if (this.elementoArrastrado) {
      this.elementoArrastrado.arrastrando = false;
      this.elementoArrastrado = null;
    }
  }

  // === LÓGICA DEL JUEGO ===
  verificarPosicion(parte: ParteCara) {
    const tolerancia = 60; // Píxeles de tolerancia para considerar correcta la posición
    
    const distanciaX = Math.abs(parte.posicionActual.x - parte.posicionCorrecta.x);
    const distanciaY = Math.abs(parte.posicionActual.y - parte.posicionCorrecta.y);
    
    if (distanciaX <= tolerancia && distanciaY <= tolerancia) {
      // ¡Posición correcta!
      parte.colocada = true;
      parte.posicionActual = { ...parte.posicionCorrecta }; // Snap a posición exacta
      this.puntaje += 100;
      
      this.mostrarFeedbackPositivo(parte);
      
      // Verificar si el juego está completo
      if (this.todasLasPartesColocadas()) {
        setTimeout(() => this.completarJuego(), 500);
      }
    } else {
      // Posición incorrecta
      this.mostrarFeedbackNegativo();
    }
  }

  todasLasPartesColocadas(): boolean {
    return this.partesCara.every(parte => parte.colocada);
  }

  mostrarFeedbackPositivo(parte: ParteCara) {
    console.log(`✅ ¡Correcto! ${parte.nombre} colocado correctamente`);
    
    // Efecto visual de éxito
    const elemento = document.getElementById(`parte-${parte.id}`);
    if (elemento) {
      elemento.classList.add('colocado-correctamente');
    }
  }

  mostrarFeedbackNegativo() {
    console.log('❌ Inténtalo de nuevo');
    
    // Vibración si está disponible
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  }

  completarJuego() {
    this.juegoCompletado = true;
    
    // Calcular puntaje final
    const bonusTiempo = Math.max(0, 60 - this.tiempoTranscurrido) * 10;
    const bonusIntentos = Math.max(0, 10 - this.intentos) * 20;
    this.puntaje += bonusTiempo + bonusIntentos;
    
    console.log('🎉 ¡Juego completado!');
    console.log(`📊 Puntaje final: ${this.puntaje}`);
    console.log(`⏱️ Tiempo: ${this.tiempoTranscurrido}s`);
    console.log(`🎯 Intentos: ${this.intentos}`);
  }

  // === NAVEGACIÓN ===
  reiniciarJuego() {
    this.iniciarJuego();
  }

  volverAJuegos() {
    this.router.navigate(['/juegos-terapeuticos']);
  }

  siguienteJuego() {
    // Navegar al próximo juego
    this.router.navigate(['/juego', 'labiales', 'memoria-gestos-labiales']);
  }

  // === UTILIDADES ===
  formatearTiempo(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  }

  getEstrellas(): number {
    if (this.puntaje >= 300) return 3;
    if (this.puntaje >= 200) return 2;
    if (this.puntaje >= 100) return 1;
    return 0;
  }
}