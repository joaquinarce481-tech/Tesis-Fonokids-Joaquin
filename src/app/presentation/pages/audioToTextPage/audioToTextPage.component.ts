import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ChatMessageComponent, MyMessageComponent, TypingLoaderComponent } from '@components/index';
import { Message } from '@interfaces/message.interface';
import { OpenAiService } from 'app/presentation/services/openai.service';

@Component({
  selector: 'app-audio-to-text-page',
  standalone: true,
  imports: [
    CommonModule,
    ChatMessageComponent,
    MyMessageComponent,
    TypingLoaderComponent,
  ],
  templateUrl: './audioToTextPage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AudioToTextPageComponent {
  public messages = signal<Message[]>([]);
  public isLoading = signal(false);
  public openAiService = inject(OpenAiService);
  public isRecording = signal(false);
  public recordingTime = signal(0);
  
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingInterval: any;

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.recordingTime.set(0);

      // 👇 NUEVO: Contador de tiempo
      this.recordingInterval = setInterval(() => {
        this.recordingTime.update(t => t + 1);
      }, 1000);

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        clearInterval(this.recordingInterval);
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.sendAudioToBackend(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      
      // 👇 NUEVO: Mensaje de que está grabando
      this.messages.update(prev => [
        ...prev,
        { text: '🎤 Grabando... Habla ahora', isGpt: false }
      ]);
      
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      clearInterval(this.recordingInterval);
      this.recordingTime.set(0);
    }
  }

  private sendAudioToBackend(audioBlob: Blob) {
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

    // 👇 NUEVO: Mensaje de procesando
    this.messages.update(prev => [
      ...prev,
      { text: '⏳ Procesando tu audio y evaluando pronunciación...', isGpt: false }
    ]);

    this.isLoading.set(true);

    this.openAiService.audioToText(audioFile)
      .subscribe({
        next: (resp) => {
          this.isLoading.set(false);

          // Agregar transcripción + evaluación
          this.messages.update(prev => [
            ...prev,
            {
              isGpt: true,
              text: `**📝 Transcripción:**\n${resp.transcription}\n\n${resp.evaluation}`
            }
          ]);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Error:', error);
          
          this.messages.update(prev => [
            ...prev,
            {
              isGpt: true,
              text: '❌ Lo siento, ocurrió un error al procesar el audio. Por favor, intenta de nuevo.'
            }
          ]);
        }
      });
  }
}