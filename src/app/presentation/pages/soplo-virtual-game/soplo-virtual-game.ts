import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

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
  tiempoLimite: number = 60;
  intervaloTiempo: any;
  
  // Audio y micrófono
  audioContext: AudioContext | null = null;
  microphone: MediaStreamAudioSourceNode | null = null;
  analyser: AnalyserNode | null = null;
  dataArray: Uint8Array = new Uint8Array(0);
  frequencyData: Uint8Array = new Uint8Array(0);
  stream: MediaStream | null = null;
  
  // Detección de soplo simplificada
  nivelSoplo: number = 0;
  promedioSoplo: number = 0;
  umbralSoplo: number = 8; // Bajado de 40 a 8 para micrófonos con baja sensibilidad
  tiempoSoploInicio: number = 0;
  soploActivo: boolean = false;
  duracionMinimaSoplo: number = 150; // Aumentado a 150ms para mayor precisión
  
  // Velas
  velas: Vela[] = [];
  velasApagadas: number = 0;
  totalVelas: number = 3;
  
  // Animaciones
  particulas: any[] = [];
  mostrandoParticulas: boolean = false;
  intervaloAnimacion: any;
  
  // Permisos
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

  async solicitarPermisoMicrofono() {
    try {
      this.faseJuego = 'preparando';
      console.log('🎤 Solicitando permiso de micrófono...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.2;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.frequencyData = new Uint8Array(bufferLength);
      
      this.microphone.connect(this.analyser);
      
      this.permisoMicrofono = true;
      console.log('✅ Micrófono configurado');
      
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
    if (!this.analyser || this.faseJuego !== 'jugando') {
      return;
    }
    
    this.analyser.getByteFrequencyData(this.frequencyData as any);
    
    let suma = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      suma += this.frequencyData[i];
    }
    const volumenPromedio = suma / this.frequencyData.length;
    
    if (Math.random() < 0.03) {
      console.log('🔊 Volumen:', volumenPromedio.toFixed(1));
    }
    
    this.nivelSoplo = (this.nivelSoplo * 0.7) + (volumenPromedio * 0.3);
    
    const hayVolumenAlto = this.nivelSoplo > this.umbralSoplo;
    
    if (hayVolumenAlto) {
      if (!this.soploActivo) {
        this.soploActivo = true;
        this.tiempoSoploInicio = Date.now();
        console.log('🌬️ Posible soplo iniciado - Volumen:', this.nivelSoplo.toFixed(1));
      } else {
        const duracion = Date.now() - this.tiempoSoploInicio;
        
        if (duracion >= this.duracionMinimaSoplo) {
          this.procesarSoplo(this.nivelSoplo);
          console.log('💨 SOPLO CONFIRMADO - Volumen:', this.nivelSoplo.toFixed(1), 'Duración:', duracion + 'ms');
        }
      }
    } else {
      if (this.soploActivo) {
        const duracion = Date.now() - this.tiempoSoploInicio;
        if (duracion < this.duracionMinimaSoplo) {
          console.log('🗣️ VOZ DETECTADA (muy corta) - Duración:', duracion + 'ms');
        }
        this.soploActivo = false;
      }
    }
    
    if (this.faseJuego === 'jugando') {
      requestAnimationFrame(() => this.detectarSoplo());
    }
  }

  procesarSoplo(intensidad: number) {
    this.velas.forEach(vela => {
      if (!vela.apagada) {
        const distancia = Math.random() * 0.5 + 0.5;
        const fuerzaSoplo = (intensidad / 100) * distancia;
        
        vela.intensidadLlama = Math.max(0, vela.intensidadLlama - fuerzaSoplo * 2);
        
        if (vela.intensidadLlama <= 0.1) {
          this.apagarVela(vela);
        }
      }
    });
    
    this.generarParticulas(intensidad);
  }

  empezarNivel() {
    this.faseJuego = 'jugando';
    this.tiempoInicio = Date.now();
    this.tiempoTranscurrido = 0;
    this.velasApagadas = 0;
    
    this.generarVelas();
    this.detectarSoplo();
    
    console.log(`🕯️ Nivel ${this.nivelActual}: ${this.totalVelas} velas generadas`);
  }

  generarVelas() {
    this.velas = [];
    this.totalVelas = Math.min(3 + this.nivelActual, 8);
    
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
    
    this.mostrarEfectoApagado(vela);
    this.puntaje += 100 + (this.nivelActual * 25);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    console.log(`🕯️ Vela apagada! ${this.velasApagadas}/${this.totalVelas}`);
    
    if (this.velasApagadas >= this.totalVelas) {
      setTimeout(() => {
        this.completarNivel();
      }, 500);
    }
  }

  completarNivel() {
    this.faseJuego = 'preparando';
    
    const bonusTiempo = Math.max(0, this.tiempoLimite - this.tiempoTranscurrido) * 10;
    const bonusNivel = this.nivelActual * 100;
    this.puntaje += bonusTiempo + bonusNivel;
    
    console.log(`✅ Nivel ${this.nivelActual} completado. Bonus: +${bonusTiempo + bonusNivel}`);
    
    if (this.nivelActual >= this.maxNiveles) {
      setTimeout(() => {
        this.completarJuego();
      }, 2000);
    } else {
      setTimeout(() => {
        this.nivelActual++;
        this.empezarNivel();
      }, 2000);
    }
  }

  completarJuego() {
    this.faseJuego = 'completado';
    
    const bonusCompletado = 1000;
    this.puntaje += bonusCompletado;
    
    console.log('🎉 ¡Juego completado!');
    console.log(`📊 Puntaje final: ${this.puntaje}`);
  }

  tiempoAgotado() {
    this.faseJuego = 'completado';
    console.log('⏰ Tiempo agotado');
  }

  mostrarEfectoApagado(vela: Vela) {
    this.generarHumo(vela.x, vela.y);
  }

  generarParticulas(intensidad: number) {
    if (this.mostrandoParticulas) return;
    
    this.mostrandoParticulas = true;
    
    const numParticulas = Math.floor(intensidad / 10);
    
    for (let i = 0; i < numParticulas; i++) {
      const particula = {
        id: Math.random(),
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vida: Date.now()
      };
      
      this.particulas.push(particula);
    }
    
    setTimeout(() => {
      this.particulas = this.particulas.filter(p => Date.now() - p.vida < 1000);
      this.mostrandoParticulas = false;
    }, 200);
  }

  generarHumo(x: number, y: number) {
    console.log(`💨 Generando humo en posición ${x}, ${y}`);
  }

  formatearTiempo(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  }

  getTiempoRestante(): number {
    return Math.max(0, this.tiempoLimite - this.tiempoTranscurrido);
  }

  getIntensidadSoplo(): number {
    return Math.min(100, this.umbralSoplo > 0 ? (this.nivelSoplo / this.umbralSoplo) * 100 : 0);
  }

  getEstrellas(): number {
    if (this.nivelActual >= this.maxNiveles && this.puntaje >= 3000) return 3;
    if (this.nivelActual >= 3 && this.puntaje >= 2000) return 2;
    if (this.puntaje >= 1000) return 1;
    return 0;
  }

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

  limpiarRecursos() {
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
    
    if (this.intervaloAnimacion) {
      clearInterval(this.intervaloAnimacion);
    }
    
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

  saltarInstrucciones() {
    this.solicitarPermisoMicrofono();
  }
}