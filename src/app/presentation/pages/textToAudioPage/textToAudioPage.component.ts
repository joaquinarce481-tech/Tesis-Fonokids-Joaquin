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
    TextMessageBoxComponent,
  ],
  templateUrl: './textToAudioPage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TextToAudioPageComponent {
  public messages = signal<Message[]>([]);
  public isLoading = signal(false);
  public openAiService = inject(OpenAiService);

handleMessage(prompt: string) {
  const message = prompt;

  this.messages.update( prev => [...prev, { text: message, isGpt: false }] );
  this.isLoading.set(true);

  this.openAiService.textToAudio( prompt, 'nova' )
    .subscribe( (response) => {
      console.log('🎵 RESPUESTA COMPLETA:', response); // 👈 AGREGÁ ESTO
      console.log('🎵 AUDIO URL:', response.audioUrl); // 👈 Y ESTO
      
      this.isLoading.set(false);
      this.messages.update( prev => [
        ...prev,
        {
          isGpt: true,
          text: response.message,
          audioUrl: response.audioUrl,
          emojis: response.emojis,
          decorativeText: response.decorativeText,
        }
      ])
    })
}
}