import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HistorialActividadesService } from '../../services/historial-actividades.service';

interface Obstaculo {
  id: string;
  silaba: string;
  posicionX: number;
  superado: boolean;
  activo: boolean;
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
  
  // Sílabas disponibles - TODAS las sílabas
  silabasDisponibles: string[] = [
    'PA', 'PE', 'PI', 'PO', 'PU', 
    'MA', 'ME', 'MI', 'MO', 'MU', 
    'TA', 'TE', 'TI', 'TO', 'TU', 
    'LA', 'LE', 'LI', 'LO', 'LU', 
    'SA', 'SE', 'SI', 'SO', 'SU'
  ];
  
  // Para mostrar en instrucciones (solo algunas)
  silabasParaMostrar: string[] = ['PA', 'MA', 'TA', 'LA', 'SA', 'PE', 'ME', 'TE'];
  
  // SISTEMA ANTI-REPETICIÓN: Cola de sílabas mezcladas
  colaSilabas: string[] = [];
  silabasUsadas: string[] = [];
  
  // Partículas de efectos
  particulas: Particula[] = [];
  
  // Puntuación y progreso
  obstaculosSuperados: number = 0;
  palabrasCorrectas: number = 0;
  
  // Reconocimiento de voz
  recognition: any = null;
  escuchandoVoz: boolean = false;
  ultimaPalabraDetectada: string = '';
  feedbackTipo: 'correcto' | 'incorrecto' | '' = ''; // NUEVO para estilo visual
  
  // Control del juego
  intervaloJuego: any;
  frameRate: number = 60;
  
  // Animaciones
  animacionPersonaje: string = 'corriendo';
  
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private historialService: HistorialActividadesService
  ) {}

  ngOnInit() {
    // Scroll al inicio
    window.scrollTo(0, 0);
    this.inicializarReconocimientoVoz();
    this.inicializarColaSilabas();
    
    // Verificar si viene de "Seguir Jugando" para saltar instrucciones
    const saltarInstrucciones = sessionStorage.getItem('carrera_continuar');
    if (saltarInstrucciones === 'true') {
      sessionStorage.removeItem('carrera_continuar');
      // Iniciar juego directamente
      setTimeout(() => {
        this.empezarJuego();
      }, 100);
    }
  }

  ngOnDestroy() {
    this.detenerJuego();
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // NUEVO: Inicializar cola de sílabas mezcladas
  inicializarColaSilabas(): void {
    this.colaSilabas = this.mezclarArray([...this.silabasDisponibles]);
    this.silabasUsadas = [];
    console.log('Cola de sílabas inicializada:', this.colaSilabas);
  }

  // NUEVO: Obtener siguiente sílaba sin repetir
  obtenerSiguienteSilaba(): string {
    // Si la cola está vacía, regenerarla
    if (this.colaSilabas.length === 0) {
      this.colaSilabas = this.mezclarArray([...this.silabasDisponibles]);
      this.silabasUsadas = [];
      console.log('Cola regenerada:', this.colaSilabas);
    }
    
    // Sacar la primera sílaba de la cola
    const silaba = this.colaSilabas.shift()!;
    this.silabasUsadas.push(silaba);
    
    console.log(`Sílaba seleccionada: ${silaba} | Restantes: ${this.colaSilabas.length}`);
    
    return silaba;
  }

  // NUEVO: Mezclar array (algoritmo Fisher-Yates)
  mezclarArray(array: string[]): string[] {
    const resultado = [...array];
    for (let i = resultado.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
    }
    return resultado;
  }

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

      console.log('Reconocimiento de voz inicializado');
    } else {
      console.warn('Reconocimiento de voz no disponible');
    }
  }

  procesarPalabraDetectada(palabra: string) {
    if (this.faseJuego !== 'jugando') return;

    const palabraNormalizada = this.normalizarTexto(palabra);
    
    console.log(`Detectado: "${palabra}" → Normalizado: "${palabraNormalizada}"`);

    const obstaculoProximo = this.obstaculos.find(obs => 
      !obs.superado && 
      obs.activo && 
      obs.posicionX > 100 &&
      obs.posicionX < 700
    );

    if (!obstaculoProximo) {
      console.log('No hay obstáculos próximos');
      return;
    }

    const silabaNormalizada = this.normalizarTexto(obstaculoProximo.silaba);
    
    if (this.contieneSilaba(palabraNormalizada, silabaNormalizada)) {
      obstaculoProximo.superado = true;
      this.saltar();
      this.palabrasCorrectas++;
      this.obstaculosSuperados++;
      this.ultimaPalabraDetectada = `${obstaculoProximo.silaba} ✓`;
      this.feedbackTipo = 'correcto';
      this.reproducirSonidoAcierto(); // Agregar sonido
      this.crearParticulas(obstaculoProximo.posicionX, this.suelo, '#10b981');
      console.log(`CORRECTO! Palabra: "${palabra}" contiene sílaba: "${obstaculoProximo.silaba}"`);
      
      // Limpiar feedback después de 1.5 segundos
      setTimeout(() => {
        this.feedbackTipo = '';
        this.ultimaPalabraDetectada = '';
      }, 1500);
      
      if (this.palabrasCorrectas >= this.metaParaFelicitacion) {
        console.log('META ALCANZADA! Mostrando felicitación...');
        this.mostrarFelicitacion();
      }
    } else {
      this.ultimaPalabraDetectada = `${palabra.substring(0, 10)} ✗`;
      this.feedbackTipo = 'incorrecto';
      console.log(`Esperaba: "${obstaculoProximo.silaba}" pero detectó: "${palabra}"`);
      
      // Limpiar feedback después de 1.5 segundos
      setTimeout(() => {
        this.feedbackTipo = '';
        this.ultimaPalabraDetectada = '';
      }, 1500);
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
    if (!this.recognition) {
      console.log('Recognition no disponible');
      return;
    }
    
    // Si ya está escuchando, no hacer nada
    if (this.escuchandoVoz) {
      console.log('Ya está escuchando');
      return;
    }
    
    try {
      // Primero intentar detener por si acaso
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignorar
      }
      
      // Esperar un poco y luego iniciar
      setTimeout(() => {
        try {
          this.recognition.start();
          this.escuchandoVoz = true;
          console.log('Escuchando voz...');
        } catch (e) {
          console.log('Error al iniciar recognition:', e);
          this.escuchandoVoz = false;
        }
      }, 100);
    } catch (e) {
      console.log('Error en iniciarEscuchaVoz:', e);
      this.escuchandoVoz = false;
    }
  }

  detenerEscuchaVoz() {
    if (this.recognition && this.escuchandoVoz) {
      this.recognition.stop();
      this.escuchandoVoz = false;
      console.log('Voz detenida');
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
    this.inicializarColaSilabas(); // Reiniciar cola al empezar
    this.iniciarEscuchaVoz();
    
    this.intervaloJuego = setInterval(() => {
      this.actualizarJuego();
    }, 1000 / this.frameRate);
    
    console.log('Carrera iniciada!');
  }

  reiniciarEstadisticas() {
    this.obstaculosSuperados = 0;
    this.palabrasCorrectas = 0;
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
      console.log('Salto!');
    }
  }

  actualizarObstaculos() {
    this.obstaculos = this.obstaculos.filter(obs => {
      obs.posicionX -= this.velocidadJuego;
      return obs.posicionX > -100;
    });
  }

  // MODIFICADO: Usar el sistema anti-repetición
  generarObstaculos() {
    const anchoVentana = 800;
    
    if (this.obstaculos.length === 0 || 
        (anchoVentana - this.ultimaPosicionObstaculo) > this.distanciaEntreObstaculos) {
      
      // Usar el nuevo sistema de cola
      const silabaAleatoria = this.obtenerSiguienteSilaba();
      
      const nuevoObstaculo: Obstaculo = {
        id: `obs-${Date.now()}-${Math.random()}`,
        silaba: silabaAleatoria,
        posicionX: anchoVentana + 50,
        superado: false,
        activo: true
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
    this.reproducirSonidoColision(); // Agregar sonido
    console.log(`Choque con ${obstaculo.silaba}`);
  }

  obstaculoSuperado(obstaculo: Obstaculo) {
    this.obstaculosSuperados++;
    this.palabrasCorrectas++;
    this.crearParticulas(obstaculo.posicionX, this.suelo, '#10b981');
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
    // Reducir cantidad de partículas para mejor rendimiento
    for (let i = 0; i < 6; i++) {
      this.particulas.push({
        id: `part-${Date.now()}-${i}`,
        x,
        y,
        velocidadX: (Math.random() - 0.5) * 6,
        velocidadY: (Math.random() - 0.5) * 6 - 4,
        vida: 25,
        color
      });
    }
  }

  crearExplosion(x: number, y: number) {
    this.crearParticulas(x, y, '#ef4444');
  }

  // Métodos de sonido
  reproducirSonidoSalto() {}
  
  reproducirSonidoAcierto() {
    this.hablar('Bien');
  }
  
  reproducirSonidoColision() {
    this.hablar('Intenta de nuevo');
  }

  private hablar(texto: string) {
    if ('speechSynthesis' in window) {
      // Cancelar cualquier habla previa para evitar lag
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.rate = 1.1;
      utterance.pitch = 1.2;
      utterance.volume = 0.5;
      
      // Usar timeout para no bloquear el juego
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 10);
    }
  }

  detenerJuego() {
    if (this.intervaloJuego) {
      clearInterval(this.intervaloJuego);
      this.intervaloJuego = null;
    }
    this.detenerEscuchaVoz();
  }

  mostrarFelicitacion() {
    console.log('=== MOSTRANDO MODAL DE FELICITACIÓN ===');
    
    // 1. Detener el loop del juego
    if (this.intervaloJuego) {
      clearInterval(this.intervaloJuego);
      this.intervaloJuego = null;
    }
    
    // 2. Detener reconocimiento de voz completamente
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.log('Error deteniendo recognition:', e);
      }
    }
    this.escuchandoVoz = false;
    
    // 3. Cambiar estado
    this.faseJuego = 'felicitacion';
    this.mostrarModalFelicitacion = true;
    
    // 4. Forzar detección de cambios
    this.cdr.detectChanges();
    
    // 5. Registrar en el historial
    this.historialService.registrarJuego('Carrera de Sílabas').subscribe({
      next: () => console.log('Carrera de Sílabas registrada en historial'),
      error: (error: any) => console.error('Error registrando actividad:', error)
    });
    
    console.log('Modal mostrado correctamente');
  }

  continuarJugando() {
    // Guardar flag para saltar instrucciones al recargar
    sessionStorage.setItem('carrera_continuar', 'true');
    
    // Limpiar todo y recargar la página
    this.limpiarTodo();
    window.location.reload();
  }

  // FIX: Forzar recarga completa al terminar para evitar bugs
  terminarJuego() {
    this.limpiarTodo();
    window.location.href = '/juegos-terapeuticos';
  }

  pausarJuego() {
    if (this.faseJuego === 'jugando') {
      this.faseJuego = 'pausado';
      this.detenerEscuchaVoz();
      if (this.intervaloJuego) {
        clearInterval(this.intervaloJuego);
        this.intervaloJuego = null;
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
    this.limpiarTodo();
    this.empezarJuego();
  }

  // FIX: Forzar recarga completa al volver para evitar bugs
  volverAJuegos() {
    this.limpiarTodo();
    window.location.href = '/juegos-terapeuticos';
  }

  // Método para limpiar todo correctamente y evitar memory leaks
  private limpiarTodo() {
    // Detener intervalo del juego
    if (this.intervaloJuego) {
      clearInterval(this.intervaloJuego);
      this.intervaloJuego = null;
    }
    
    // Detener reconocimiento de voz completamente
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignorar errores
      }
    }
    this.escuchandoVoz = false;
    
    // Limpiar estado visual
    this.mostrarModalFelicitacion = false;
    this.obstaculos = [];
    this.particulas = [];
    this.feedbackTipo = '';
    this.ultimaPalabraDetectada = '';
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
}