import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  ChatMessageComponent,
  MyMessageComponent,
  TypingLoaderComponent,
  TextMessageBoxComponent,
} from '@components/index';
import { Message } from '@interfaces/message.interface';
import { OpenAiService } from 'app/presentation/services/openai.service';

@Component({
  selector: 'app-text-to-audio-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ChatMessageComponent,
    MyMessageComponent,
    TypingLoaderComponent,
    TextMessageBoxComponent, // 👈 Cambiado de Select a normal
  ],
  templateUrl: './textToAudioPage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TextToAudioPageComponent {
  public messages = signal<Message[]>([]);
  public isLoading = signal(false);
  public openAiService = inject(OpenAiService);

  // 👇 ELIMINADO: public voices = signal([...])

  handleMessage(prompt: string) { // 👈 Cambiado nombre del método
    const message = prompt;

    this.messages.update( prev => [...prev, { text: message, isGpt: false }] );
    this.isLoading.set(true);

    // 👇 ELIMINADO: selectedOption - ahora solo envía el prompt
    this.openAiService.textToAudio( prompt, 'nova' ) // 👈 Voz fija: nova
      .subscribe( ({ message, audioUrl }) => {

        this.isLoading.set(false);
        this.messages.update( prev => [
          ...prev,
          {
            isGpt: true,
            text: message,
            audioUrl: audioUrl,
          }
        ])
      })
  }
}