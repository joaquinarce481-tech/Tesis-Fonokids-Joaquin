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

  // Estados de la ruleta
  isSpinning = false;
  rotation = 0;
  selectedPraxia: Praxia | null = null;
  showInstructions = false;
  puntos = 0;

  // Estados de la cámara y detección
  isCameraActive = false;
  isDetecting = false;
  detectionScore = 0;
  isExerciseCorrect = false;
  detectionInterval: any;
  stream: MediaStream | null = null;
  modelsLoaded = false;

  // Tiempo y progreso
  exerciseStartTime = 0;
  exerciseProgress = 0;
  requiredDuration = 3000;

  praxias: Praxia[] = [
    {
      id: 1,
      emoji: '😗',
      nombre: 'Beso',
      color: '#FF6B6B',
      instruccion: 'Frunce los labios como si fueras a dar un beso',
      duracion: '3 segundos',
      repeticiones: 3,
      detectionType: 'kiss'
    },
    {
      id: 2,
      emoji: '😮',
      nombre: 'Inflar Cachetes',
      color: '#4ECDC4',
      instruccion: 'Infla tus cachetes como un globo',
      duracion: '5 segundos',
      repeticiones: 2,
      detectionType: 'cheeks'
    },
    {
      id: 3,
      emoji: '😛',
      nombre: 'Lengua Afuera',
      color: '#45B7D1',
      instruccion: 'Saca la lengua lo más lejos que puedas',
      duracion: '3 segundos',
      repeticiones: 4,
      detectionType: 'tongue'
    },
    {
      id: 4,
      emoji: '😄',
      nombre: 'Sonrisa Grande',
      color: '#96CEB4',
      instruccion: 'Sonríe muy grande mostrando todos tus dientes',
      duracion: '3 segundos',
      repeticiones: 3,
      detectionType: 'smile'
    },
    {
      id: 5,
      emoji: '💨',
      nombre: 'Soplar',
      color: '#FF9FF3',
      instruccion: 'Sopla fuerte como si apagaras velas',
      duracion: '3 soplos fuertes',
      repeticiones: 1,
      detectionType: 'blow'
    }
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    await this.loadFaceApiModels();
  }

  ngOnDestroy() {
    this.stopCamera();
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }
  }

  async loadFaceApiModels() {
    console.log('⚠️ Saltando carga de modelos de IA por ahora');
    this.modelsLoaded = false;
  }

  spinWheel() {
    if (this.isSpinning) return;
    
    this.isSpinning = true;
    this.showInstructions = false;
    this.selectedPraxia = null;
    this.stopCamera();
    
    const extraRotation = Math.random() * 360;
    const fullRotations = 1080 + extraRotation;
    const newRotation = this.rotation + fullRotations;
    
    this.rotation = newRotation;
    
    setTimeout(() => {
      const normalizedRotation = newRotation % 360;
      
      let selectedIndex = 0;
      
      if (normalizedRotation >= 0 && normalizedRotation < 72) {
        selectedIndex = 4;
      } else if (normalizedRotation >= 72 && normalizedRotation < 144) {
        selectedIndex = 0;
      } else if (normalizedRotation >= 144 && normalizedRotation < 216) {
        selectedIndex = 1;
      } else if (normalizedRotation >= 216 && normalizedRotation < 288) {
        selectedIndex = 2;
      } else {
        selectedIndex = 3;
      }
      
      this.selectedPraxia = this.praxias[selectedIndex];
      this.isSpinning = false;
      this.showInstructions = true;
      
      console.log('Praxia seleccionada:', this.selectedPraxia?.nombre);
      console.log('Rotación normalizada:', normalizedRotation);
      console.log('Índice seleccionado:', selectedIndex);
      
      this.requiredDuration = this.selectedPraxia?.nombre === 'Inflar Cachetes' ? 5000 : 3000;
    }, 3000);
  }

  async startCamera() {
    try {
      console.log('🎥 Solicitando acceso a la cámara...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      console.log('✅ Stream de cámara obtenido');
      
      if (this.videoElement) {
        const video = this.videoElement.nativeElement;
        
        video.srcObject = this.stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        
        video.style.display = 'block';
        video.style.width = '100%';
        video.style.height = '300px';
        video.style.objectFit = 'cover';
        video.style.background = '#000';
        video.style.borderRadius = '15px';
        
        console.log('📹 Video configurado, esperando carga...');
        
        video.onloadedmetadata = async () => {
          console.log('✅ Metadata cargada:', {
            width: video.videoWidth,
            height: video.videoHeight
          });
          
          try {
            await video.play();
            console.log('▶️ Video reproduciéndose exitosamente');
            
            this.isCameraActive = true;
            this.cdr.detectChanges();
            
            setTimeout(() => {
              this.startDetection();
            }, 500);
            
          } catch (playError) {
            console.warn('⚠️ Play automático falló:', playError);
            video.play();
            this.isCameraActive = true;
            this.cdr.detectChanges();
            this.startDetection();
          }
        };
        
        video.onerror = (error) => {
          console.error('❌ Error en video element:', error);
        };
        
        setTimeout(() => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            console.log('✅ Video funcionando correctamente');
          } else {
            console.error('❌ Video no está mostrando contenido');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error accediendo a la cámara:', error);
      alert('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }

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
    
    console.log('✅ Cámara completamente detenida');
  }

  startDetection() {
    console.log('🤖 Iniciando detección simplificada...');
    
    this.startSimpleTimer();
    
    setTimeout(() => {
      if (this.videoElement && this.videoElement.nativeElement.videoWidth > 0) {
        console.log('✅ Video funcionando correctamente:', {
          width: this.videoElement.nativeElement.videoWidth,
          height: this.videoElement.nativeElement.videoHeight
        });
      } else {
        console.error('❌ Video no está funcionando correctamente');
      }
    }, 1000);
  }

  async detectPraxia() {
    if (!this.videoElement || !this.selectedPraxia) return;

    const video = this.videoElement.nativeElement;
    const detections = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    if (detections) {
      const score = this.analyzePraxiaType(detections);
      this.detectionScore = score;
      
      if (score > 70) {
        this.updateExerciseProgress();
      } else {
        this.exerciseProgress = Math.max(0, this.exerciseProgress - 5);
      }
      
      this.drawDetectionOverlay(detections);
    }
  }

  analyzePraxiaType(detections: any): number {
    if (!this.selectedPraxia) return 0;

    const expressions = detections.expressions;
    const landmarks = detections.landmarks;

    switch (this.selectedPraxia.detectionType) {
      case 'smile':
        return expressions.happy * 100;
        
      case 'kiss':
        const mouth = landmarks.getMouth();
        const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
        const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);
        const ratio = mouthHeight / mouthWidth;
        return Math.min(ratio * 150, 100);
        
      case 'tongue':
        const mouthOpen = landmarks.getMouth();
        const openness = Math.abs(mouthOpen[3].y - mouthOpen[9].y);
        return Math.min(openness * 10, 100);
        
      case 'cheeks':
        const jaw = landmarks.getJawOutline();
        const faceWidth = Math.abs(jaw[0].x - jaw[16].x);
        return Math.min((faceWidth - 100) * 2, 100);
        
      case 'blow':
        return expressions.surprised * 80 + Math.random() * 20;
        
      default:
        return 0;
    }
  }

  updateExerciseProgress() {
    const elapsed = Date.now() - this.exerciseStartTime;
    this.exerciseProgress = Math.min((elapsed / this.requiredDuration) * 100, 100);
    
    if (this.exerciseProgress >= 100 && !this.isExerciseCorrect) {
      this.completeExercise();
    }
  }

  startSimpleTimer() {
    console.log('⏱️ Iniciando temporizador simple...');
    
    this.isDetecting = true;
    this.exerciseStartTime = Date.now();
    
    this.detectionInterval = setInterval(() => {
      const elapsed = Date.now() - this.exerciseStartTime;
      this.exerciseProgress = Math.min((elapsed / this.requiredDuration) * 100, 100);
      
      this.detectionScore = 60 + Math.random() * 40;
      
      if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - 100) / 1000)) {
        console.log(`⏰ Progreso: ${this.exerciseProgress.toFixed(1)}% - Puntuación: ${this.detectionScore.toFixed(1)}%`);
      }
      
      if (this.exerciseProgress >= 100) {
        console.log('🎉 Ejercicio completado!');
        this.completeExercise();
      }
    }, 100);
  }

  drawDetectionOverlay(detections: any) {
    if (!this.canvasElement) return;

    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');
    const video = this.videoElement.nativeElement;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    
    const color = this.detectionScore > 70 ? '#00ff00' : '#ff6600';
    faceapi.draw.drawDetections(canvas, [detections]);
    faceapi.draw.drawFaceLandmarks(canvas, [detections]);
  }

  completeExercise() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    this.isExerciseCorrect = true;
    this.puntos += 20;
    
    this.stopCamera();
    
    this.showCelebration();
    
    setTimeout(() => {
      this.resetExercise();
    }, 3000);
  }

  showCelebration() {
    console.log('🎉 ¡EJERCICIO COMPLETADO! 🎉');
  }

  resetExercise() {
    this.selectedPraxia = null;
    this.showInstructions = false;
    this.isExerciseCorrect = false;
    this.exerciseProgress = 0;
    this.detectionScore = 0;
  }

  resetRuleta() {
    this.rotation = 0;
    this.resetExercise();
    this.stopCamera();
  }

  getSegmentPath(index: number): string {
    const angle = (360 / this.praxias.length) * index;
    const nextAngle = (360 / this.praxias.length) * (index + 1);
    
    const startAngleRad = (angle * Math.PI) / 180;
    const endAngleRad = (nextAngle * Math.PI) / 180;
    const largeArcFlag = nextAngle - angle <= 180 ? "0" : "1";
    
    const x1 = 160 + 150 * Math.cos(startAngleRad);
    const y1 = 160 + 150 * Math.sin(startAngleRad);
    const x2 = 160 + 150 * Math.cos(endAngleRad);
    const y2 = 160 + 150 * Math.sin(endAngleRad);
    
    return `M 160 160 L ${x1} ${y1} A 150 150 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  getTextX(index: number): number {
    const textAngle = this.getTextAngle(index);
    const textAngleRad = (textAngle * Math.PI) / 180;
    return 160 + 100 * Math.cos(textAngleRad);
  }

  getTextY(index: number): number {
    const textAngle = this.getTextAngle(index);
    const textAngleRad = (textAngle * Math.PI) / 180;
    return 160 + 100 * Math.sin(textAngleRad);
  }

  getTextAngle(index: number): number {
    const angle = (360 / this.praxias.length) * index;
    return angle + (360 / this.praxias.length) / 2;
  }

  get Math() {
    return Math;
  }
}