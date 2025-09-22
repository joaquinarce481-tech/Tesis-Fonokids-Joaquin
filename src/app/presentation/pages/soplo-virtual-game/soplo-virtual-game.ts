import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

// Declaración de tipos para Web Audio API
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface Vela {
  id: string;
  x: number;
  y: number;
  apagada: boolean;
  intensidadLlama: number;
  tiempoApagado?: number;
}

@Component({
  selector: 'app-soplo-virtual-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './soplo-virtual-game.component.html',
  styleUrls: ['./soplo-virtual-game.component.css']
})
export class SoploVirtualGameComponent implements OnInit, OnDestroy {
  // Estados del juego
  faseJuego: 'instrucciones' | 'preparando' | 'jugando' | 'completado' | 'error' = 'instrucciones';
  nivelActual: number = 1;
  maxNiveles: number = 5;
  puntaje: number = 0;
  tiempoInicio: number = 0;
  tiempoTranscurrido: number = 0;
  tiempoLimite: number = 60; // segundos por nivel
  intervaloTiempo: any;
  
  // Audio y micrófono - Tipos más específicos para evitar errores
  audioContext: AudioContext | null = null;
  microphone: MediaStreamAudioSourceNode | null = null;
  analyser: AnalyserNode | null = null;
  dataArray: Uint8Array = new Uint8Array(0);
  stream: MediaStream | null = null;
  nivelSoplo: number = 0;
  promedioSoplo: number = 0;
  umbralSoplo: number = 30; // Umbral mínimo para detectar soplo
  
  // Velas
  velas: Vela[] = [];
  velasApagadas: number = 0;
  totalVelas: number = 3;
  
  // Animaciones y efectos
  particulas: any[] = [];
  mostrandoParticulas: boolean = false;
  intervaloAnimacion: any;
  
  // Permisos de micrófono
  permisoMicrofono: boolean = false;
  errorMicrofono: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.iniciarJuego();
  }

  ngOnDestroy() {
    this.limpiarRecursos();
  }

  // === INICIALIZACIÓN ===
  
  iniciarJuego() {
    this.tiempoInicio = Date.now();
    this.puntaje = 0;
    this.nivelActual = 1;
    this.faseJuego = 'instrucciones';
    this.iniciarTemporizador();
    console.log('🌬️ Juego "Soplo Virtual" iniciado');
  }

  iniciarTemporizador() {
    this.intervaloTiempo = setInterval(() => {
      if (this.faseJuego === 'jugando') {
        this.tiempoTranscurrido = Math.floor((Date.now() - this.tiempoInicio) / 1000);
        
        if (this.tiempoTranscurrido >= this.tiempoLimite) {
          this.tiempoAgotado();
        }
      }
    }, 1000);
  }

  // === MICRÓFONO Y AUDIO ===
  
  async solicitarPermisoMicrofono() {
    try {
      this.faseJuego = 'preparando';
      
      // Solicitar acceso al micrófono
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });
      
      // Crear contexto de audio
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      
      // Configurar analizador
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Conectar micrófono al analizador
      this.microphone.connect(this.analyser);
      
      this.permisoMicrofono = true;
      console.log('🎤 Micrófono configurado correctamente');
      
      // Empezar nivel después de un breve delay
      setTimeout(() => {
        this.empezarNivel();
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Error al acceder al micrófono:', error);
      this.errorMicrofono = 'No se pudo acceder al micrófono. Verifica los permisos.';
      this.faseJuego = 'error';
    }
  }

  detectarSoplo() {
    if (!this.analyser || this.faseJuego !== 'jugando') return;
    
    // Obtener datos de frecuencia - cast explícito para resolver el error de tipos
    this.analyser.getByteFrequencyData(this.dataArray as any);
    
    // Calcular nivel promedio de audio
    let sum = 0;
    const arrayLength = this.dataArray.length;
    for (let i = 0; i < arrayLength; i++) {
      sum += this.dataArray[i];
    }
    
    this.nivelSoplo = arrayLength > 0 ? sum / arrayLength : 0;
    
    // Calcular promedio móvil para suavizar
    this.promedioSoplo = (this.promedioSoplo * 0.7) + (this.nivelSoplo * 0.3);
    
    // Procesar soplo si supera el umbral
    if (this.promedioSoplo > this.umbralSoplo) {
      this.procesarSoplo(this.promedioSoplo);
    }
    
    // Continuar detectando
    if (this.faseJuego === 'jugando') {
      requestAnimationFrame(() => this.detectarSoplo());
    }
  }

  procesarSoplo(intensidad: number) {
    // Aplicar soplo a todas las velas no apagadas
    this.velas.forEach(vela => {
      if (!vela.apagada) {
        // Calcular distancia del soplo a la vela (simulado)
        const distancia = Math.random() * 0.5 + 0.5; // 0.5 - 1.0
        const fuerzaSoplo = (intensidad / 100) * distancia;
        
        // Reducir intensidad de la llama
        vela.intensidadLlama = Math.max(0, vela.intensidadLlama - fuerzaSoplo * 2);
        
        // Si la llama es muy débil, apagar vela
        if (vela.intensidadLlama <= 0.1) {
          this.apagarVela(vela);
        }
      }
    });
    
    // Generar partículas de soplo
    this.generarParticulas(intensidad);
  }

  // === CONTROL DE JUEGO ===
  
  empezarNivel() {
    this.faseJuego = 'jugando';
    this.tiempoInicio = Date.now();
    this.tiempoTranscurrido = 0;
    this.velasApagadas = 0;
    
    // Generar velas para el nivel
    this.generarVelas();
    
    // Empezar detección de soplo
    this.detectarSoplo();
    
    console.log(`🕯️ Nivel ${this.nivelActual}: ${this.totalVelas} velas generadas`);
  }

  generarVelas() {
    this.velas = [];
    this.totalVelas = Math.min(3 + this.nivelActual, 8); // Aumentar velas por nivel
    
    for (let i = 0; i < this.totalVelas; i++) {
      const vela: Vela = {
        id: `vela-${i}`,
        x: 100 + (i * 120) + (Math.random() * 40 - 20),
        y: 200 + (Math.random() * 100),
        apagada: false,
        intensidadLlama: 1.0
      };
      
      this.velas.push(vela);
    }
  }

  apagarVela(vela: Vela) {
    if (vela.apagada) return;
    
    vela.apagada = true;
    vela.tiempoApagado = Date.now();
    this.velasApagadas++;
    
    // Efectos visuales y sonoros
    this.mostrarEfectoApagado(vela);
    this.puntaje += 100 + (this.nivelActual * 25);
    
    // Vibración
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    console.log(`🕯️ Vela apagada! ${this.velasApagadas}/${this.totalVelas}`);
    
    // Verificar si se completó el nivel
    if (this.velasApagadas >= this.totalVelas) {
      setTimeout(() => {
        this.completarNivel();
      }, 500);
    }
  }

  completarNivel() {
    this.faseJuego = 'preparando';
    
    // Calcular bonus
    const bonusTiempo = Math.max(0, this.tiempoLimite - this.tiempoTranscurrido) * 10;
    const bonusNivel = this.nivelActual * 100;
    this.puntaje += bonusTiempo + bonusNivel;
    
    console.log(`✅ Nivel ${this.nivelActual} completado. Bonus: +${bonusTiempo + bonusNivel}`);
    
    if (this.nivelActual >= this.maxNiveles) {
      // Juego completado
      setTimeout(() => {
        this.completarJuego();
      }, 2000);
    } else {
      // Siguiente nivel
      setTimeout(() => {
        this.nivelActual++;
        this.empezarNivel();
      }, 2000);
    }
  }

  completarJuego() {
    this.faseJuego = 'completado';
    
    // Bonus final
    const bonusCompletado = 1000;
    this.puntaje += bonusCompletado;
    
    console.log('🎉 ¡Juego completado!');
    console.log(`📊 Puntaje final: ${this.puntaje}`);
  }

  tiempoAgotado() {
    this.faseJuego = 'completado';
    console.log('⏰ Tiempo agotado');
  }

  // === EFECTOS VISUALES ===
  
  mostrarEfectoApagado(vela: Vela) {
    // Crear efecto de humo
    this.generarHumo(vela.x, vela.y);
  }

  generarParticulas(intensidad: number) {
    if (this.mostrandoParticulas) return;
    
    this.mostrandoParticulas = true;
    
    // Generar partículas basadas en la intensidad
    const numParticulas = Math.floor(intensidad / 10);
    
    for (let i = 0; i < numParticulas; i++) {
      const particula = {
        id: Math.random(),
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vida: 1000 // milisegundos
      };
      
      this.particulas.push(particula);
    }
    
    // Limpiar partículas antiguas
    setTimeout(() => {
      this.particulas = this.particulas.filter(p => Date.now() - p.vida < 1000);
      this.mostrandoParticulas = false;
    }, 200);
  }

  generarHumo(x: number, y: number) {
    // Efecto de humo cuando se apaga una vela
    console.log(`💨 Generando humo en posición ${x}, ${y}`);
  }

  // === UTILIDADES ===
  
  formatearTiempo(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  }

  getTiempoRestante(): number {
    return Math.max(0, this.tiempoLimite - this.tiempoTranscurrido);
  }

  getIntensidadSoplo(): number {
    return Math.min(100, this.umbralSoplo > 0 ? (this.promedioSoplo / this.umbralSoplo) * 100 : 0);
  }

  getEstrellas(): number {
    if (this.nivelActual >= this.maxNiveles && this.puntaje >= 3000) return 3;
    if (this.nivelActual >= 3 && this.puntaje >= 2000) return 2;
    if (this.puntaje >= 1000) return 1;
    return 0;
  }

  // === NAVEGACIÓN ===
  
  reiniciarJuego() {
    this.limpiarRecursos();
    this.iniciarJuego();
  }

  volverAJuegos() {
    this.limpiarRecursos();
    this.router.navigate(['/juegos-terapeuticos']);
  }

  siguienteJuego() {
    this.limpiarRecursos();
    this.router.navigate(['/juego', 'linguales', 'atrapa-lengua']);
  }

  // === LIMPIEZA DE RECURSOS ===
  
  limpiarRecursos() {
    // Detener intervalos
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
    
    if (this.intervaloAnimacion) {
      clearInterval(this.intervaloAnimacion);
    }
    
    // Cerrar recursos de audio
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.microphone = null;
    this.analyser = null;
    this.permisoMicrofono = false;
    
    console.log('🧹 Recursos limpiados');
  }

  // === CONTROL DE PERMISOS ===
  
  saltarInstrucciones() {
    this.solicitarPermisoMicrofono();
  }
}