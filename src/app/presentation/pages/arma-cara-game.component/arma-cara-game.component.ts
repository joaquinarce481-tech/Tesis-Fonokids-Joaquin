import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface ParteCara {
  id: string;
  emoji: string;
  nombre: string;
  zona: string;
}

interface Emocion {
  nombre: string;
  color: string;
  partes: ParteCara[];
  emoji: string;
}

interface Zona {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-arma-cara-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './arma-cara-game.component.html',
  styleUrls: ['./arma-cara-game.component.css']
})
export class ArmaCaraGameComponent implements OnInit, OnDestroy {
  // Estados de pantalla
  pantalla: 'inicio' | 'seleccion' | 'juego' | 'completado' = 'inicio';
  
  // Configuración del juego
  modoJuego: 'practica' | 'contrarreloj' | 'desafio' = 'practica';
  emocionObjetivo: string = 'feliz';
  nivel: number = 1;
  
  // Estadísticas
  puntaje: number = 0;
  intentos: number = 0;
  tiempo: number = 0;
  juegoActivo: boolean = false;
  
  // Estado del juego
  partesColocadas: Set<string> = new Set();
  mensajeFeedback: string = '';
  mostrarPista: boolean = false;
  
  // Timer
  intervaloTiempo: any;
  
  // Definición de emociones
  emociones: { [key: string]: Emocion } = {
    feliz: {
      nombre: 'Feliz',
      emoji: '😊',
      color: '#10b981',
      partes: [
        { id: 'boca-feliz', emoji: '😊', nombre: 'Sonrisa', zona: 'boca' },
        { id: 'cejas-feliz', emoji: '😄', nombre: 'Cejas Alegres', zona: 'cejas' },
        { id: 'mejillas', emoji: '😊', nombre: 'Mejillas Rosadas', zona: 'mejillas' }
      ]
    },
    triste: {
      nombre: 'Triste',
      emoji: '😢',
      color: '#3b82f6',
      partes: [
        { id: 'boca-triste', emoji: '☹️', nombre: 'Boca Triste', zona: 'boca' },
        { id: 'cejas-triste', emoji: '😔', nombre: 'Cejas Tristes', zona: 'cejas' },
        { id: 'lagrimas', emoji: '💧', nombre: 'Lágrimas', zona: 'ojos' }
      ]
    },
    sorprendido: {
      nombre: 'Sorprendido',
      emoji: '😮',
      color: '#f59e0b',
      partes: [
        { id: 'boca-O', emoji: '😮', nombre: 'Boca Abierta', zona: 'boca' },
        { id: 'cejas-arriba', emoji: '😯', nombre: 'Cejas Levantadas', zona: 'cejas' },
        { id: 'ojos-grandes', emoji: '👀', nombre: 'Ojos Grandes', zona: 'ojos' }
      ]
    },
    enojado: {
      nombre: 'Enojado',
      emoji: '😠',
      color: '#ef4444',
      partes: [
        { id: 'boca-enojo', emoji: '😠', nombre: 'Boca Enojada', zona: 'boca' },
        { id: 'cejas-enojo', emoji: '😡', nombre: 'Cejas Fruncidas', zona: 'cejas' },
        { id: 'vapor', emoji: '💢', nombre: 'Vapor', zona: 'cejas-extra' }
      ]
    }
  };
  
  // Zonas de la cara (CORREGIDAS para que coincidan con la forma de cara oval)
  zonas: { [key: string]: Zona } = {
    'cejas-extra': { x: 50, y: 18, width: 35, height: 10 },  // Muy arriba (para vapor)
    cejas: { x: 50, y: 28, width: 45, height: 12 },          // Arriba (cejas)
    ojos: { x: 50, y: 42, width: 45, height: 14 },           // Debajo de cejas (lágrimas/ojos grandes)
    mejillas: { x: 50, y: 58, width: 50, height: 16 },       // Centro de la cara
    boca: { x: 50, y: 78, width: 40, height: 16 }            // Abajo (boca)
  };
  
  // Elemento siendo arrastrado
  parteArrastrada: string | null = null;

  constructor(private router: Router) {}

  ngOnInit() {
    console.log('🎮 Juego Arma la Cara iniciado');
  }

  ngOnDestroy() {
    this.detenerTemporizador();
  }

  // ========== NAVEGACIÓN DE PANTALLAS ==========
  
  irASeleccion(modo: string) {
    this.modoJuego = modo as 'practica' | 'contrarreloj' | 'desafio';
    this.pantalla = 'seleccion';
  }

  volverInicio() {
    this.pantalla = 'inicio';
    this.detenerTemporizador();
  }

  volverAJuegos() {
    this.router.navigate(['/juegos-terapeuticos']);
  }

  // ========== INICIAR JUEGO ==========
  
  iniciarJuego(emocion: string) {
    this.emocionObjetivo = emocion;
    this.pantalla = 'juego';
    this.juegoActivo = true;
    this.puntaje = 0;
    this.intentos = 0;
    this.tiempo = 0;
    this.partesColocadas = new Set();
    this.mensajeFeedback = '';
    this.mostrarPista = false;
    
    // Iniciar temporizador si es modo contrarreloj
    if (this.modoJuego === 'contrarreloj') {
      this.iniciarTemporizador();
    }
    
    console.log(`🎯 Iniciando juego - Emoción: ${emocion}, Modo: ${this.modoJuego}`);
  }

  iniciarDesafioAleatorio() {
    const emocionesKeys = Object.keys(this.emociones);
    const emocionAleatoria = emocionesKeys[Math.floor(Math.random() * emocionesKeys.length)];
    this.iniciarJuego(emocionAleatoria);
  }

  // ========== TEMPORIZADOR ==========
  
  iniciarTemporizador() {
    this.detenerTemporizador();
    this.intervaloTiempo = setInterval(() => {
      if (this.juegoActivo) {
        this.tiempo++;
        
        // Si es contrarreloj y se acabó el tiempo
        if (this.modoJuego === 'contrarreloj' && this.tiempo >= 60) {
          this.completarJuego(false);
        }
      }
    }, 1000);
  }

  detenerTemporizador() {
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
      this.intervaloTiempo = null;
    }
  }

  getTiempoRestante(): number {
    return Math.max(0, 60 - this.tiempo);
  }

  // ========== DRAG & DROP ==========
  
  onDragStart(event: DragEvent, parteId: string) {
    if (this.partesColocadas.has(parteId)) {
      event.preventDefault();
      return;
    }
    
    this.parteArrastrada = parteId;
    
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', parteId);
    }
    
    console.log(`🎯 Arrastrando: ${parteId}`);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, zona: string) {
    event.preventDefault();
    
    const parteId = event.dataTransfer?.getData('text/plain');
    
    if (parteId) {
      this.verificarColocacion(parteId, zona);
    }
    
    this.parteArrastrada = null;
  }

  onDragEnd(event: DragEvent) {
    this.parteArrastrada = null;
  }

  // ========== LÓGICA DEL JUEGO ==========
  
  verificarColocacion(parteId: string, zona: string) {
    const emocion = this.emociones[this.emocionObjetivo];
    const parte = emocion.partes.find(p => p.id === parteId);
    
    this.intentos++;
    
    if (parte && parte.zona === zona) {
      // ¡Correcto!
      this.partesColocadas.add(parteId);
      this.puntaje += 100;
      this.mensajeFeedback = '¡Excelente! 🎉';
      
      console.log(`✅ Correcto! Parte ${parteId} colocada en ${zona}`);
      
      // Limpiar mensaje después de 2 segundos
      setTimeout(() => {
        this.mensajeFeedback = '';
      }, 2000);
      
      // Verificar si completó todas las partes
      if (this.partesColocadas.size === emocion.partes.length) {
        setTimeout(() => {
          this.completarJuego(true);
        }, 500);
      }
    } else {
      // Incorrecto
      this.mensajeFeedback = 'Intenta otra zona 🤔';
      
      console.log(`❌ Incorrecto! Parte ${parteId} en ${zona}`);
      
      setTimeout(() => {
        this.mensajeFeedback = '';
      }, 2000);
    }
  }

  completarJuego(exito: boolean) {
    this.juegoActivo = false;
    this.detenerTemporizador();
    
    if (exito) {
      // Calcular bonus
      const bonusTiempo = this.modoJuego === 'contrarreloj' 
        ? Math.max(0, (60 - this.tiempo) * 10) 
        : 0;
      const bonusIntentos = Math.max(0, (10 - this.intentos) * 20);
      
      this.puntaje += bonusTiempo + bonusIntentos;
      
      console.log(`🎉 Juego completado! Puntaje final: ${this.puntaje}`);
    } else {
      console.log('⏱️ Se acabó el tiempo');
    }
    
    this.pantalla = 'completado';
  }

  // ========== UTILIDADES ==========
  
  getEmocionActual(): Emocion {
    return this.emociones[this.emocionObjetivo];
  }

  getEmocionesList(): Array<{ key: string; emocion: Emocion }> {
    return Object.entries(this.emociones).map(([key, emocion]) => ({
      key,
      emocion
    }));
  }

  estaColocada(parteId: string): boolean {
    return this.partesColocadas.has(parteId);
  }

  getParteEnZona(zona: string): ParteCara | undefined {
    const emocion = this.getEmocionActual();
    return emocion.partes.find(p => 
      p.zona === zona && this.partesColocadas.has(p.id)
    );
  }

  getProgreso(): number {
    const emocion = this.getEmocionActual();
    return (this.partesColocadas.size / emocion.partes.length) * 100;
  }

  getEstrellas(): number {
    if (this.puntaje >= 400) return 3;
    if (this.puntaje >= 250) return 2;
    return 1;
  }

  togglePista() {
    this.mostrarPista = !this.mostrarPista;
  }

  reiniciarJuego() {
    this.pantalla = 'seleccion';
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins}:${segs.toString().padStart(2, '0')}`;
  }
}