import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideMarkdown } from 'ngx-markdown';
import { provideHttpClient } from '@angular/common/http'; // ← AÑADE ESTA LÍNEA

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(), // ← AÑADE ESTA LÍNEA
    provideMarkdown(),
    importProvidersFrom(FormsModule, ReactiveFormsModule)
  ]
};