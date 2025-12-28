import { Component, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HistorialActividadesService } from '../../services/historial-actividades.service';
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
  detectionInterval: any = null;
  stream: MediaStream | null = null;
  modelsLoaded = false;

  // Control de visualización de marcas faciales
  showFacialLandmarks = false;

  // Control de ejercicio
  exerciseStartTime = 0;
  exerciseProgress = 0;
  requiredDuration = 8000;
  isCompletingExercise = false;

  // Mensajes motivacionales aleatorios
  motivationalMessages = [
    { main: '¡Continúa así!', sub: 'Sigue practicando todos los días' },
    { main: '¡Excelente trabajo!', sub: 'Cada día mejoras más' },
    { main: '¡Fantástico!', sub: 'Tu esfuerzo vale la pena' },
    { main: '¡Sigue adelante!', sub: 'Estás haciendo un gran progreso' },
    { main: '¡Lo estás logrando!', sub: 'La práctica hace al maestro' },
    { main: '¡Muy bien hecho!', sub: 'Tu dedicación es admirable' }
  ];
  currentMotivation = this.motivationalMessages[0];

  // Sistema de suavizado de detección
  private lastScores: number[] = [];
  private maxScoreHistory = 5;

  // CALIBRACIÓN: Valores base de la cara en reposo
  private baselineMouthRatio: number = 0;
  private baselineFaceRatio: number = 0;
  private baselineMidRatio: number = 0;
  private baselineBlowRatio: number = 0;
  private baselineMouthSize: number = 0;
  private calibrationFrames: number = 0;
  isCalibrated: boolean = false;
  private readonly CALIBRATION_FRAMES_NEEDED = 15;

  // Sistema de tracking de ejercicios
  exercisesCompletedToday: { [key: string]: number } = {};
  totalExercisesToday: number = 0;
  maxExercisesPerDay: number = 13;
  currentExerciseCount: number = 0;

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
    private ngZone: NgZone,
    private router: Router,
    private historialService: HistorialActividadesService
  ) {}

  async ngOnInit() {
    console.log('🎮 Iniciando componente Ruleta de Praxias');
    await this.loadFaceApiModels();
    this.loadTodayProgress();
  }

  ngOnDestroy() {
    console.log('🛑 Destruyendo componente');
    this.stopCamera();
    this.clearDetectionInterval();
  }

  private clearDetectionInterval() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  loadTodayProgress() {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('praxias_date');
    
    if (storedDate !== today) {
      console.log('📅 Nuevo día detectado - Reseteando progreso');
      localStorage.setItem('praxias_date', today);
      localStorage.setItem('praxias_progress', JSON.stringify({}));
      this.exercisesCompletedToday = {};
      this.totalExercisesToday = 0;
    } else {
      const storedProgress = localStorage.getItem('praxias_progress');
      if (storedProgress) {
        this.exercisesCompletedToday = JSON.parse(storedProgress);
        this.totalExercisesToday = Object.values(this.exercisesCompletedToday)
          .reduce((sum, count) => sum + (Number(count) || 0), 0);
        console.log('📊 Progreso cargado:', this.exercisesCompletedToday);
      }
    }
  }

  saveTodayProgress() {
    localStorage.setItem('praxias_progress', JSON.stringify(this.exercisesCompletedToday));
    console.log('💾 Progreso guardado:', this.exercisesCompletedToday);
  }

  clearTodayProgress() {
    console.log('🗑️ Limpiando progreso del día...');
    localStorage.removeItem('praxias_progress');
    localStorage.removeItem('praxias_date');
    this.exercisesCompletedToday = {};
    this.totalExercisesToday = 0;
  }

  getCurrentExerciseProgress(): string {
    if (!this.selectedPraxia) return '0/0';
    const completed = Number(this.exercisesCompletedToday[this.selectedPraxia.nombre] || 0);
    const total = this.selectedPraxia.repeticiones;
    return `${completed}/${total}`;
  }

  isCurrentExerciseComplete(): boolean {
    if (!this.selectedPraxia) return false;
    const completed = Number(this.exercisesCompletedToday[this.selectedPraxia.nombre] || 0);
    return completed >= this.selectedPraxia.repeticiones;
  }

  getDailyProgressPercentage(): number {
    return Math.round((this.totalExercisesToday / this.maxExercisesPerDay) * 100);
  }

  goBackToGames() {
    console.log('🔙 Volviendo a juegos terapéuticos...');
    this.stopCamera();
    this.router.navigate(['/juegos-terapeuticos']);
  }

  async loadFaceApiModels() {
    try {
      console.log('📦 Cargando modelos de IA...');
      
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      
      this.modelsLoaded = true;
      console.log('✅ Modelos cargados correctamente');
      
    } catch (error) {
      console.error('❌ Error cargando modelos de IA:', error);
      this.modelsLoaded = false;
    }
  }

  toggleFacialLandmarks() {
    this.showFacialLandmarks = !this.showFacialLandmarks;
    console.log('👁️ Marcas faciales:', this.showFacialLandmarks ? 'VISIBLE' : 'OCULTO');
    
    if (!this.showFacialLandmarks && this.canvasElement) {
      const canvas = this.canvasElement.nativeElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

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
    
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
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
          this.requiredDuration = 8000;
          
          console.log('✅ Praxia seleccionada:', this.selectedPraxia?.nombre);
          this.cdr.detectChanges();
        });
      }, 3000);
    });
  }

  async startCamera() {
    try {
      console.log('🎥 Iniciando cámara...');
      
      this.resetCalibration();
      
      this.isCameraActive = true;
      this.cdr.detectChanges();
      
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 480 },
          height: { ideal: 360 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('✅ Stream obtenido');
      
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.ngZone.run(() => {
            if (!this.videoElement || !this.videoElement.nativeElement) {
              console.error('❌ Elemento de video no encontrado');
              return;
            }
            
            const video = this.videoElement.nativeElement;
            video.srcObject = this.stream;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            
            video.onloadedmetadata = async () => {
              console.log('✅ Video listo');
              
              try {
                await video.play();
                console.log('▶️ Video reproduciéndose');
                this.cdr.detectChanges();
                
                this.ngZone.runOutsideAngular(() => {
                  setTimeout(() => {
                    this.ngZone.run(() => {
                      this.startDetection();
                    });
                  }, 100);
                });
                
              } catch (playError) {
                console.error('⚠️ Error al reproducir video:', playError);
                video.play().catch(e => console.error('Error en segundo intento:', e));
                this.startDetection();
              }
            };
          });
        }, 50);
      });
      
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

  private resetCalibration() {
    this.baselineMouthRatio = 0;
    this.baselineFaceRatio = 0;
    this.baselineMidRatio = 0;
    this.baselineBlowRatio = 0;
    this.baselineMouthSize = 0;
    this.calibrationFrames = 0;
    this.isCalibrated = false;
    console.log('🔧 Calibración reseteada');
  }

  stopCamera() {
    console.log('🛑 Deteniendo cámara...');
    
    this.clearDetectionInterval();
    
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
    this.lastScores = [];
    
    console.log('✅ Cámara detenida');
  }

  startDetection() {
    console.log('🤖 Iniciando sistema de detección...');
    
    if (!this.modelsLoaded) {
      console.warn('⚠️ Modelos NO cargados - modo de prueba');
      this.startSimpleTimer();
      return;
    }
    
    console.log('✅ Detección REAL activada - Calibrando cara en reposo...');
    this.isDetecting = true;
    this.exerciseStartTime = Date.now();
    this.lastScores = [];
    this.isCompletingExercise = false;
    
    this.ngZone.runOutsideAngular(() => {
      this.detectionInterval = setInterval(() => {
        if (this.isCompletingExercise || !this.isDetecting) {
          return;
        }
        
        this.detectPraxia().then(() => {
          this.ngZone.run(() => {
            if (!this.isCalibrated) {
              this.detectionScore = 0;
              this.cdr.detectChanges();
              return;
            }
            
            if (this.detectionScore > 60) {
              const elapsed = Date.now() - this.exerciseStartTime;
              this.exerciseProgress = Math.min((elapsed / this.requiredDuration) * 100, 100);
              
              if (this.exerciseProgress >= 100 && !this.isCompletingExercise) {
                this.completeExercise();
              }
            } else {
              this.exerciseStartTime = Date.now();
              this.exerciseProgress = Math.max(0, this.exerciseProgress - 5);
            }
            
            this.cdr.detectChanges();
          });
        });
      }, 50);
    });
  }

  async detectPraxia() {
    if (!this.videoElement || !this.selectedPraxia || this.isCompletingExercise) return;

    const video = this.videoElement.nativeElement;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    
    try {
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.4
        }))
        .withFaceLandmarks(true)
        .withFaceExpressions();

      if (detections) {
        if (!this.isCalibrated) {
          this.calibrateFace(detections);
          return;
        }
        
        const rawScore = this.analyzePraxiaType(detections);
        this.detectionScore = this.smoothScore(rawScore);
        
        if (this.showFacialLandmarks) {
          this.drawDetectionOverlay(detections);
        }
      } else {
        this.detectionScore = Math.max(0, this.detectionScore - 10);
        this.lastScores = [];
      }
    } catch (error) {
      console.error('⚠️ Error en detección:', error);
      this.detectionScore = 0;
    }
  }

  private calibrateFace(detections: any) {
    const landmarks = detections.landmarks;
    
    const mouth = landmarks.getMouth();
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const mouthRatio = mouthHeight / mouthWidth;
    
    const jawOutline = landmarks.getJawOutline();
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    const faceHeight = Math.abs(jawOutline[0].y - jawOutline[8].y);
    const faceRatio = faceWidth / faceHeight;
    
    const midWidth = Math.abs(jawOutline[5].x - jawOutline[11].x);
    const midRatio = midWidth / faceHeight;
    
    const mouthSizeRatio = mouthWidth / faceWidth;
    
    this.calibrationFrames++;
    
    if (this.calibrationFrames === 1) {
      this.baselineMouthRatio = mouthRatio;
      this.baselineFaceRatio = faceRatio;
      this.baselineMidRatio = midRatio;
      this.baselineBlowRatio = mouthRatio;
      this.baselineMouthSize = mouthSizeRatio;
    } else {
      this.baselineMouthRatio = (this.baselineMouthRatio + mouthRatio) / 2;
      this.baselineFaceRatio = (this.baselineFaceRatio + faceRatio) / 2;
      this.baselineMidRatio = (this.baselineMidRatio + midRatio) / 2;
      this.baselineBlowRatio = (this.baselineBlowRatio + mouthRatio) / 2;
      this.baselineMouthSize = (this.baselineMouthSize + mouthSizeRatio) / 2;
    }
    
    console.log(`🔧 Calibrando... ${this.calibrationFrames}/${this.CALIBRATION_FRAMES_NEEDED}`);
    
    if (this.calibrationFrames >= this.CALIBRATION_FRAMES_NEEDED) {
      this.isCalibrated = true;
      console.log('✅ CALIBRACIÓN COMPLETA:');
      console.log('   📏 Baseline Mouth Ratio:', this.baselineMouthRatio.toFixed(3));
      console.log('   📏 Baseline Face Ratio:', this.baselineFaceRatio.toFixed(3));
      console.log('   📏 Baseline Mid Ratio:', this.baselineMidRatio.toFixed(3));
      console.log('   📏 Baseline Mouth Size:', this.baselineMouthSize.toFixed(3));
      console.log('   🎯 ¡Ahora haz el ejercicio!');
    }
  }

  smoothScore(newScore: number): number {
    this.lastScores.push(newScore);
    
    if (this.lastScores.length > this.maxScoreHistory) {
      this.lastScores.shift();
    }
    
    const average = this.lastScores.reduce((sum, score) => sum + score, 0) / this.lastScores.length;
    return average;
  }

  analyzePraxiaType(detections: any): number {
    if (!this.selectedPraxia) return 0;

    const expressions = detections.expressions;
    const landmarks = detections.landmarks;

    switch (this.selectedPraxia.detectionType) {
      case 'smile':
        return this.detectSmile(expressions);
        
      case 'kiss':
        return this.detectKiss(landmarks);
        
      case 'tongue':
        return this.detectTongue(landmarks);
        
      case 'cheeks':
        return this.detectCheeks(landmarks);
        
      case 'blow':
        return this.detectBlow(landmarks, expressions);
        
      default:
        return 0;
    }
  }

  private detectSmile(expressions: any): number {
    const happyScore = expressions.happy * 100;
    
    console.log('😄 Sonrisa - Happy:', happyScore.toFixed(1));
    
    if (happyScore > 40) {
      console.log('✅ Sonrisa detectada');
      return Math.min(Math.max(happyScore, 70), 100);
    }
    
    return 0;
  }

  private detectKiss(landmarks: any): number {
    const mouth = landmarks.getMouth();
    const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
    const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
    const jawOutline = landmarks.getJawOutline();
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    
    const mouthRatio = mouthHeight / mouthWidth;
    const mouthSizeRatio = mouthWidth / faceWidth;
    
    const ratioChange = mouthRatio - this.baselineMouthRatio;
    const sizeChange = this.baselineMouthSize - mouthSizeRatio;
    
    console.log('😗 Beso - Ratio:', mouthRatio.toFixed(3), 
                '(base:', this.baselineMouthRatio.toFixed(3), ', cambio:', ratioChange.toFixed(3) + ')',
                '| Size:', mouthSizeRatio.toFixed(3),
                '(base:', this.baselineMouthSize.toFixed(3), ', cambio:', sizeChange.toFixed(3) + ')');
    
    // CRITERIO PRINCIPAL: El ratio altura/ancho debe aumentar significativamente
    // Cuando haces "beso", los labios se fruncen y el ratio aumenta
    const ratioIncreased = ratioChange > 0.12; // 12% de aumento
    
    // CRITERIO SECUNDARIO (bonus): Si la boca también se achica
    const sizeDecreased = sizeChange > 0.01; // 1% es suficiente como bonus
    
    let score = 0;
    
    if (ratioIncreased) {
      // El ratio aumentó - esto es lo principal para detectar beso
      score = Math.min(ratioChange * 400, 80); // Hasta 80 puntos por ratio
      console.log('  ✓ Ratio aumentó:', (ratioChange * 100).toFixed(1) + '%', '- Score:', score.toFixed(1));
      
      // Bonus si también se achicó la boca
      if (sizeDecreased) {
        const bonus = Math.min(sizeChange * 200, 20);
        score += bonus;
        console.log('  ✓ Bonus boca achicó:', (sizeChange * 100).toFixed(1) + '%', '- Bonus:', bonus.toFixed(1));
      }
      
      console.log('✅ BESO DETECTADO - Score Final:', score.toFixed(1));
      return Math.min(Math.max(score, 70), 100);
    }
    
    console.log('  ✗ Ratio NO aumentó suficiente (necesita +12%)');
    console.log('❌ No es un beso');
    return 0;
  }

  private detectTongue(landmarks: any): number {
    const mouthPoints = landmarks.getMouth();
    const upperLip = mouthPoints[13].y;
    const lowerLip = mouthPoints[19].y;
    const mouthOpenness = Math.abs(lowerLip - upperLip);
    
    console.log('😛 Lengua - Apertura:', mouthOpenness.toFixed(1));
    
    if (mouthOpenness > 12) {
      const score = Math.min(mouthOpenness * 5, 100);
      console.log('✅ Lengua detectada - Score:', score.toFixed(1));
      return score;
    }
    
    return 0;
  }

  private detectCheeks(landmarks: any): number {
    const jawOutline = landmarks.getJawOutline();
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    const faceHeight = Math.abs(jawOutline[0].y - jawOutline[8].y);
    const midWidth = Math.abs(jawOutline[5].x - jawOutline[11].x);
    
    const faceRatio = faceWidth / faceHeight;
    const midRatio = midWidth / faceHeight;
    
    const faceRatioChange = faceRatio - this.baselineFaceRatio;
    const midRatioChange = midRatio - this.baselineMidRatio;
    
    // Usar VALOR ABSOLUTO
    const absFaceChange = Math.abs(faceRatioChange);
    const absMidChange = Math.abs(midRatioChange);
    
    console.log('😮 Cachetes - FaceRatio:', faceRatio.toFixed(3),
                '(base:', this.baselineFaceRatio.toFixed(3), ', cambio:', (faceRatioChange * 100).toFixed(1) + '%)',
                '| MidRatio:', midRatio.toFixed(3),
                '(base:', this.baselineMidRatio.toFixed(3), ', cambio:', (midRatioChange * 100).toFixed(1) + '%)');
    
    // RANGO VÁLIDO: El cambio debe estar entre 3% y 15%
    // < 3% = no hay cambio suficiente
    // > 15% = probablemente es movimiento de cabeza/cámara, no ejercicio real
    const MIN_CHANGE = 0.03;  // 3% mínimo
    const MAX_CHANGE = 0.15;  // 15% máximo (más = movimiento)
    
    const faceInRange = absFaceChange >= MIN_CHANGE && absFaceChange <= MAX_CHANGE;
    const midInRange = absMidChange >= MIN_CHANGE && absMidChange <= MAX_CHANGE;
    
    let score = 0;
    let indicators = 0;
    
    if (faceInRange) {
      indicators++;
      score += Math.min(absFaceChange * 800, 50);
      console.log('  ✓ Cara cambió:', (absFaceChange * 100).toFixed(1) + '% (en rango 3-15%)');
    } else if (absFaceChange > MAX_CHANGE) {
      console.log('  ✗ Cara cambió DEMASIADO:', (absFaceChange * 100).toFixed(1) + '% (probablemente movimiento)');
    } else {
      console.log('  ✗ Cara NO cambió suficiente:', (absFaceChange * 100).toFixed(1) + '% (necesita 3-15%)');
    }
    
    if (midInRange) {
      indicators++;
      score += Math.min(absMidChange * 800, 50);
      console.log('  ✓ Zona media cambió:', (absMidChange * 100).toFixed(1) + '% (en rango 3-15%)');
    } else if (absMidChange > MAX_CHANGE) {
      console.log('  ✗ Zona media cambió DEMASIADO:', (absMidChange * 100).toFixed(1) + '% (probablemente movimiento)');
    } else {
      console.log('  ✗ Zona media NO cambió suficiente:', (absMidChange * 100).toFixed(1) + '% (necesita 3-15%)');
    }
    
    // Necesita AL MENOS 1 indicador en el rango válido
    if (indicators >= 1) {
      console.log('✅ CACHETES DETECTADOS - Score:', score.toFixed(1));
      return Math.min(Math.max(score, 70), 100);
    }
    
    console.log('❌ Cachetes NO inflados - Indicadores:', indicators + '/2');
    return 0;
  }

  private detectBlow(landmarks: any, expressions: any): number {
    const blowMouth = landmarks.getMouth();
    const blowWidth = Math.abs(blowMouth[0].x - blowMouth[6].x);
    const blowHeight = Math.abs(blowMouth[3].y - blowMouth[9].y);
    const blowRatio = blowHeight / blowWidth;
    
    const jawOutline = landmarks.getJawOutline();
    const faceWidth = Math.abs(jawOutline[3].x - jawOutline[13].x);
    const mouthSizeRatio = blowWidth / faceWidth;
    
    const ratioChange = blowRatio - this.baselineBlowRatio;
    const sizeChange = this.baselineMouthSize - mouthSizeRatio;
    
    console.log('💨 Soplar - Ratio:', blowRatio.toFixed(3),
                '(base:', this.baselineBlowRatio.toFixed(3), ', cambio:', ratioChange.toFixed(3) + ')',
                '| Size:', mouthSizeRatio.toFixed(3),
                '(cambio:', sizeChange.toFixed(3) + ')');
    
    // CRITERIO: El ratio debe aumentar SIGNIFICATIVAMENTE (labios en forma de O)
    // Mínimo 15% de aumento para evitar falsos positivos
    const ratioIncreased = ratioChange > 0.15;
    const isInORange = blowRatio > 0.5 && blowRatio < 1.8;
    
    let score = 0;
    
    if (ratioIncreased && isInORange) {
      score = Math.min(ratioChange * 400, 80);
      console.log('  ✓ Forma de O detectada - Ratio aumentó:', (ratioChange * 100).toFixed(1) + '%');
      
      if (sizeChange > 0.01) {
        const bonus = Math.min(sizeChange * 200, 20);
        score += bonus;
        console.log('  ✓ Bonus boca achicó:', (sizeChange * 100).toFixed(1) + '%');
      }
      
      console.log('✅ SOPLAR DETECTADO - Score Final:', score.toFixed(1));
      return Math.min(Math.max(score, 70), 100);
    }
    
    console.log('  ✗ Ratio NO aumentó suficiente (necesita +15%) o no está en rango O');
    console.log('❌ No se detecta soplar');
    return 0;
  }

  startSimpleTimer() {
    console.log('⏱️ MODO PRUEBA - Temporizador simulado');
    
    this.isDetecting = true;
    this.exerciseStartTime = Date.now();
    this.isCalibrated = true;
    
    this.ngZone.runOutsideAngular(() => {
      this.detectionInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.detectionScore = 50 + Math.random() * 30;
          
          const elapsed = Date.now() - this.exerciseStartTime;
          this.exerciseProgress = Math.min((elapsed / this.requiredDuration) * 100, 100);
          
          if (this.exerciseProgress >= 100 && !this.isCompletingExercise) {
            this.completeExercise();
          }
          
          this.cdr.detectChanges();
        });
      }, 100);
    });
  }

  drawDetectionOverlay(detections: any) {
    if (!this.canvasElement) return;

    const canvas = this.canvasElement.nativeElement;
    const video = this.videoElement.nativeElement;
    
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    faceapi.draw.drawDetections(canvas, [detections]);
    faceapi.draw.drawFaceLandmarks(canvas, [detections]);
  }

  completeExercise() {
    if (this.isCompletingExercise) {
      console.log('⚠️ Ya se está completando un ejercicio');
      return;
    }
    
    this.isCompletingExercise = true;
    this.isDetecting = false;
    console.log('🎉 ¡EJERCICIO COMPLETADO!');
    
    this.clearDetectionInterval();
    
    const randomIndex = Math.floor(Math.random() * this.motivationalMessages.length);
    this.currentMotivation = this.motivationalMessages[randomIndex];
    
    if (this.selectedPraxia) {
      const exerciseName = this.selectedPraxia.nombre;
      const currentCount = Number(this.exercisesCompletedToday[exerciseName] || 0);
      
      this.exercisesCompletedToday[exerciseName] = currentCount + 1;
      this.totalExercisesToday++;
      this.saveTodayProgress();
      
      this.historialService.registrarEjercicio(exerciseName).subscribe({
        next: () => console.log(`✅ ${exerciseName} registrado en historial`),
        error: (error: any) => console.error('❌ Error registrando ejercicio:', error)
      });
      
      console.log('📊 Progreso:', exerciseName, this.exercisesCompletedToday[exerciseName]);
    }
    
    this.isExerciseCorrect = true;
    this.cdr.detectChanges();
    
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.stopCamera();
          this.cdr.detectChanges();
          
          setTimeout(() => {
            this.ngZone.run(() => {
              this.resetExercise();
              this.cdr.detectChanges();
            });
          }, 5000);
        });
      }, 1000);
    });
  }

  resetExercise() {
    console.log('🔄 Reseteando ejercicio...');
    this.selectedPraxia = null;
    this.showInstructions = false;
    this.isExerciseCorrect = false;
    this.exerciseProgress = 0;
    this.detectionScore = 0;
    this.lastScores = [];
    this.isCompletingExercise = false;
    this.resetCalibration();
  }

  resetRuleta() {
    console.log('🔄 Reseteando ruleta completa...');
    this.rotation = 0;
    this.resetExercise();
    this.stopCamera();
  }

  getConfettiLeft(index: number): number {
    return (index * 10) + (Math.random() * 10);
  }

  getConfettiDelay(index: number): number {
    return (index * 0.15) % 2;
  }

  get Math() {
    return Math;
  }
}