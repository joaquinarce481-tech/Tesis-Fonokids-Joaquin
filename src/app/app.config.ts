import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideMarkdown } from 'ngx-markdown'; // 👈 AÑADE ESTA LÍNEA
import { provideHttpClient } from '@angular/common/http'; // 👈 AÑADE ESTA LÍNEA (si no la tienes)
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(), // 👈 AÑADE ESTA LÍNEA
    provideMarkdown(), // 👈 AÑADE ESTA LÍNEA
    importProvidersFrom(FormsModule, ReactiveFormsModule)
  ]
};