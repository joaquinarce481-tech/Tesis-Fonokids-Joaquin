import { Routes } from '@angular/router';
import { OrofacialAnalysisComponent } from './presentation/components/orofacial-analysis/orofacial-analysis.component';
import { EjerciciosOrofacialesComponent } from './ejercicios-orofaciales/ejercicios-orofaciales.component';
import { LoginComponent } from './presentation/pages/login/login.component';
import { DashboardLayoutComponent } from './presentation/layouts/dashboardLayout/dashboardLayout.component';

export const routes: Routes = [
  // Ruta principal - mostrar login primero
  {
    path: '',
    component: LoginComponent
  },
  // Ruta específica para login
  {
    path: 'login',
    component: LoginComponent
  },
  // Dashboard directo sin layout
  {
    path: 'dashboard',
    loadComponent: () => 
      import('./presentation/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    data: {
      icon: 'fa-solid fa-home',
      title: 'Dashboard',
      description: 'Panel principal'
    }
  },
  // 🔥 RUTAS CON DASHBOARDLAYOUT (CHATBOT FONOKIDS)
  {
    path: 'chat',  // 🔥 CAMBIÉ DE '' a 'chat'
    component: DashboardLayoutComponent,
    children: [
      {
        path: 'orthography',
        loadComponent: () =>
          import('./presentation/pages/orthographyPage/orthographyPage.component'),
        data: {
          icon: 'fa-solid fa-spell-check',
          title: 'Ortografía',
          description: 'Corregir ortografía',
        },
      },
      {
        path: 'pros-cons-stream',
        loadComponent: () =>
          import('./presentation/pages/prosConsStreamPage/prosConsStreamPage.component'),
        data: {
          icon: 'fa-solid fa-water',
          title: 'Pros & Contras',
          description: 'Compara Pros y Contras',
        },
      },
      {
        path: 'translate',
        loadComponent: () =>
          import('./presentation/pages/translatePage/translatePage.component'),
        data: {
          icon: 'fa-solid fa-language',
          title: 'Traducir',
          description: 'Textos a otros idiomas',
        },
      },
      {
        path: 'text-to-audio',
        loadComponent: () =>
          import('./presentation/pages/textToAudioPage/textToAudioPage.component'),
        data: {
          icon: 'fa-solid fa-podcast',
          title: 'Texto a audio',
          description: 'Convertir texto a audio',
        },
      },
      {
        path: 'audio-to-text',
        loadComponent: () =>
          import('./presentation/pages/audioToTextPage/audioToTextPage.component'),
        data: {
          icon: 'fa-solid fa-comment-dots',
          title: 'Audio a texto',
          description: 'Convertir audio a texto',
        },
      },
      {
        path: 'image-generation',
        loadComponent: () =>
          import('./presentation/pages/imageGenerationPage/imageGenerationPage.component'),
        data: {
          icon: 'fa-solid fa-image',
          title: 'Imágenes',
          description: 'Generar imágenes',
        },
      },
      {
        path: 'image-tunning',
        loadComponent: () =>
          import('./presentation/pages/imageTunningPage/imageTunningPage.component'),
        data: {
          icon: 'fa-solid fa-wand-magic',
          title: 'Editar imagen',
          description: 'Generación continua',
        },
      },
      {
        path: 'assistant',
        loadComponent: () =>
          import('./presentation/pages/assistantPage/assistantPage.component'),
        data: {
          icon: 'fa-solid fa-user',
          title: 'Asistente',
          description: 'Información del asistente',
        },
      },
      // 🔥 RUTA POR DEFECTO CUANDO ENTRAS A /chat - CAMBIADO A ORTHOGRAPHY
      {
        path: '',
        redirectTo: 'orthography',  // 👈 CAMBIADO DE 'assistant' A 'orthography'
        pathMatch: 'full'
      }
    ]
  },
  // Rutas individuales sin layout
  {
    path: 'ejercicios',
    component: EjerciciosOrofacialesComponent,
    data: {
      icon: 'fa-solid fa-dumbbell',
      title: 'Ejercicios Orofaciales',
      description: '10 ejercicios interactivos de fonoaudiología',
    },
  },
  {
    path: 'orofacial',
    component: OrofacialAnalysisComponent,
    data: {
      icon: 'fa-solid fa-face-smile',
      title: 'Análisis Orofacial',
      description: 'Análisis de movimientos faciales',
    },
  },
  // Wildcard route - redirige a login si la ruta no existe
  {
    path: '**',
    redirectTo: '/login'
  }
];