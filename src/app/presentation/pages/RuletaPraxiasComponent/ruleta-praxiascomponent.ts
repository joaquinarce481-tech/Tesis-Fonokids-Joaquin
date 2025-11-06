import { Component, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as faceapi from 'face-api.js';

interface Praxia {
  id: number;
  emoji: string;
  imageName: string;
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

  // Estado de la cámara y detección
  isCameraActive = false;
  isDetecting = false;
  detectionScore = 0;
  isExerciseCorrect = false;
  detectionInterval: any;
  stream: MediaStream | null = null;
  modelsLoaded = false;

  // NUEVO: Control de visualización de marcas faciales
  showFacialLandmarks = true;

  // Control de ejercicio
  exerciseStartTime = 0;
  exerciseProgress = 0;
  requiredDuration = 8000; // 8 segundos para todos los ejercicios (reducido de 10)
  isCompletingExercise = false; // 🔒 PROTECCIÓN: Prevenir múltiples completaciones

  // 🎉 Mensajes motivacionales aleatorios
  motivationalMessages = [
    { main: '¡Continúa así!', sub: 'Sigue practicando todos los días' },
    { main: '¡Excelente trabajo!', sub: 'Cada día mejoras más' },
    { main: '¡Fantástico!', sub: 'Tu esfuerzo vale la pena' },
    { main: '¡Sigue adelante!', sub: 'Estás haciendo un gran progreso' },
    { main: '¡Lo estás logrando!', sub: 'La práctica hace al maestro' },
    { main: '¡Muy bien hecho!', sub: 'Tu dedicación es admirable' }
  ];
  currentMotivation = this.motivationalMessages[0];

  // NUEVO: Sistema de suavizado de detección
  private lastScores: number[] = [];
  private maxScoreHistory = 5; // Promedio de últimos 5 frames

  // 🎯 FASE 1: Sistema de tracking de ejercicios
  exercisesCompletedToday: { [key: string]: number } = {};
  totalExercisesToday: number = 0;
  maxExercisesPerDay: number = 13; // Total: 3+2+4+3+1 = 13 repeticiones
  currentExerciseCount: number = 0; // Contador actual del ejercicio seleccionado

  // Definición de praxias
  praxias: Praxia[] = [
    {
      id: 1,
      emoji: '😗',
      imageName: 'BesoPez.png',
      nombre: 'Beso',
      color: '#FF6B6B',
      instruccion: 'Frunce los labios formando un círculo, como si fueras a dar un beso. Mantén esta posición durante 8 segundos.',
      duracion: '8 segundos',
      repeticiones: 3,
      detectionType: 'kiss'
    },
    {
      id: 2,
      emoji: '😮',
      imageName: 'MejillaDeGlobo.png',
      nombre: 'Inflar Cachetes',
      color: '#4ECDC4',
      instruccion: 'Infla tus mejillas llenándolas de aire, como un globo. Mantén el aire dentro por 8 segundos.',
      duracion: '8 segundos',
      repeticiones: 2,
      detectionType: 'cheeks'
    },
    {
      id: 3,
      emoji: '😛',
      imageName: 'LenguaLateral.png',
      nombre: 'Lengua Afuera',
      color: '#45B7D1',
      instruccion: 'Saca la lengua lo más lejos que puedas hacia afuera. Intenta mantenerla recta durante 8 segundos.',
      duracion: '8 segundos',
      repeticiones: 4,
      detectionType: 'tongue'
    },
    {
      id: 4,
      emoji: '😄',
      imageName: 'SonrisaGrande.png',
      nombre: 'Sonrisa Grande',
      color: '#96CEB4',
      instruccion: 'Sonríe lo más grande que puedas, mostrando todos tus dientes. ¡Mantén esa alegría por 8 segundos!',
      duracion: '8 segundos',
      repeticiones: 3,
      detectionType: 'smile'
    },
    {
      id: 5,
      emoji: '💨',
      imageName: 'Soplar.png',
      nombre: 'Soplar',
      color: '#FF9FF3',
      instruccion: 'Frunce los labios y sopla fuerte, como si estuvieras apagando velas de cumpleaños. Hazlo durante 8 segundos.',
      duracion: '8 segundos',
      repeticiones: 1,
      detectionType: 'blow'
    }
  ];

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  async ngOnInit() {
    console.log('🎮 Iniciando componente Ruleta de Praxias');
    await this.loadFaceApiModels();
    this.loadTodayProgress(); // 🎯 FASE 1: Cargar progreso del día
  }

  ngOnDestroy() {
    console.log('🛑 Destruyendo componente');
    this.stopCamera();
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }
  }

  // 🎯 FASE 1: Cargar progreso del día desde LocalStorage
  loadTodayProgress() {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('praxias_date');
    
    console.log('🔍 DEBUG - Cargando progreso:', {
      hoy: today,
      fechaGuardada: storedDate,
      esNuevoDia: storedDate !== today
    });
    
    // Si es un nuevo día, resetear el progreso
    if (storedDate !== today) {
      console.log('📅 Nuevo día detectado - Reseteando progreso');
      localStorage.setItem('praxias_date', today);
      localStorage.setItem('praxias_progress', JSON.stringify({}));
      this.exercisesCompletedToday = {};
      this.totalExercisesToday = 0;
    } else {
      // Cargar progreso del día actual
      const storedProgress = localStorage.getItem('praxias_progress');
      console.log('🔍 DEBUG - Progreso guardado (string):', storedProgress);
      
      if (storedProgress) {
        this.exercisesCompletedToday = JSON.parse(storedProgress);
        
        console.log('🔍 DEBUG - Progreso parseado:', this.exercisesCompletedToday);
        console.log('🔍 DEBUG - Tipos de valores:', 
          Object.entries(this.exercisesCompletedToday).map(([key, val]) => 
            `${key}: ${val} (${typeof val})`
          )
        );
        
        this.totalExercisesToday = Object.values(this.exercisesCompletedToday)
          .reduce((sum, count) => sum + (Number(count) || 0), 0);
          
        console.log('📊 Progreso cargado:', this.exercisesCompletedToday, 
                    'Total:', this.totalExercisesToday);
      }
    }
  }

  // 🎯 FASE 1: Guardar progreso en LocalStorage
  saveTodayProgress() {
    localStorage.setItem('praxias_progress', JSON.stringify(this.exercisesCompletedToday));
    console.log('💾 Progreso guardado:', this.exercisesCompletedToday);
  }

  // 🎯 FASE 1: Limpiar progreso del día (útil para testing o empezar de nuevo)
  clearTodayProgress() {
    console.log('🗑️ Limpiando progreso del día...');
    localStorage.removeItem('praxias_progress');
    localStorage.removeItem('praxias_date');
    this.exercisesCompletedToday = {};
    this.totalExercisesToday = 0;
    console.log('✅ Progreso limpiado');
  }

  // 🎯 FASE 1: Obtener repeticiones completadas del ejercicio actual
  getCurrentExerciseProgress(): string {
    if (!this.selectedPraxia) return '0/0';
    
    const completed = Number(this.exercisesCompletedToday[this.selectedPraxia.nombre] || 0);
    const total = this.selectedPraxia.repeticiones;
    
    return `${completed}/${total}`;
  }

  // 🎯 FASE 1: Verificar si el ejercicio actual ya está completo
  isCurrentExerciseComplete(): boolean {
    if (!this.selectedPraxia) return false;
    
    const completed = Number(this.exercisesCompletedToday[this.selectedPraxia.nombre] || 0);
    return completed >= this.selectedPraxia.repeticiones;
  }

  // 🎯 FASE 1: Obtener porcentaje de progreso diario
  getDailyProgressPercentage(): number {
    return Math.round((this.totalExercisesToday / this.maxExercisesPerDay) * 100);
  }

  // 🎯 NUEVO: Botón para volver a juegos terapéuticos
  goBackToGames() {
    console.log('🔙 Volviendo a juegos terapéuticos...');
    this.stopCamera();
    this.router.navigate(['/juegos-terapeuticos']);
  }

  /**
   * OPTIMIZADO: Carga los modelos de Face-API más rápido
   */
  async loadFaceApiModels() {
    try {
      console.log('📦 Cargando modelos de IA (optimizado)...');
      
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      
      // Solo cargamos los modelos esenciales para mayor velocidad
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL), // Tiny version para más velocidad
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      
      this.modelsLoaded = true;
      console.log('✅ Modelos de IA cargados SUPER RÁPIDO');
      
    } catch (error) {
      console.error('❌ Error cargando modelos de IA:', error);
      console.warn('⚠️ Se continuará sin detección de IA');
      this.modelsLoaded = false;
    }
  }

  /**
   * NUEVO: Toggle para mostrar/ocultar marcas faciales
   */
  toggleFacialLandmarks() {
    this.showFacialLandmarks = !this.showFacialLandmarks;
    console.log('👁️ Marcas faciales:', this.showFacialLandmarks ? 'VISIBLE' : 'OCULTO');
    
    // Si está oculto, limpiar el canvas
    if (!this.showFacialLandmarks && this.canvasElement) {
      const canvas = this.canvasElement.nativeElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
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
    
    const extraRotation = Math.random() * 360;
    const fullRotations = 1080 + extraRotation;
    const newRotation = this.rotation + fullRotations;
    
    this.rotation = newRotation;
    
    setTimeout(() => {
      const invertedRotation = (360 - (newRotation % 360)) % 360;
      
      let selectedIndex = 0;
      
      if (invertedRotation >= 0 && invertedRotation < 72) {
        selectedIndex = 0;
      } else if (invertedRotation >= 72 && invertedRotation < 144) {
        selectedIndex = 1;
      } else if (invertedRotation >= 144 && invertedRotation < 216) {
        selectedIndex = 2;
      } else if (invertedRotation >= 216 && invertedRotation < 288) {
        selectedIndex = 3;
      } else {
        selectedIndex = 4;
      }
      
      this.selectedPraxia = this.praxias[selectedIndex];
      this.isSpinning = false;
      this.showInstructions = true;
      
      console.log('✅ Praxia seleccionada:', this.selectedPraxia?.nombre);
      
      this.requiredDuration = 10000;
      
      this.cdr.detectChanges();
    }, 3000);
  }

  /**
   * OPTIMIZADO: Inicia la cámara más rápido
   */
  async startCamera() {
    try {
      console.log('🎥 Solicitando acceso a la cámara...');
      
      this.isCameraActive = true;
      this.cdr.detectChanges();
      
      // OPTIMIZACIÓN: Resolución más baja para detección más rápida
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 480 }, // Reducido de 640
          height: { ideal: 360 }, // Reducido de 480
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('✅ Stream de cámara obtenido');
      
      setTimeout(async () => {
        if (!this.videoElement || !this.videoElement.nativeElement) {
          console.error('❌ Elemento de video no encontrado en el DOM');
          return;
        }
        
        const video = this.videoElement.nativeElement;
        video.srcObject = this.stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        
        video.onloadedmetadata = async () => {
          console.log('✅ Metadata de video cargada');
          
          try {
            await video.play();
            console.log('▶️ Video reproduciéndose');
            
            this.cdr.detectChanges();
            
            // OPTIMIZACIÓN: Iniciar detección inmediatamente
            setTimeout(() => {
              this.startDetection();
            }, 100); // Reducido de 500ms a 100ms
            
          } catch (playError) {
            console.error('⚠️ Error al reproducir video:', playError);
            video.play().catch(e => console.error('Error en segundo intento:', e));
            this.startDetection();
          }
        };
        
      }, 50); // Reducido de 100ms a 50ms
      
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
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('🔴 Track detenido:', track.kind);
      });
      this.stream = null;
    }
    
    if (this.videoElement && this.videoElement.nativeElement) {
      const video = this.videoElement.nativeElement;
      video.srcObject = null;
      video.pause();
    }
    
    this.isCameraActive = false;
    this.isDetecting = false;
    this.detectionScore = 0;
    this.exerciseProgress = 0;
    this.lastScores = []; // Resetear historial de suavizado
    
    console.log('✅ Cámara detenida y recursos liberados');
  }

  /**
   * OPTIMIZADO: Inicia el proceso de detección facial más rápido
   */
  startDetection() {
    console.log('🤖 Iniciando sistema de detección OPTIMIZADO...');
    
    if (!this.modelsLoaded) {
      console.warn('⚠️ Modelos NO cargados - usando modo de prueba');
      this.startSimpleTimer();
      return;
    }
    
    console.log('✅ Iniciando detección REAL con IA');
    this.isDetecting = true;
    this.exerciseStartTime = Date.now();
    this.lastScores = []; // Resetear historial para empezar limpio
    
    // OPTIMIZACIÓN: Intervalo más frecuente para respuesta más rápida
    this.detectionInterval = setInterval(async () => {
      await this.detectPraxia();
      
      // AJUSTE MUY PERMISIVO: Umbral reducido a 50%
      if (this.detectionScore > 50) {
        const elapsed = Date.now() - this.exerciseStartTime;
        this.exerciseProgress = Math.min((elapsed / this.requiredDuration) * 100, 100);
        
        if (this.exerciseProgress >= 100) {
          this.completeExercise();
        }
      } else {
        this.exerciseStartTime = Date.now();
        this.exerciseProgress = Math.max(0, this.exerciseProgress - 2);
      }
      
      this.cdr.detectChanges();
    }, 50); // OPTIMIZADO: de 100ms a 50ms para detección más rápida
  }

  /**
   * OPTIMIZADO: Detecta la praxia usando Face-API más rápido
   */
  async detectPraxia() {
    if (!this.videoElement || !this.selectedPraxia) return;

    const video = this.videoElement.nativeElement;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    
    try {
      // OPTIMIZACIÓN: Usar opciones más rápidas
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 224, // Reducido de 416 para más velocidad
          scoreThreshold: 0.4 // Menos estricto para detección más rápida
        }))
        .withFaceLandmarks(true) // Usar tiny landmarks
        .withFaceExpressions();

      if (detections) {
        const rawScore = this.analyzePraxiaType(detections);
        
        // Aplicar suavizado para evitar variaciones bruscas
        this.detectionScore = this.smoothScore(rawScore);
        
        // Solo dibujar si el toggle está activado
        if (this.showFacialLandmarks) {
          this.drawDetectionOverlay(detections);
        }
      } else {
        this.detectionScore = 0;
        this.lastScores = []; // Resetear historial si no hay detección
      }
    } catch (error) {
      console.error('⚠️ Error en detección:', error);
      this.detectionScore = 0;
    }
  }

  /**
   * NUEVO: Suaviza el score usando promedio de últimos frames
   */
  smoothScore(newScore: number): number {
    this.lastScores.push(newScore);
    
    // Mantener solo los últimos N scores
    if (this.lastScores.length > this.maxScoreHistory) {
      this.lastScores.shift();
    }
    
    // Calcular promedio
    const average = this.lastScores.reduce((sum, score) => sum + score, 0) / this.lastScores.length;
    
    return average;
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
        
        console.log('😄 Sonrisa - Happy:', happyScore.toFixed(1),
                    'Neutral:', (expressions.neutral * 100).toFixed(1));
        
        // AJUSTE EQUILIBRADO: Requiere sonrisa visible
        if (happyScore > 40) { // Balance entre 30 y 50
          console.log('✅ Sonrisa detectada - Score:', happyScore.toFixed(1));
          return Math.min(Math.max(happyScore, 75), 100);
        }
        
        console.log('❌ No se detecta sonrisa');
        return 0;
        
      case 'kiss':
        const mouth = landmarks.getMouth();
        const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
        const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
        const jawOutlineKiss = landmarks.getJawOutline();
        const faceWidthKiss = Math.abs(jawOutlineKiss[3].x - jawOutlineKiss[13].x);
        const mouthRatio = mouthHeight / mouthWidth;
        const mouthSizeRatio = mouthWidth / faceWidthKiss;
        
        console.log('😗 Beso - Mouth Ratio:', mouthRatio.toFixed(3), 
                    'Size Ratio:', mouthSizeRatio.toFixed(3),
                    'W:', mouthWidth.toFixed(1), 'H:', mouthHeight.toFixed(1));
        
        // AJUSTE BALANCEADO: Ambas condiciones pero con umbrales medios
        const minMouthRatio = 0.50;  // Boca debe ser más alta que ancha
        const maxMouthSize = 0.42;   // Boca debe ser pequeña respecto a la cara
        
        // AMBAS condiciones deben cumplirse (AND)
        if (mouthRatio > minMouthRatio && mouthSizeRatio < maxMouthSize) {
          // Score base
          const ratioScore = Math.min((mouthRatio - minMouthRatio) * 180, 100);
          const sizeBonus = Math.min((maxMouthSize - mouthSizeRatio) * 220, 100);
          const finalScore = (ratioScore * 0.6) + (sizeBonus * 0.4);
          
          console.log('✅ Beso detectado - Score:', finalScore.toFixed(1),
                      'Ratio:', ratioScore.toFixed(1), 'Size:', sizeBonus.toFixed(1));
          return Math.min(Math.max(finalScore, 70), 100);
        }
        
        console.log('❌ Labios NO fruncidos - Ratio:', mouthRatio.toFixed(3), 
                    '(necesita >' + minMouthRatio + ') Size:', mouthSizeRatio.toFixed(3),
                    '(necesita <' + maxMouthSize + ')');
        return 0;
        
      case 'tongue':
        const mouthPoints = landmarks.getMouth();
        const upperLip = mouthPoints[13].y;
        const lowerLip = mouthPoints[19].y;
        const mouthOpenness = Math.abs(lowerLip - upperLip);
        
        console.log('😛 Lengua - Apertura:', mouthOpenness.toFixed(1));
        
        // AJUSTE EQUILIBRADO: Apertura moderada
        if (mouthOpenness > 13) { // Balance entre 12 y 15
          const score = Math.min(mouthOpenness * 5, 100);
          console.log('✅ Lengua detectada - Score:', score.toFixed(1));
          return score;
        }
        
        console.log('❌ Boca no suficientemente abierta');
        return 0;
        
      case 'cheeks':
        const jawOutline = landmarks.getJawOutline();
        const leftJaw = jawOutline[3];
        const rightJaw = jawOutline[13];
        const faceWidth = Math.abs(rightJaw.x - leftJaw.x);
        const topFace = jawOutline[8];
        const bottomFace = jawOutline[0];
        const faceHeight = Math.abs(bottomFace.y - topFace.y);
        const leftCheek = landmarks.getLeftEye()[0];
        const rightCheek = landmarks.getRightEye()[3];
        const cheekWidth = Math.abs(rightCheek.x - leftCheek.x);
        const faceRatio = faceWidth / faceHeight;
        const cheekRatio = cheekWidth / faceHeight;
        
        // Calcular también el ancho de la zona media de la cara
        const midFace = landmarks.getNose();
        const leftMidPoint = jawOutline[5];
        const rightMidPoint = jawOutline[11];
        const midWidth = Math.abs(rightMidPoint.x - leftMidPoint.x);
        const midRatio = midWidth / faceHeight;
        
        console.log('😮 Cachetes - Face:', faceRatio.toFixed(3), 
                    'Cheek:', cheekRatio.toFixed(3),
                    'Mid:', midRatio.toFixed(3));
        
        // AJUSTE MÁS PERMISIVO: Umbrales más bajos
        const minFaceRatio = 1.03;   // Más bajo (antes 1.04)
        const minCheekRatio = 0.47;  // Más bajo (antes 0.48)
        const minMidRatio = 0.53;    // Más bajo (antes 0.55)
        
        // Contar cuántos indicadores están activos
        let indicators = 0;
        let totalScore = 0;
        
        // Indicador 1: Face Ratio
        if (faceRatio > minFaceRatio) {
          indicators++;
          const faceExcess = (faceRatio - minFaceRatio) / minFaceRatio;
          const faceScore = Math.min(faceExcess * 500, 100);
          totalScore += faceScore;
          console.log('  ✓ Face Ratio OK:', faceScore.toFixed(1));
        } else {
          console.log('  ✗ Face Ratio:', faceRatio.toFixed(3), '(necesita >' + minFaceRatio + ')');
        }
        
        // Indicador 2: Cheek Ratio
        if (cheekRatio > minCheekRatio) {
          indicators++;
          const cheekExcess = (cheekRatio - minCheekRatio) / minCheekRatio;
          const cheekScore = Math.min(cheekExcess * 600, 100);
          totalScore += cheekScore;
          console.log('  ✓ Cheek Ratio OK:', cheekScore.toFixed(1));
        } else {
          console.log('  ✗ Cheek Ratio:', cheekRatio.toFixed(3), '(necesita >' + minCheekRatio + ')');
        }
        
        // Indicador 3: Mid Ratio
        if (midRatio > minMidRatio) {
          indicators++;
          const midExcess = (midRatio - minMidRatio) / minMidRatio;
          const midScore = Math.min(midExcess * 550, 100);
          totalScore += midScore;
          console.log('  ✓ Mid Ratio OK:', midScore.toFixed(1));
        } else {
          console.log('  ✗ Mid Ratio:', midRatio.toFixed(3), '(necesita >' + minMidRatio + ')');
        }
        
        // Necesita 2 de 3 indicadores
        if (indicators >= 2) {
          const finalScore = totalScore / indicators;
          console.log('✅ Cachetes detectados - Score:', finalScore.toFixed(1), 
                      'Indicadores:', indicators + '/3');
          return Math.min(Math.max(finalScore, 70), 100);
        }
        
        console.log('❌ Cachetes NO detectados - Indicadores:', indicators + '/3 (necesita 2)');
        return 0;
        
      case 'blow':
        const blowMouth = landmarks.getMouth();
        const blowWidth = Math.abs(blowMouth[0].x - blowMouth[6].x);
        const blowHeight = Math.abs(blowMouth[3].y - blowMouth[9].y);
        const blowRatio = blowHeight / blowWidth;
        
        console.log('💨 Soplar - Ratio:', blowRatio.toFixed(2), 
                    'W:', blowWidth.toFixed(1), 'H:', blowHeight.toFixed(1),
                    'Sorpresa:', (expressions.surprised * 100).toFixed(1),
                    'Neutral:', (expressions.neutral * 100).toFixed(1),
                    'Feliz:', (expressions.happy * 100).toFixed(1));
        
        // AJUSTE MÁS PERMISIVO: Rango más amplio y expresiones más flexibles
        const isOShape = blowRatio > 0.55 && blowRatio < 1.6; // Rango ampliado
        const hasExpression = expressions.surprised > 0.15 || 
                              expressions.neutral > 0.30 || 
                              expressions.happy > 0.15; // Agregamos happy
        
        console.log('  → O-Shape:', isOShape, 'Expression:', hasExpression);
        
        // Verificar si cumple ambas condiciones
        if (isOShape && hasExpression) {
          // Calcular score
          const ratioScore = Math.min(Math.abs(1.0 - blowRatio) * 70, 100);
          const expressionScore = Math.max(
            expressions.surprised, 
            expressions.neutral,
            expressions.happy
          ) * 100;
          const finalScore = (ratioScore * 0.4) + (expressionScore * 0.6);
          
          console.log('✅ Soplar detectado - Score:', finalScore.toFixed(1),
                      'Ratio:', ratioScore.toFixed(1), 'Expr:', expressionScore.toFixed(1));
          return Math.min(Math.max(finalScore, 70), 100);
        }
        
        // Detección alternativa: Si está muy cerca del ratio ideal
        if (blowRatio > 0.7 && blowRatio < 1.3) {
          const partialScore = 60;
          console.log('⚠️ Soplar parcial detectado - Score:', partialScore);
          return partialScore;
        }
        
        console.log('❌ NO se detecta gesto de soplar - O-Shape:', isOShape, 
                    'Expr:', hasExpression);
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
      this.detectionScore = Math.random() * 60;
      this.exerciseProgress = Math.max(0, this.exerciseProgress - 2);
      this.cdr.detectChanges();
    }, 100);
  }

  /**
   * OPTIMIZADO: Dibuja overlay de detección más rápido
   */
  drawDetectionOverlay(detections: any) {
    if (!this.canvasElement) return;

    const canvas = this.canvasElement.nativeElement;
    const video = this.videoElement.nativeElement;
    
    // Solo actualizar tamaño si cambió
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar detecciones (solo 2 argumentos)
    faceapi.draw.drawDetections(canvas, [detections]);
    faceapi.draw.drawFaceLandmarks(canvas, [detections]);
  }

  /**
   * 🎯 FASE 1: Completa el ejercicio exitosamente y actualiza el tracking
   */
  completeExercise() {
    // 🔒 PROTECCIÓN: Prevenir múltiples llamadas
    if (this.isCompletingExercise) {
      console.log('⚠️ Ya se está completando un ejercicio, ignorando llamada duplicada');
      return;
    }
    
    this.isCompletingExercise = true;
    console.log('🎉 ¡EJERCICIO COMPLETADO CON ÉXITO!');
    
    // 🎉 Elegir mensaje motivacional aleatorio
    const randomIndex = Math.floor(Math.random() * this.motivationalMessages.length);
    this.currentMotivation = this.motivationalMessages[randomIndex];
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    // 🎯 FASE 1: Actualizar contador de ejercicios
    if (this.selectedPraxia) {
      const exerciseName = this.selectedPraxia.nombre;
      const currentCount = Number(this.exercisesCompletedToday[exerciseName] || 0);
      const maxReps = this.selectedPraxia.repeticiones;
      
      console.log('🔍 DEBUG - Antes de incrementar:', {
        ejercicio: exerciseName,
        currentCount: currentCount,
        tipo: typeof currentCount,
        maxReps: maxReps,
        ejerciciosHoy: this.exercisesCompletedToday
      });
      
      // SIEMPRE incrementar (quitamos la restricción de máximo)
      this.exercisesCompletedToday[exerciseName] = currentCount + 1;
      this.totalExercisesToday++;
      this.saveTodayProgress();
      
      console.log('📊 Progreso actualizado:', exerciseName, 
                  this.exercisesCompletedToday[exerciseName] + '/' + maxReps,
                  'Total:', this.totalExercisesToday + '/' + this.maxExercisesPerDay);
      
      console.log('🔍 DEBUG - Después de incrementar:', {
        ejercicio: exerciseName,
        nuevoCount: this.exercisesCompletedToday[exerciseName],
        totalHoy: this.totalExercisesToday,
        todosEjercicios: this.exercisesCompletedToday
      });
    }
    
    this.isExerciseCorrect = true;
    this.isDetecting = false;
    
    this.cdr.detectChanges();
    
    // 🎉 Dar tiempo para que se vean las animaciones y el mensaje motivacional
    setTimeout(() => {
      this.stopCamera();
      this.cdr.detectChanges();
      
      // ⏱️ Duración de 6 segundos para leer el mensaje motivacional
      setTimeout(() => {
        this.resetExercise();
        this.isCompletingExercise = false; // 🔓 Liberar el flag
        this.cdr.detectChanges();
      }, 6000); // Aumentado de 2000ms a 6000ms (6 segundos)
    }, 1000); // Aumentado de 500ms a 1000ms (1 segundo)
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
    this.lastScores = []; // Resetear historial de suavizado
    this.isCompletingExercise = false; // 🔓 Liberar el flag
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