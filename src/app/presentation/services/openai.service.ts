import { Injectable } from '@angular/core';
import {
  orthographyUseCase,
  translateTextUseCase,
  prosConsStreamUseCase,
  prosConsUseCase,
  textToAudioUseCase,
  assistantPageUseCase, 
  audioToTextUseCase,       // 👈 AGREGAR ESTE IMPORT
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

  prosConsStreamDiscusser(prompt: string, abortSignal: AbortSignal) {
    return prosConsStreamUseCase(prompt, abortSignal);
  }

  translateText(prompt: string, lang: string) {
    return from(translateTextUseCase(prompt, lang));
  }

  textToAudio(prompt: string, voice: string) {
    return from(textToAudioUseCase(prompt, voice));
  }

  // 👇 MÉTODO CORREGIDO
  assistantPage(prompt: string) {
    return from(assistantPageUseCase(prompt));
  }
  audioToText(audioFile: File) {
  return from(audioToTextUseCase(audioFile));
  } 

}