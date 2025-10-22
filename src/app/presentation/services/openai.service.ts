import { Injectable } from '@angular/core';
import {
  orthographyUseCase,
  translateTextUseCase,
  prosConsStreamUseCase,
  prosConsUseCase,
  textToAudioUseCase,
  assistantPageUseCase, 
  audioToTextUseCase,
} from '@use-cases/index';
import { from } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OpenAiService {

  checkOrthography(prompt: string) {
    return from(orthographyUseCase(prompt));
  }

  prosConsDiscusser(prompt: string) {
    return from(prosConsUseCase(prompt));
  }

  // 👇 ESTE ES EL MÉTODO CORRECTO PARA EL STREAM
  prosConsDiscusserStream(prompt: string, abortSignal: AbortSignal) {
    return prosConsStreamUseCase(prompt, abortSignal);
  }

  translateText(prompt: string, lang: string) {
    return from(translateTextUseCase(prompt, lang));
  }

  textToAudio(prompt: string, voice: string) {
    return from(textToAudioUseCase(prompt, voice));
  }

  assistantPage(prompt: string) {
    return from(assistantPageUseCase(prompt));
  }

  audioToText(audioFile: File) {
    return from(audioToTextUseCase(audioFile));
  }

}