import { CommonModule } from '@angular/common';
import { Component, inject, signal, NgZone } from '@angular/core';
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
})
export default class AudioToTextPageComponent {
  public messages = signal<Message[]>([]);
  public isLoading = signal(false);
  public openAiService = inject(OpenAiService);
  public isRecording = signal(false);
  public recordingTime = signal(0);

  private ngZone = inject(NgZone);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingInterval: any;

  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  trackByMessageId(index: number, message: Message): string {
    return message.id || index.toString();
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      };

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.audioChunks = [];
      this.recordingTime.set(0);

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

      this.messages.set([
        ...this.messages(),
        {
          id: this.generateId(),
          text: '🎤 Grabando... Habla claramente y alto',
          isGpt: false
        }
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


    this.ngZone.run(() => {
      this.messages.set([
        ...this.messages(),
        {
          id: this.generateId(),
          text: '⏳ Procesando tu audio y evaluando pronunciación...',
          isGpt: false
        }
      ]);

      this.isLoading.set(true);
    });

    this.openAiService.audioToText(audioFile)
      .subscribe({
        next: (resp) => {
          console.log('✅ Respuesta recibida:', resp);


          this.ngZone.run(() => {
            this.isLoading.set(false);

            let newMessage: Message;

            if (resp.transcription.length < 3 ||
              resp.transcription.includes('Amara.org') ||
              resp.transcription.includes('Subtítulos')) {

              newMessage = {
                id: this.generateId(),
                isGpt: true,
                text: '⚠️ **No pude escuchar bien tu audio.**\n\nPor favor, intenta de nuevo:\n- Habla más alto y claro\n- Acércate más al micrófono\n- Asegúrate de estar en un lugar sin ruido'
              };

            } else {

              newMessage = {
                id: this.generateId(),
                isGpt: true,
                text: `**📝 Escuché:**\n"${resp.transcription}"\n\n${resp.evaluation}`
              };

            }

            const currentMessages = this.messages();
            this.messages.set([...currentMessages, newMessage]);

            console.log('📝 Total de mensajes:', this.messages().length);
            console.log('📝 Último mensaje agregado:', newMessage);
          });
        },
        error: (error) => {
          console.error('❌ Error:', error);


          this.ngZone.run(() => {
            this.isLoading.set(false);

            this.messages.set([
              ...this.messages(),
              {
                id: this.generateId(),
                isGpt: true,
                text: '❌ Lo siento, ocurrió un error al procesar el audio. Por favor, intenta de nuevo.'
              }
            ]);
          });
        }
      });
  }
}