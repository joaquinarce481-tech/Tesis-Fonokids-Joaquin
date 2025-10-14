import { Component, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as faceapi from 'face-api.js';

interface Praxia {
  id: number;
  emoji: string;
  nombre: string;
  color: string;
  instruccion: string;
  duracion: string;
  repeticiones: number;
  detectionType: 'smile' | 'kiss' | 'tongue' | 'cheeks' | 'blow';
}

@Component({
  selector: 'app-ruleta-praxias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ruleta-praxias.component.html',
  styleUrls: ['./ruleta-praxias.component.css']
})
export class RuletaPraxiasComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Estado de la ruleta
  isSpinning = false;
  rotation = 0;
  selectedPraxia: Praxia | null = null;
  showInstructions = false;
  puntos = 0;

  // Estado de la cámara y detección
  isCameraActive = false;
  isDetecting = false;
  detectionScore = 0;
  isExerciseCorrect = false;
  detectionInterval: any;
  stream: MediaStream | null = null;
  modelsLoaded = false;

  // Control de ejercicio
  exerciseStartTime = 0;
  exerciseProgress = 0;
  requiredDuration = 10000; // 10 segundos para todos los ejercicios

  // Definición de praxias
  praxias: Praxia[] = [
    {
      id: 1,
      emoji: '😗',
      nombre: 'Beso',
      color: '#FF6B6B',
      instruccion: 'Frunce los labios formando un círculo, como si fueras a dar un beso. Mantén esta posición durante 10 segundos.',
      duracion: '10 segundos',
      repeticiones: 3,
      detectionType: 'kiss'
    },
    {
      id: 2,
      emoji: '😮',
      nombre: 'Inflar Cachetes',
      color: '#4ECDC4',
      instruccion: 'Infla tus mejillas llenándolas de aire, como un globo. Mantén el aire dentro por 10 segundos.',
      duracion: '10 segundos',
      repeticiones: 2,
      detectionType: 'cheeks'
    },
    {
      id: 3,
      emoji: '😛',
      nombre: 'Lengua Afuera',
      color: '#45B7D1',
      instruccion: 'Saca la lengua lo más lejos que puedas hacia afuera. Intenta mantenerla recta durante 10 segundos.',
      duracion: '10 segundos',
      repeticiones: 4,
      detectionType: 'tongue'
    },
    {
      id: 4,
      emoji: '😄',
      nombre: 'Sonrisa Grande',
      color: '#96CEB4',
      instruccion: 'Sonríe lo más grande que puedas, mostrando todos tus dientes. ¡Mantén esa alegría por 10 segundos!',
      duracion: '10 segundos',
      repeticiones: 3,
      detectionType: 'smile'
    },
    {
      id: 5,
      emoji: '💨',
      nombre: 'Soplar',
      color: '#FF9FF3',
      instruccion: 'Frunce los labios y sopla fuerte, como si estuvieras apagando velas de cumpleaños. Hazlo durante 10 segundos.',
      duracion: '10 segundos',
      repeticiones: 1,
      detectionType: 'blow'
    }
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    console.log('🎮 Iniciando componente Ruleta de Praxias');
    await this.loadFaceApiModels();
  }

  ngOnDestroy() {
    console.log('🛑 Destruyendo componente');
    this.stopCamera();
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }
  }

  /**
   * Carga los modelos de Face-API para detección facial
   */
  async loadFaceApiModels() {
    try {
      console.log('📦 Cargando modelos de IA...');
      
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      
      this.modelsLoaded = true;
      console.log('✅ Modelos de IA cargados exitosamente');
      
    } catch (error) {
      console.error('❌ Error cargando modelos de IA:', error);
      console.warn('⚠️ Se continuará sin detección de IA');
      this.modelsLoaded = false;
    }
  }

  /**
   * Gira la ruleta y selecciona una praxia aleatoria
   */
  spinWheel() {
    if (this.isSpinning) return;
    
    console.log('🎲 Girando ruleta...');
    
    this.isSpinning = true;
    this.showInstructions = false;
    this.selectedPraxia = null;
    this.isExerciseCorrect = false;
    this.stopCamera();
    
    // Cálculo de rotación
    const extraRotation = Math.random() * 360;
    const fullRotations = 1080 + extraRotation; // 3 vueltas completas + extra
    const newRotation = this.rotation + fullRotations;
    
    this.rotation = newRotation;
    
    // Después de 3 segundos, determinar qué praxia cayó
    setTimeout(() => {
      const normalizedRotation = newRotation % 360;
      
      // Mapeo de ángulos a índices de praxias
      // Considerando que la flecha apunta hacia arriba (270°)
      let selectedIndex = 0;
      
      if (normalizedRotation >= 0 && normalizedRotation < 72) {
        selectedIndex = 4; // SOPLAR (288° a 360°/0°)
      } else if (normalizedRotation >= 72 && normalizedRotation < 144) {
        selectedIndex = 0; // BESO (0° a 72°)
      } else if (normalizedRotation >= 144 && normalizedRotation < 216) {
        selectedIndex = 1; // CACHETES (72° a 144°)
      } else if (normalizedRotation >= 216 && normalizedRotation < 288) {
        selectedIndex = 2; // LENGUA (144° a 216°)
      } else {
        selectedIndex = 3; // SONRISA (216° a 288°)
      }
      
      this.selectedPraxia = this.praxias[selectedIndex];
      this.isSpinning = false;
      this.showInstructions = true;
      
      console.log('✅ Praxia seleccionada:', this.selectedPraxia?.nombre);
      console.log('📐 Rotación normalizada:', normalizedRotation.toFixed(1) + '°');
      
      // Todos los ejercicios duran 10 segundos
      this.requiredDuration = 10000;
      
      this.cdr.detectChanges();
    }, 3000);
  }

  /**
   * Inicia la cámara y prepara la detección
   */
  async startCamera() {
    try {
      console.log('🎥 Solicitando acceso a la cámara...');
      
      this.isCameraActive = true;
      this.cdr.detectChanges();
      
      // Solicitar acceso a la cámara
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('✅ Stream de cámara obtenido');
      
      // Pequeño delay para asegurar que el elemento video esté en el DOM
      setTimeout(async () => {
        if (!this.videoElement || !this.videoElement.nativeElement) {
          console.error('❌ Elemento de video no encontrado en el DOM');
          return;
        }
        
        const video = this.videoElement.nativeElement;
        video.srcObject = this.stream;
        
        // Configurar propiedades del video
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        
        // Esperar a que los metadatos se carguen
        video.onloadedmetadata = async () => {
          console.log('✅ Metadata de video cargada:', {
            width: video.videoWidth,
            height: video.videoHeight
          });
          
          try {
            await video.play();
            console.log('▶️ Video reproduciéndose');
            
            this.cdr.detectChanges();
            
            // Iniciar detección después de un pequeño delay
            setTimeout(() => {
              this.startDetection();
            }, 500);
            
          } catch (playError) {
            console.error('⚠️ Error al reproducir video:', playError);
            // Intentar reproducir de todas formas
            video.play().catch(e => console.error('Error en segundo intento:', e));
            this.startDetection();
          }
        };
        
        // Verificación de respaldo
        setTimeout(() => {
          if (video.videoWidth > 0) {
            console.log('✅ Video funcionando correctamente');
          } else {
            console.warn('⚠️ Video puede no estar funcionando correctamente');
          }
        }, 2000);
        
      }, 100);
      
    } catch (error) {
      console.error('❌ Error al acceder a la cámara:', error);
      this.isCameraActive = false;
      this.cdr.detectChanges();
      
      let errorMessage = 'No se pudo acceder a la cámara.';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Debes permitir el acceso a la cámara para continuar.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No se encontró ninguna cámara en tu dispositivo.';
        }
      }
      
      alert(errorMessage);
    }
  }

  /**
   * Detiene la cámara y limpia los recursos
   */
  stopCamera() {
    console.log('🛑 Deteniendo cámara...');
    
    // Limpiar intervalo de detección
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    // Detener stream de video
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('🔴 Track detenido:', track.kind);
      });
      this.stream = null;
    }
    
    // Limpiar elemento de video
    if (this.videoElement && this.videoElement.nativeElement) {
      const video = this.videoElement.nativeElement;
      video.srcObject = null;
      video.pause();
    }
    
    // Resetear estados
    this.isCameraActive = false;
    this.isDetecting = false;
    this.detectionScore = 0;
    this.exerciseProgress = 0;
    
    console.log('✅ Cámara detenida y recursos liberados');
  }

  /**
   * Inicia el proceso de detección facial
   */
  startDetection() {
    console.log('🤖 Iniciando sistema de detección...');
    console.log('📊 Modelos cargados:', this.modelsLoaded);
    
    if (!this.modelsLoaded) {
      console.warn('⚠️ Modelos NO cargados - usando modo de prueba');
      this.startSimpleTimer();
      return;
    }
    
    console.log('✅ Iniciando detección REAL con IA');
    this.isDetecting = true;
    this.exerciseStartTime = Date.now();
    
    // Iniciar loop de detección
    this.detectionInterval = setInterval(async () => {
      await this.detectPraxia();
      
      // Actualizar progreso si la detección es buena
      if (this.detectionScore > 70) {
        const elapsed = Date.now() - this.exerciseStartTime;
        this.exerciseProgress = Math.min((elapsed / this.requiredDuration) * 100, 100);
        
        // Completar ejercicio si se alcanza el 100%
        if (this.exerciseProgress >= 100) {
          this.completeExercise();
        }
      } else {
        // Reiniciar timer si la detección es mala
        this.exerciseStartTime = Date.now();
        this.exerciseProgress = Math.max(0, this.exerciseProgress - 2);
      }
      
      this.cdr.detectChanges();
    }, 100); // Detección cada 100ms
  }

  /**
   * Detecta la praxia usando Face-API
   */
  async detectPraxia() {
    if (!this.videoElement || !this.selectedPraxia) return;

    const video = this.videoElement.nativeElement;
    
    // Verificar que el video esté listo
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    
    try {
      // Realizar detección facial
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (detections) {
        // Analizar el tipo de praxia
        const score = this.analyzePraxiaType(detections);
        this.detectionScore = score;
        
        // Dibujar overlay de detección
        this.drawDetectionOverlay(detections);
      } else {
        this.detectionScore = 0;
      }
    } catch (error) {
      console.error('⚠️ Error en detección:', error);
      this.detectionScore = 0;
    }
  }

  /**
   * Analiza el tipo específico de praxia basado en landmarks faciales
   */
  analyzePraxiaType(detections: any): number {
    if (!this.selectedPraxia) return 0;

    const expressions = detections.expressions;
    const landmarks = detections.landmarks;

    switch (this.selectedPraxia.detectionType) {
      case 'smile':
        // Detectar sonrisa usando expresión de felicidad
        const happyScore = expressions.happy * 100;
        console.log('😄 Sonrisa - Score:', happyScore.toFixed(1));
        return happyScore;
        
      case 'kiss':
        // Detectar beso usando PROPORCIONES de la boca
        const mouth = landmarks.getMouth();
        
        // Medir dimensiones de la boca
        const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);   // Ancho total
        const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);  // Alto total
        
        // Medir también el ancho de la cara para normalizar
        const jawOutlineKiss = landmarks.getJawOutline();
        const faceWidthKiss = Math.abs(jawOutlineKiss[3].x - jawOutlineKiss[13].x);
        
        // CALCULAR RATIOS para hacer independiente de distancia
        const mouthRatio = mouthHeight / mouthWidth;  // Alto vs ancho de boca
        const mouthSizeRatio = mouthWidth / faceWidthKiss; // Tamaño de boca vs cara
        
        console.log('😗 Beso - Mouth Ratio:', mouthRatio.toFixed(3), 
                    'Size Ratio:', mouthSizeRatio.toFixed(3),
                    'W:', mouthWidth.toFixed(1), 'H:', mouthHeight.toFixed(1));
        
        // Para un beso:
        // - La boca debe ser más ALTA que ANCHA (fruncida)
        // - La boca debe ser relativamente pequeña (pero no demasiado restrictivo)
        const minMouthRatio = 0.65;      // Boca debe estar bien fruncida (subido de 0.55)
        const maxMouthSize = 0.35;       // Boca puede ser hasta 35% del ancho facial (aumentado de 0.22)
        
        if (mouthRatio > minMouthRatio && mouthSizeRatio < maxMouthSize) {
          // Calcular score basado en qué tan fruncida está la boca
          const ratioScore = Math.min((mouthRatio - minMouthRatio) * 250, 100);
          
          // Bonus por tener boca en tamaño razonable
          const sizeBonus = Math.min((maxMouthSize - mouthSizeRatio) * 300, 100);
          
          // Dar más peso al ratio (lo más importante es que esté fruncida)
          const finalScore = (ratioScore * 0.7) + (sizeBonus * 0.3);
          
          console.log('✅ Beso detectado - Score:', finalScore.toFixed(1),
                      'Ratio:', ratioScore.toFixed(1), 'Size:', sizeBonus.toFixed(1));
          return Math.min(finalScore, 100);
        }
        
        console.log('❌ Labios NO suficientemente fruncidos para beso');
        return 0;
        
      case 'tongue':
        // Detectar lengua afuera midiendo apertura de boca
        const mouthPoints = landmarks.getMouth();
        const upperLip = mouthPoints[13].y;
        const lowerLip = mouthPoints[19].y;
        const mouthOpenness = Math.abs(lowerLip - upperLip);
        
        console.log('😛 Lengua - Apertura:', mouthOpenness.toFixed(1));
        
        if (mouthOpenness > 15) {
          return Math.min(mouthOpenness * 4, 100);
        }
        return 0;
        
      case 'cheeks':
        // Detectar cachetes inflados usando PROPORCIONES en vez de valores absolutos
        const jawOutline = landmarks.getJawOutline();
        const leftJaw = jawOutline[3];
        const rightJaw = jawOutline[13];
        const faceWidth = Math.abs(rightJaw.x - leftJaw.x);
        
        // Medir también la altura total de la cara como referencia
        const topFace = jawOutline[8]; // Punto superior de la mandíbula
        const bottomFace = jawOutline[0]; // Punto inferior
        const faceHeight = Math.abs(bottomFace.y - topFace.y);
        
        // Medir ancho de mejillas
        const leftCheek = landmarks.getLeftEye()[0];
        const rightCheek = landmarks.getRightEye()[3];
        const cheekWidth = Math.abs(rightCheek.x - leftCheek.x);
        
        // CALCULAR RATIOS EN VEZ DE VALORES ABSOLUTOS
        // Esto hace que sea independiente de la distancia a la cámara
        const faceRatio = faceWidth / faceHeight; // Cuán ancha es la cara vs altura
        const cheekRatio = cheekWidth / faceHeight; // Cuán anchas son mejillas vs altura
        
        console.log('😮 Cachetes - Face Ratio:', faceRatio.toFixed(3), 
                    'Cheek Ratio:', cheekRatio.toFixed(3),
                    'Face W:', faceWidth.toFixed(1), 'H:', faceHeight.toFixed(1));
        
        // UMBRALES BASADOS EN RATIOS (estos son más estables)
        // Ratio normal de cara: ~1.0-1.1
        // Ratio con cachetes inflados: ~1.15-1.25
        const minFaceRatio = 1.12;   // Cara debe ser 12% más ancha que alta
        const minCheekRatio = 0.55;  // Mejillas deben ser 55% del alto de la cara
        
        if (faceRatio > minFaceRatio && cheekRatio > minCheekRatio) {
          // Calcular score basado en cuánto excede los ratios mínimos
          const faceExcess = (faceRatio - minFaceRatio) / minFaceRatio;
          const cheekExcess = (cheekRatio - minCheekRatio) / minCheekRatio;
          
          // Convertir a porcentaje
          const faceScore = Math.min(faceExcess * 400, 100);
          const cheekScore = Math.min(cheekExcess * 500, 100);
          
          // Promedio
          const finalScore = (faceScore + cheekScore) / 2;
          
          console.log('✅ Cachetes detectados - Score:', finalScore.toFixed(1), 
                      'Face:', faceScore.toFixed(1), 'Cheek:', cheekScore.toFixed(1));
          return Math.min(finalScore, 100);
        }
        
        console.log('❌ Cachetes NO suficientemente inflados');
        return 0;
        
      case 'blow':
        // Detectar soplido
        const blowMouth = landmarks.getMouth();
        const blowWidth = Math.abs(blowMouth[0].x - blowMouth[6].x);
        const blowHeight = Math.abs(blowMouth[3].y - blowMouth[9].y);
        const blowRatio = blowHeight / blowWidth;
        
        console.log('💨 Soplar - Ratio:', blowRatio.toFixed(2), 
                    'Sorpresa:', (expressions.surprised * 100).toFixed(1));
        
        // Soplar tiene boca pequeña y expresión de sorpresa
        if (blowRatio > 0.6 && blowRatio < 1.4 && expressions.surprised > 0.3) {
          return expressions.surprised * 100;
        }
        return 0;
        
      default:
        return 0;
    }
  }

  /**
   * Modo de prueba sin IA (temporizador aleatorio)
   */
  startSimpleTimer() {
    console.log('⏱️ MODO PRUEBA - Temporizador simulado');
    
    this.isDetecting = true;
    this.exerciseStartTime = Date.now();
    
    this.detectionInterval = setInterval(() => {
      // Generar scores aleatorios bajos para simular
      this.detectionScore = Math.random() * 60;
      this.exerciseProgress = Math.max(0, this.exerciseProgress - 2);
      this.cdr.detectChanges();
    }, 100);
  }

  /**
   * Dibuja overlay de detección en el canvas
   */
  drawDetectionOverlay(detections: any) {
    if (!this.canvasElement) return;

    const canvas = this.canvasElement.nativeElement;
    const video = this.videoElement.nativeElement;
    
    // Ajustar tamaño del canvas al video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar detecciones
    faceapi.draw.drawDetections(canvas, [detections]);
    faceapi.draw.drawFaceLandmarks(canvas, [detections]);
  }

  /**
   * Completa el ejercicio exitosamente
   */
  completeExercise() {
    console.log('🎉 ¡EJERCICIO COMPLETADO CON ÉXITO!');
    
    // Detener detección inmediatamente
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    // Actualizar estado
    this.isExerciseCorrect = true;
    this.isDetecting = false; // Añadido para evitar actualizaciones
    this.puntos += 20;
    
    console.log('⭐ Puntos totales:', this.puntos);
    
    // Forzar detección de cambios para evitar errores
    this.cdr.detectChanges();
    
    // Detener cámara después de mostrar celebración
    setTimeout(() => {
      this.stopCamera();
      this.cdr.detectChanges();
      
      // Resetear después de 2 segundos
      setTimeout(() => {
        this.resetExercise();
        this.cdr.detectChanges();
      }, 2000);
    }, 500);
  }

  /**
   * Resetea el estado del ejercicio actual
   */
  resetExercise() {
    console.log('🔄 Reseteando ejercicio...');
    this.selectedPraxia = null;
    this.showInstructions = false;
    this.isExerciseCorrect = false;
    this.exerciseProgress = 0;
    this.detectionScore = 0;
  }

  /**
   * Resetea toda la ruleta
   */
  resetRuleta() {
    console.log('🔄 Reseteando ruleta completa...');
    this.rotation = 0;
    this.resetExercise();
    this.stopCamera();
  }

  /**
   * Obtiene posición left del confeti
   */
  getConfettiLeft(index: number): number {
    return (index * 10) + (Math.random() * 10);
  }

  /**
   * Obtiene delay de animación del confeti
   */
  getConfettiDelay(index: number): number {
    return (index * 0.15) % 2;
  }

  /**
   * Getter para acceder a Math en el template
   */
  get Math() {
    return Math;
  }
}