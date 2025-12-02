import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HistorialActividadesService } from '../..//services/historial-actividades.service'; // 📝 NUEVO

interface Obstaculo {
  id: string;
  silaba: string;
  posicionX: number;
  superado: boolean;
  activo: boolean;
  emoji: string;
}

interface Particula {
  id: string;
  x: number;
  y: number;
  velocidadX: number;
  velocidadY: number;
  vida: number;
  color: string;
}

@Component({
  selector: 'app-ritmo-silabas-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ritmo-silabas-game.component.html',
  styleUrls: ['./ritmo-silabas-game.component.css']
})
export class RitmoSilabasGameComponent implements OnInit, OnDestroy {
  // Estados del juego
  faseJuego: 'instrucciones' | 'jugando' | 'pausado' | 'felicitacion' = 'instrucciones';
  mostrarModalFelicitacion: boolean = false;
  metaParaFelicitacion: number = 25;
  
  // Jugador
  jugadorY: number = 300;
  jugadorSaltando: boolean = false;
  velocidadSalto: number = 0;
  gravedad: number = 0.6;
  fuerzaSalto: number = -15;
  suelo: number = 300;
  
  // Obstáculos
  obstaculos: Obstaculo[] = [];
  velocidadJuego: number = 5;
  distanciaEntreObstaculos: number = 600;
  ultimaPosicionObstaculo: number = 800;
  
  // Sílabas disponibles
  silabasDisponibles: string[] = ['PA', 'PE', 'PI', 'PO', 'PU', 'MA', 'ME', 'MI', 'MO', 'MU', 'TA', 'TE', 'TI', 'TO', 'TU', 'LA', 'LE', 'LI', 'LO', 'LU', 'SA', 'SE', 'SI', 'SO', 'SU'];
  emojisPorSilaba: { [key: string]: string } = {
    'PA': '🦆', 'PE': '⚽', 'PI': '🔋', 'PO': '🐔', 'PU': '🚪',
    'MA': '✋', 'ME': '🪑', 'MI': '🍯', 'MO': '🐵', 'MU': '🪆',
    'TA': '☕', 'TE': '📺', 'TI': '✂️', 'TO': '🍅', 'TU': '🌷',
    'LA': '🧶', 'LE': '🦁', 'LI': '📚', 'LO': '🦜', 'LU': '🌙',
    'SA': '🐸', 'SE': '🚦', 'SI': '🪑', 'SO': '☀️', 'SU': '➕'
  };
  
  // Partículas de efectos
  particulas: Particula[] = [];
  
  // Puntuación y progreso
  obstaculosSuperados: number = 0;
  palabrasCorrectas: number = 0;
  distanciaRecorrida: number = 0;
  
  // Reconocimiento de voz
  recognition: any = null;
  escuchandoVoz: boolean = false;
  ultimaPalabraDetectada: string = '';
  
  // Control del juego
  intervaloJuego: any;
  frameRate: number = 60;
  
  // Animaciones
  animacionPersonaje: string = 'corriendo';
  
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private historialService: HistorialActividadesService // 📝 NUEVO: Inyectar servicio
  ) {}

  ngOnInit() {
    this.inicializarReconocimientoVoz();
  }

  ngOnDestroy() {
    this.detenerJuego();
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // ... [RESTO DEL CÓDIGO SIN CAMBIOS HASTA mostrarFelicitacion()] ...

  inicializarReconocimientoVoz() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 5;

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const palabra = transcript.toUpperCase().trim();
          
          if (palabra.length > 0) {
            this.ultimaPalabraDetectada = palabra;
            this.procesarPalabraDetectada(palabra);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Error en reconocimiento de voz:', event.error);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          if (this.escuchandoVoz && this.faseJuego === 'jugando') {
            setTimeout(() => {
              if (this.recognition && this.escuchandoVoz) {
                try {
                  this.recognition.start();
                } catch (e) {
                  console.log('Recognition already started');
                }
              }
            }, 100);
          }
        }
      };

      this.recognition.onend = () => {
        if (this.escuchandoVoz && this.faseJuego === 'jugando') {
          try {
            this.recognition.start();
          } catch (e) {
            console.log('Recognition restart failed:', e);
          }
        }
      };

      console.log('✅ Reconocimiento de voz inicializado');
    } else {
      console.warn('⚠️ Reconocimiento de voz no disponible');
    }
  }

  procesarPalabraDetectada(palabra: string) {
    if (this.faseJuego !== 'jugando') return;

    const palabraNormalizada = this.normalizarTexto(palabra);
    
    console.log(`🎤 Detectado: "${palabra}" → Normalizado: "${palabraNormalizada}"`);

    const obstaculoProximo = this.obstaculos.find(obs => 
      !obs.superado && 
      obs.activo && 
      obs.posicionX > 100 &&
      obs.posicionX < 700
    );

    if (!obstaculoProximo) {
      console.log('❌ No hay obstáculos próximos');
      return;
    }

    const silabaNormalizada = this.normalizarTexto(obstaculoProximo.silaba);
    
    if (this.contieneSilaba(palabraNormalizada, silabaNormalizada)) {
      obstaculoProximo.superado = true;
      this.saltar();
      this.palabrasCorrectas++;
      this.obstaculosSuperados++;
      this.ultimaPalabraDetectada = `✅ ${obstaculoProximo.silaba}`;
      this.reproducirSonidoAcierto();
      this.crearParticulas(obstaculoProximo.posicionX, this.suelo, '#10b981');
      console.log(`✅ ¡CORRECTO! Palabra: "${palabra}" contiene sílaba: "${obstaculoProximo.silaba}"`);
      console.log(`📊 Palabras correctas: ${this.palabrasCorrectas}/25`);
      
      if (this.palabrasCorrectas >= this.metaParaFelicitacion) {
        console.log('🎯 ¡META ALCANZADA! Mostrando felicitación...');
        this.mostrarFelicitacion();
      }
    } else {
      this.ultimaPalabraDetectada = `❌ ${palabra.substring(0, 15)}`;
      console.log(`❌ Esperaba: "${obstaculoProximo.silaba}" pero detectó: "${palabra}"`);
    }
  }

  normalizarTexto(texto: string): string {
    return texto
      .toUpperCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '');
  }

  contieneSilaba(palabra: string, silaba: string): boolean {
    if (palabra.includes(silaba)) {
      return true;
    }
    
    if (silaba.length === 2) {
      const consonante = silaba[0];
      const vocal = silaba[1];
      
      const regex = new RegExp(`${consonante}${vocal}`, 'g');
      if (regex.test(palabra)) {
        return true;
      }
    }
    
    if (silaba.length === 2 && palabra.length >= 2) {
      for (let i = 0; i < palabra.length - 1; i++) {
        if (palabra[i] === silaba[0] && palabra[i + 1] === silaba[1]) {
          return true;
        }
      }
    }
    
    return false;
  }

  iniciarEscuchaVoz() {
    if (this.recognition && !this.escuchandoVoz) {
      try {
        this.recognition.start();
        this.escuchandoVoz = true;
        console.log('🎤 Escuchando voz...');
      } catch (e) {
        console.log('Recognition already started');
      }
    }
  }

  detenerEscuchaVoz() {
    if (this.recognition && this.escuchandoVoz) {
      this.recognition.stop();
      this.escuchandoVoz = false;
      console.log('🔇 Voz detenida');
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.faseJuego === 'jugando' && event.code === 'Space') {
      this.saltar();
      event.preventDefault();
    }
  }

  iniciarJuego() {
    this.faseJuego = 'instrucciones';
    this.reiniciarEstadisticas();
  }

  empezarJuego() {
    this.faseJuego = 'jugando';
    this.reiniciarEstadisticas();
    this.iniciarEscuchaVoz();
    
    this.intervaloJuego = setInterval(() => {
      this.actualizarJuego();
    }, 1000 / this.frameRate);
    
    console.log('🏃 ¡Carrera iniciada!');
  }

  reiniciarEstadisticas() {
    this.obstaculosSuperados = 0;
    this.palabrasCorrectas = 0;
    this.distanciaRecorrida = 0;
    this.jugadorY = this.suelo;
    this.jugadorSaltando = false;
    this.velocidadSalto = 0;
    this.obstaculos = [];
    this.particulas = [];
    this.velocidadJuego = 5;
    this.ultimaPosicionObstaculo = 800;
    this.animacionPersonaje = 'corriendo';
    this.ultimaPalabraDetectada = '';
  }

  actualizarJuego() {
    this.actualizarJugador();
    this.actualizarObstaculos();
    this.generarObstaculos();
    this.actualizarParticulas();
    this.detectarColisiones();
    this.distanciaRecorrida += this.velocidadJuego * 0.1;
  }

  actualizarJugador() {
    if (this.jugadorSaltando) {
      this.velocidadSalto += this.gravedad;
      this.jugadorY += this.velocidadSalto;
      
      if (this.jugadorY >= this.suelo) {
        this.jugadorY = this.suelo;
        this.jugadorSaltando = false;
        this.velocidadSalto = 0;
        this.animacionPersonaje = 'corriendo';
      }
    }
  }

  saltar() {
    if (!this.jugadorSaltando && this.faseJuego === 'jugando') {
      this.jugadorSaltando = true;
      this.velocidadSalto = this.fuerzaSalto;
      this.animacionPersonaje = 'saltando';
      this.reproducirSonidoSalto();
      console.log('⬆️ ¡Salto!');
    }
  }

  actualizarObstaculos() {
    this.obstaculos = this.obstaculos.filter(obs => {
      obs.posicionX -= this.velocidadJuego;
      return obs.posicionX > -100;
    });
  }

  generarObstaculos() {
    const anchoVentana = 800;
    
    if (this.obstaculos.length === 0 || 
        (anchoVentana - this.ultimaPosicionObstaculo) > this.distanciaEntreObstaculos) {
      
      const silabaAleatoria = this.silabasDisponibles[
        Math.floor(Math.random() * this.silabasDisponibles.length)
      ];
      
      const nuevoObstaculo: Obstaculo = {
        id: `obs-${Date.now()}-${Math.random()}`,
        silaba: silabaAleatoria,
        posicionX: anchoVentana + 50,
        superado: false,
        activo: true,
        emoji: this.emojisPorSilaba[silabaAleatoria] || '❓'
      };
      
      this.obstaculos.push(nuevoObstaculo);
      this.ultimaPosicionObstaculo = nuevoObstaculo.posicionX;
    }
  }

  detectarColisiones() {
    const jugadorX = 100;
    const jugadorAncho = 60;
    const jugadorAlto = 80;
    
    for (const obs of this.obstaculos) {
      if (obs.activo && !obs.superado) {
        const obstaculoAncho = 60;
        const obstaculoAlto = 80;
        
        if (jugadorX < obs.posicionX + obstaculoAncho &&
            jugadorX + jugadorAncho > obs.posicionX &&
            this.jugadorY < this.suelo + obstaculoAlto &&
            this.jugadorY + jugadorAlto > this.suelo) {
          
          this.colision(obs);
        }
      }
    }
  }

  colision(obstaculo: Obstaculo) {
    obstaculo.activo = false;
    this.crearExplosion(obstaculo.posicionX, this.suelo);
    this.reproducirSonidoColision();
    console.log(`💥 Choque con ${obstaculo.silaba} - ¡Intenta pronunciarla antes!`);
  }

  obstaculoSuperado(obstaculo: Obstaculo) {
    this.obstaculosSuperados++;
    this.palabrasCorrectas++;
    this.crearParticulas(obstaculo.posicionX, this.suelo, '#10b981');
    console.log(`✅ Obstáculo superado correctamente!`);
  }

  actualizarParticulas() {
    this.particulas = this.particulas.filter(p => {
      p.x += p.velocidadX;
      p.y += p.velocidadY;
      p.velocidadY += 0.3;
      p.vida--;
      return p.vida > 0;
    });
  }

  crearParticulas(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      this.particulas.push({
        id: `part-${Date.now()}-${i}`,
        x,
        y,
        velocidadX: (Math.random() - 0.5) * 8,
        velocidadY: (Math.random() - 0.5) * 8 - 5,
        vida: 30,
        color
      });
    }
  }

  crearExplosion(x: number, y: number) {
    this.crearParticulas(x, y, '#ef4444');
  }

  reproducirSonidoSalto() {}

  reproducirSonidoAcierto() {
    this.hablar('¡Bien!');
  }

  reproducirSonidoColision() {
    this.hablar('¡Intenta de nuevo!');
  }

  private hablar(texto: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.rate = 1.2;
      utterance.pitch = 1.3;
      utterance.volume = 0.3;
      window.speechSynthesis.speak(utterance);
    }
  }

  detenerJuego() {
    if (this.intervaloJuego) {
      clearInterval(this.intervaloJuego);
    }
    this.detenerEscuchaVoz();
  }

  // 📝 ACTUALIZADO: Registrar actividad al completar
  mostrarFelicitacion() {
    console.log('🎉 ¡MOSTRANDO MODAL DE FELICITACIÓN!');
    
    this.detenerEscuchaVoz();
    if (this.intervaloJuego) {
      clearInterval(this.intervaloJuego);
      this.intervaloJuego = null;
    }
    
    this.faseJuego = 'felicitacion';
    this.mostrarModalFelicitacion = true;
    
    this.cdr.detectChanges();
    
    // 📝 REGISTRAR EN EL HISTORIAL
    this.historialService.registrarJuego('Carrera de Sílabas').subscribe({
      next: () => console.log('✅ Carrera de Sílabas registrada en historial'),
      error: (error: any) => console.error('❌ Error registrando actividad:', error)
    });
    
    console.log('Estado del modal:', this.mostrarModalFelicitacion);
    console.log('Fase del juego:', this.faseJuego);
  }

  continuarJugando() {
    this.mostrarModalFelicitacion = false;
    this.palabrasCorrectas = 0;
    this.faseJuego = 'jugando';
    this.cdr.detectChanges();
    
    this.iniciarEscuchaVoz();
    this.intervaloJuego = setInterval(() => {
      this.actualizarJuego();
    }, 1000 / this.frameRate);
  }

  terminarJuego() {
    this.detenerJuego();
    this.router.navigate(['/juegos-terapeuticos']);
  }

  pausarJuego() {
    if (this.faseJuego === 'jugando') {
      this.faseJuego = 'pausado';
      this.detenerEscuchaVoz();
      if (this.intervaloJuego) {
        clearInterval(this.intervaloJuego);
      }
    }
  }

  reanudarJuego() {
    if (this.faseJuego === 'pausado') {
      this.faseJuego = 'jugando';
      this.iniciarEscuchaVoz();
      this.intervaloJuego = setInterval(() => {
        this.actualizarJuego();
      }, 1000 / this.frameRate);
    }
  }

  reiniciarJuego() {
    this.detenerJuego();
    this.empezarJuego();
  }

  volverAJuegos() {
    this.detenerJuego();
    this.router.navigate(['/juegos-terapeuticos']);
  }

  obtenerEjemplos(silaba: string): string {
    const ejemplos: { [key: string]: string } = {
      'PA': 'pato, papá, pan',
      'PE': 'pelota, perro, pez',
      'PI': 'pila, piña, pico',
      'PO': 'pollo, polo, pomo',
      'PU': 'puerta, puma, pulpo',
      'MA': 'mamá, mano, masa',
      'ME': 'mesa, melón, metro',
      'MI': 'miel, mimo, mira',
      'MO': 'mono, moto, moño',
      'MU': 'muñeca, mula, museo',
      'TA': 'taza, tapa, taco',
      'TE': 'tele, tela, tema',
      'TI': 'tijera, tía, tinta',
      'TO': 'tomate, toro, topo',
      'TU': 'tulipán, tubo, tuna',
      'LA': 'lana, lago, lata',
      'LE': 'león, leche, leer',
      'LI': 'libro, lima, lirio',
      'LO': 'loro, lobo, lomo',
      'LU': 'luna, lupa, luz',
      'SA': 'sapo, sala, salsa',
      'SE': 'semáforo, seis, sello',
      'SI': 'silla, sí, sirena',
      'SO': 'sol, sopa, sofa',
      'SU': 'suma, sur, suelo'
    };
    
    return ejemplos[silaba] || silaba;
  }
  
  formatearDistancia(): string {
    return Math.floor(this.distanciaRecorrida).toString() + 'm';
  }
}