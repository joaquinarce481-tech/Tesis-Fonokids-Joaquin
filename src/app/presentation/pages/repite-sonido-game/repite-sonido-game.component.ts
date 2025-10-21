import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { OpenAiService } from '../../services/openai.service';

interface Ejercicio {
  id: number;
  texto: string;
  audioUrl?: string;
  categoria: 'fonema' | 'silaba' | 'palabra';
}

@Component({
  selector: 'app-repite-sonido-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './repite-sonido-game.component.html',
  styleUrls: ['./repite-sonido-game.component.css']
})
export class RepiteSonidoGameComponent implements OnInit, OnDestroy {
  // Inyección correcta de servicios
  private router = inject(Router);
  private openAiService = inject(OpenAiService);

  ejercicios: Ejercicio[] = [
    // FONEMAS
    { id: 1, texto: 'A', categoria: 'fonema' },
    { id: 2, texto: 'E', categoria: 'fonema' },
    { id: 3, texto: 'I', categoria: 'fonema' },
    { id: 4, texto: 'O', categoria: 'fonema' },
    { id: 5, texto: 'U', categoria: 'fonema' },
    { id: 6, texto: 'M', categoria: 'fonema' },
    { id: 7, texto: 'P', categoria: 'fonema' },
    { id: 8, texto: 'S', categoria: 'fonema' },
    { id: 9, texto: 'L', categoria: 'fonema' },
    { id: 10, texto: 'R', categoria: 'fonema' },
    
    // SÍLABAS
    { id: 11, texto: 'MA', categoria: 'silaba' },
    { id: 12, texto: 'PA', categoria: 'silaba' },
    { id: 13, texto: 'SA', categoria: 'silaba' },
    { id: 14, texto: 'LA', categoria: 'silaba' },
    { id: 15, texto: 'RA', categoria: 'silaba' },
    { id: 16, texto: 'ME', categoria: 'silaba' },
    { id: 17, texto: 'PE', categoria: 'silaba' },
    { id: 18, texto: 'SE', categoria: 'silaba' },
    
    // PALABRAS
    { id: 19, texto: 'MAMÁ', categoria: 'palabra' },
    { id: 20, texto: 'PAPÁ', categoria: 'palabra' },
    { id: 21, texto: 'CASA', categoria: 'palabra' },
    { id: 22, texto: 'PERRO', categoria: 'palabra' },
    { id: 23, texto: 'GATO', categoria: 'palabra' },
    { id: 24, texto: 'SAPO', categoria: 'palabra' },
    { id: 25, texto: 'LUNA', categoria: 'palabra' },
  ];

  ejercicioActual: Ejercicio | null = null;
  ejercicioIndex: number = 0;
  
  isRecording: boolean = false;
  isProcessing: boolean = false;
  feedback: string = '';
  feedbackType: 'success' | 'error' | 'info' | '' = '';
  
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  audioUrl: string = '';

  ngOnInit() {
    this.cargarEjercicio();
  }

  ngOnDestroy() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
  }

  cargarEjercicio() {
    if (this.ejercicioIndex < this.ejercicios.length) {
      this.ejercicioActual = this.ejercicios[this.ejercicioIndex];
      this.feedback = '';
      this.feedbackType = '';
    } else {
      // Reiniciar si llegó al final
      this.ejercicioIndex = 0;
      this.ejercicioActual = this.ejercicios[0];
    }
  }

  async reproducirTexto() {
    if (!this.ejercicioActual) return;
    
    const utterance = new SpeechSynthesisUtterance(this.ejercicioActual.texto);
    utterance.lang = 'es-ES';
    utterance.rate = 0.8;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
  }

  async iniciarGrabacion() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };
      
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.audioUrl = URL.createObjectURL(audioBlob);
        await this.enviarAudioParaEvaluacion(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      this.feedback = '🎤 Grabando... Di: "' + this.ejercicioActual?.texto + '"';
      this.feedbackType = 'info';
      
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      this.feedback = '❌ No se pudo acceder al micrófono';
      this.feedbackType = 'error';
    }
  }

  detenerGrabacion() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.isProcessing = true;
      this.feedback = '⏳ Evaluando tu pronunciación...';
      this.feedbackType = 'info';
    }
  }

  async enviarAudioParaEvaluacion(audioBlob: Blob) {
    try {
      // ✅ Convertir Blob a File
      const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
      
      const formData = new FormData();
      formData.append('file', audioFile);

      // ✅ Forzar el tipo con 'as any' para evitar el error de TypeScript
      this.openAiService.audioToText(formData as any).subscribe({
        next: (response: any) => {
          console.log('Respuesta de la IA:', response);
          this.evaluarRespuesta(response.text || response.msg);
        },
        error: (error: any) => {
          console.error('Error al evaluar audio:', error);
          this.feedback = '❌ Error al procesar el audio. Intenta de nuevo.';
          this.feedbackType = 'error';
          this.isProcessing = false;
        }
      });
      
    } catch (error) {
      console.error('Error:', error);
      this.feedback = '❌ Error al enviar el audio';
      this.feedbackType = 'error';
      this.isProcessing = false;
    }
  }

  evaluarRespuesta(textoTranscrito: string) {
    if (!this.ejercicioActual) return;

    const textoEsperado = this.ejercicioActual.texto.toLowerCase().trim();
    const textoRecibido = textoTranscrito.toLowerCase().trim();

    console.log('Esperado:', textoEsperado);
    console.log('Recibido:', textoRecibido);

    const esCorrecta = textoRecibido.includes(textoEsperado) || 
                       textoEsperado.includes(textoRecibido) ||
                       this.similitudTexto(textoEsperado, textoRecibido) > 0.7;

    if (esCorrecta) {
      this.feedback = '🎉 ¡Muy bien! Dijiste "' + this.ejercicioActual.texto + '" correctamente';
      this.feedbackType = 'success';
    } else {
      this.feedback = '❌ Intenta de nuevo. Escuchaste: "' + textoTranscrito + '". Debes decir: "' + this.ejercicioActual.texto + '"';
      this.feedbackType = 'error';
    }

    this.isProcessing = false;
  }

  similitudTexto(texto1: string, texto2: string): number {
    const len1 = texto1.length;
    const len2 = texto2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1.0;
    
    let coincidencias = 0;
    const minLen = Math.min(len1, len2);
    
    for (let i = 0; i < minLen; i++) {
      if (texto1[i] === texto2[i]) {
        coincidencias++;
      }
    }
    
    return coincidencias / maxLen;
  }

  siguienteEjercicio() {
    this.ejercicioIndex++;
    this.cargarEjercicio();
    this.audioUrl = '';
  }

  anteriorEjercicio() {
    if (this.ejercicioIndex > 0) {
      this.ejercicioIndex--;
      this.cargarEjercicio();
      this.audioUrl = '';
    }
  }

  volverAlMenu() {
    this.router.navigate(['/juegos-terapeuticos']);
  }

  escucharMiGrabacion() {
    if (this.audioUrl) {
      const audio = new Audio(this.audioUrl);
      audio.play();
    }
  }
}