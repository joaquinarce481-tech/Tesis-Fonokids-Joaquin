import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ChatMessageComponent, MyMessageComponent, TypingLoaderComponent, TextMessageBoxComponent } from '@components/index';
import { Message } from '@interfaces/message.interface';
import { OpenAiService } from 'app/presentation/services/openai.service';

@Component({
  selector: 'app-assistant-page',
  standalone: true,
  imports: [
    CommonModule,
    ChatMessageComponent,
    MyMessageComponent,
    TypingLoaderComponent,
    TextMessageBoxComponent,
  ],
  templateUrl: './assistantPage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AssistantPageComponent {

  public messages = signal<Message[]>([]);
  public isLoading = signal(false);
  public openAiService = inject(OpenAiService);

  handleMessage(prompt: string) {

    this.messages.update((prev) => [
      ...prev,
      {
        isGpt: false,
        text: prompt
      }
    ]);

    
    this.isLoading.set(true);

    
    this.openAiService.assistantPage(prompt)
      .subscribe({
        next: (resp) => {
          this.isLoading.set(false);

         
          this.messages.update(prev => [
            ...prev,
            {
              isGpt: true,
              text: resp.content
            }
          ]);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Error en assistant page:', error);

          
          this.messages.update(prev => [
            ...prev,
            {
              isGpt: true,
              text: 'Lo siento, ocurrió un error. Por favor, intenta de nuevo.'
            }
          ]);
        }
      });
  }

}