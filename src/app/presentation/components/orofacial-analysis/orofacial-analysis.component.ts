import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

interface Exercise {
  id: string;
  name: string;
  instruction: string;
  targetMetric: 'lipAperture' | 'lipProtrusion' | 'jawOpening' | 'facialSymmetry';
  targetValue: number;
  tolerance: number;
}

@Component({
  selector: 'app-orofacial-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orofacial-analysis.component.html',
  styleUrls: ['./orofacial-analysis.component.css']
})
export class OrofacialAnalysisComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('progressBarElement') progressBarElement!: ElementRef<HTMLDivElement>;
  @ViewChild('progressStatusElement') progressStatusElement!: ElementRef<HTMLDivElement>;

  private faceMesh!: FaceMesh;
  private camera!: Camera;
  private canvasCtx!: CanvasRenderingContext2D;
  private mediaPipeReady = false;
  
  private detectionHistory: boolean[] = [];
  private readonly HISTORY_SIZE = 10;
  private frameCounter = 0;
  private lastUpdateFrame = 0;
  private readonly UPDATE_INTERVAL = 3; 
  
  private progressBarWidth = 0;
  private targetProgressWidth = 0;
  private progressAnimationId: number | null = null;
  private lastDetectionTime = Date.now();
  private readonly DETECTION_TIMEOUT = 500; 
  
  isRecording = false;
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];
  
  
  detectionState: 'searching' | 'detected' | 'lost' = 'searching';
  exerciseProgress = 0;
  isExerciseCorrect = false;
  statusMessage = '🔍 Buscando rostro...';
  
  
  currentExercise: Exercise = {
    id: 'open-mouth',
    name: '😮 Abrir la Boca',
    instruction: '¡Abre grande la boca! Como si fueras a gritar "¡AAAA!"',
    targetMetric: 'lipAperture',
    targetValue: 50,
    tolerance: 20
  };
  
  
  exercises: Exercise[] = [
    {
      id: 'open-mouth',
      name: '😮 Abrir la Boca',
      instruction: '¡Abre grande la boca! Como si fueras a gritar "¡AAAA!"',
      targetMetric: 'lipAperture',
      targetValue: 50,
      tolerance: 20
    },
    {
      id: 'big-smile',
      name: '😄 Sonrisa Grande',
      instruction: '¡Sonríe muy grande! Estira las comisuras hacia arriba',
      targetMetric: 'facialSymmetry',
      targetValue: 80,
      tolerance: 15
    }
  ];
  
  currentExerciseIndex = 0;
  
  orofacialMetrics: {
    lipAperture: number;
    lipProtrusion: number;
    jawOpening: number;
    facialSymmetry: number;
  } = {
    lipAperture: 0,
    lipProtrusion: 0,
    jawOpening: 0,
    facialSymmetry: 0
  };

  
  private readonly FACE_OVAL = [
    [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454],
    [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400],
    [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
    [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54],
    [54, 103], [103, 67], [67, 109], [109, 10]
  ];

  private readonly LIPS = [
    [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 320],
    [320, 307], [307, 375], [375, 321], [321, 308], [308, 324], [324, 318], [318, 12],
    [12, 15], [15, 16], [16, 17], [17, 18], [18, 200], [200, 199], [199, 175], [175, 0],
    [0, 13], [13, 82], [82, 81], [81, 80], [80, 78]
  ];

  private readonly LEFT_EYE = [
    [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133],
    [133, 173], [173, 157], [157, 158], [158, 159], [159, 160], [160, 161], [161, 246],
    [246, 33]
  ];

  private readonly RIGHT_EYE = [
    [362, 382], [382, 381], [381, 380], [380, 374], [374, 373], [373, 390], [390, 249],
    [249, 263], [263, 466], [466, 388], [388, 387], [387, 386], [386, 385], [385, 384],
    [384, 398], [398, 362]
  ];

  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    console.log('Componente inicializado');
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeMediaPipe();
    }, 100);
  }

  ngOnDestroy() {
    if (this.camera) {
      this.camera.stop();
    }
    if (this.progressAnimationId) {
      cancelAnimationFrame(this.progressAnimationId);
    }
  }

  private async initializeMediaPipe() {
    try {
      console.log('🚀 Inicializando MediaPipe...');
      
      this.canvasCtx = this.canvasElement.nativeElement.getContext('2d')!;
      
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3
      });

     
      this.faceMesh.onResults((results) => {
        this.ngZone.runOutsideAngular(() => {
          this.onResults(results);
        });
      });

      this.mediaPipeReady = true;
      console.log('✅ MediaPipe inicializado');
      
      
      this.startProgressAnimation();
      
    } catch (error) {
      console.error('❌ Error inicializando MediaPipe:', error);
      this.mediaPipeReady = false;
    }
  }

  private onResults(results: any) {
    if (!this.canvasCtx) return;

    this.frameCounter++;
    
    const canvas = this.canvasElement.nativeElement;
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    this.canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    const faceDetected = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
    
    
    this.detectionHistory.push(faceDetected);
    if (this.detectionHistory.length > this.HISTORY_SIZE) {
      this.detectionHistory.shift();
    }
    
    const detectionRate = this.detectionHistory.filter(d => d).length / this.detectionHistory.length;
    const isStableDetection = detectionRate > 0.6; 
    
    if (faceDetected && results.multiFaceLandmarks[0]) {
      this.lastDetectionTime = Date.now();
      
      
      if (this.frameCounter - this.lastUpdateFrame >= this.UPDATE_INTERVAL) {
        this.lastUpdateFrame = this.frameCounter;
        this.drawCompleteFaceMesh(results.multiFaceLandmarks[0]);
        this.calculateOrofacialMetrics(results.multiFaceLandmarks[0]);
        this.evaluateExercise();
      }
    }
    
    
    const timeSinceLastDetection = Date.now() - this.lastDetectionTime;
    
    if (isStableDetection && timeSinceLastDetection < this.DETECTION_TIMEOUT) {
      this.updateDetectionState('detected');
    } else if (timeSinceLastDetection > this.DETECTION_TIMEOUT * 2) {
      this.updateDetectionState('lost');
    } else {
      this.updateDetectionState('searching');
    }

    this.canvasCtx.restore();
  }

  private updateDetectionState(state: 'searching' | 'detected' | 'lost') {
    if (this.detectionState !== state) {
      this.detectionState = state;
      
      
      if (this.progressStatusElement?.nativeElement) {
        const statusEl = this.progressStatusElement.nativeElement;
        
        switch(state) {
          case 'searching':
            statusEl.innerHTML = '<span class="status-searching">Buscando rostro...</span>';
            break;
          case 'detected':
            statusEl.innerHTML = `<span class="status-detected">¡Sigue así! ${Math.round(this.progressBarWidth)}%</span>`;
            break;
          case 'lost':
            statusEl.innerHTML = '<span class="status-lost">Acércate más a la cámara</span>';
            break;
        }
      }
    }
  }

  private startProgressAnimation() {
    const animate = () => {
      // Suavizar el progreso
      const diff = this.targetProgressWidth - this.progressBarWidth;
      this.progressBarWidth += diff * 0.08; // Velocidad de interpolación más lenta
      
      // Actualizar directamente el DOM sin pasar por Angular
      if (this.progressBarElement?.nativeElement) {
        const barEl = this.progressBarElement.nativeElement;
        const width = Math.max(0, Math.min(100, this.progressBarWidth));
        
        // Actualizar ancho
        barEl.style.width = `${width}%`;
        
        // Actualizar clases CSS basado en el estado
        barEl.classList.remove('detecting', 'success', 'warning');
        
        if (this.detectionState === 'searching') {
          barEl.classList.add('detecting');
        } else if (this.isExerciseCorrect) {
          barEl.classList.add('success');
        } else if (this.detectionState === 'lost') {
          barEl.classList.add('warning');
        }
        
        // Actualizar porcentaje en el mensaje si está detectado
        if (this.detectionState === 'detected' && this.progressStatusElement?.nativeElement) {
          const statusEl = this.progressStatusElement.nativeElement.querySelector('.status-detected');
          if (statusEl) {
            statusEl.textContent = `👀 ¡Sigue así! ${Math.round(width)}%`;
          }
        }
      }
      
      this.progressAnimationId = requestAnimationFrame(animate);
    };
    
    this.progressAnimationId = requestAnimationFrame(animate);
  }

  private evaluateExercise() {
    const metric = this.orofacialMetrics[this.currentExercise.targetMetric];
    const target = this.currentExercise.targetValue;
    const tolerance = this.currentExercise.tolerance;
    
    // Calcular qué tan cerca está del objetivo
    const difference = Math.abs(metric - target);
    const maxDifference = 100;
    
    // Calcular progreso (0-100) con suavizado
    const rawProgress = Math.max(0, Math.min(100, 100 - (difference / maxDifference) * 100));
    
    // Aplicar suavizado exponencial
    this.targetProgressWidth = this.targetProgressWidth * 0.7 + rawProgress * 0.3;
    
    // Verificar si el ejercicio está correcto
    const wasCorrect = this.isExerciseCorrect;
    this.isExerciseCorrect = difference <= tolerance;
    
    // Si acaba de completar el ejercicio
    if (!wasCorrect && this.isExerciseCorrect) {
      setTimeout(() => {
        if (this.isExerciseCorrect) {
          this.nextExercise();
        }
      }, 2000);
    }
  }

  nextExercise() {
    this.currentExerciseIndex = (this.currentExerciseIndex + 1) % this.exercises.length;
    this.currentExercise = this.exercises[this.currentExerciseIndex];
    this.resetProgress();
  }

  previousExercise() {
    this.currentExerciseIndex = this.currentExerciseIndex === 0 
      ? this.exercises.length - 1 
      : this.currentExerciseIndex - 1;
    this.currentExercise = this.exercises[this.currentExerciseIndex];
    this.resetProgress();
  }

  retryExercise() {
    this.resetProgress();
  }

  private resetProgress() {
    this.progressBarWidth = 0;
    this.targetProgressWidth = 0;
    this.isExerciseCorrect = false;
    this.detectionHistory = [];
    this.frameCounter = 0;
    this.lastUpdateFrame = 0;
  }

  private drawCompleteFaceMesh(landmarks: any[]) {
    const canvas = this.canvasElement.nativeElement;
    
    // Dibujar contorno facial - BLANCO
    this.drawConnections(landmarks, this.FACE_OVAL, '#FFFFFF', 1);
    
    // Dibujar labios - ROJO
    this.drawConnections(landmarks, this.LIPS, '#FF0000', 2);
    
    // Dibujar todos los landmarks como puntos pequeños - BLANCO
    this.canvasCtx.fillStyle = '#FFFFFF';
    landmarks.forEach((landmark, index) => {
      if (landmark) {
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(
          landmark.x * canvas.width,
          landmark.y * canvas.height,
          1, 0, 2 * Math.PI
        );
        this.canvasCtx.fill();
      }
    });

    // Puntos específicos para análisis orofacial - MÁS GRANDES Y COLORIDOS
    // Labios superiores - ROJO BRILLANTE
    this.canvasCtx.fillStyle = '#FF0000';
    [13, 312, 311, 310, 415, 308, 324, 318].forEach((index) => {
      if (landmarks[index]) {
        const point = landmarks[index];
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          4, 0, 2 * Math.PI
        );
        this.canvasCtx.fill();
      }
    });

    // Labios inferiores - VERDE BRILLANTE
    this.canvasCtx.fillStyle = '#00FF00';
    [14, 317, 402, 318, 324, 308, 415, 310].forEach((index) => {
      if (landmarks[index]) {
        const point = landmarks[index];
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          4, 0, 2 * Math.PI
        );
        this.canvasCtx.fill();
      }
    });

    // Comisuras labiales - AZUL BRILLANTE
    this.canvasCtx.fillStyle = '#0000FF';
    [61, 291].forEach((index) => {
      if (landmarks[index]) {
        const point = landmarks[index];
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          6, 0, 2 * Math.PI
        );
        this.canvasCtx.fill();
      }
    });
  }
  
  private drawConnections(landmarks: any[], connections: number[][], color: string, lineWidth: number) {
    const canvas = this.canvasElement.nativeElement;
    this.canvasCtx.strokeStyle = color;
    this.canvasCtx.lineWidth = lineWidth;
    
    connections.forEach(connection => {
      const start = landmarks[connection[0]];
      const end = landmarks[connection[1]];
      
      if (start && end) {
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(start.x * canvas.width, start.y * canvas.height);
        this.canvasCtx.lineTo(end.x * canvas.width, end.y * canvas.height);
        this.canvasCtx.stroke();
      }
    });
  }

  private calculateOrofacialMetrics(landmarks: any[]) {
    if (!landmarks || landmarks.length === 0) return;

    // Calcular métricas simplificadas
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const lipAperture = upperLip && lowerLip ? 
      Math.abs(upperLip.y - lowerLip.y) * 200 : 0;

    const lipCornerLeft = landmarks[61];
    const lipCornerRight = landmarks[291];
    const facialSymmetry = lipCornerLeft && lipCornerRight ?
      (1 - Math.abs(lipCornerLeft.y - lipCornerRight.y)) * 100 : 0;

    // Aplicar suavizado a las métricas
    this.orofacialMetrics = {
      lipAperture: Math.min(100, this.orofacialMetrics.lipAperture * 0.7 + lipAperture * 0.3),
      lipProtrusion: this.orofacialMetrics.lipProtrusion * 0.9,
      jawOpening: this.orofacialMetrics.jawOpening * 0.9,
      facialSymmetry: Math.min(100, this.orofacialMetrics.facialSymmetry * 0.7 + facialSymmetry * 0.3)
    };
  }

  async toggleCamera() {
    if (!this.isRecording) {
      await this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  private async startCamera() {
    try {
      console.log('🎥 Iniciando cámara...');
      
      if (!this.mediaPipeReady) {
        await this.initializeMediaPipe();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.resetProgress();
      this.detectionState = 'searching';
      
      this.camera = new Camera(this.videoElement.nativeElement, {
        onFrame: async () => {
          await this.faceMesh.send({ image: this.videoElement.nativeElement });
        },
        width: 640,
        height: 480
      });
      
      await this.camera.start();
      this.isRecording = true;
      console.log('✅ Cámara iniciada');
    } catch (error) {
      console.error('❌ Error:', error);
      this.isRecording = false;
    }
  }

  private stopCamera() {
    try {
      if (this.camera) {
        this.camera.stop();
      }
      
      this.resetProgress();
      this.detectionState = 'searching';
      
      if (this.canvasCtx) {
        const canvas = this.canvasElement.nativeElement;
        this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      this.isRecording = false;
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }

  startRecording() {
    // Implementación de grabación...
  }

  stopRecording() {
    // Implementación de detener grabación...
  }
}