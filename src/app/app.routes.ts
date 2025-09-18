import { Routes } from '@angular/router';
import { OrofacialAnalysisComponent } from './presentation/components/orofacial-analysis/orofacial-analysis.component';
import { EjerciciosOrofacialesComponent } from './ejercicios-orofaciales/ejercicios-orofaciales.component';
import { LoginComponent } from './presentation/pages/login/login.component';
import { DashboardLayoutComponent } from './presentation/layouts/dashboardLayout/dashboardLayout.component';
// 🆕 IMPORTS DE AUTENTICACIÓN
import { ForgotPasswordComponent } from './presentation/pages/forgot-password/forgot-password.component';
import { VerifyCodeComponent } from './presentation/pages/verify-code/verify-code.component';
import { ResetPasswordComponent } from './presentation/pages/reset-password/reset-password.component';
// 🆕 IMPORTS DE GUARDS
import { AuthGuard, PublicGuard } from './presentation/guards/auth.guard';

export const routes: Routes = [
  // 🔓 RUTAS PÚBLICAS (solo para usuarios NO logueados)
  {
    path: '',
    component: LoginComponent,
    canActivate: [PublicGuard]
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [PublicGuard]
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    canActivate: [PublicGuard]
  },
  {
    path: 'verify-code',
    component: VerifyCodeComponent,
    canActivate: [PublicGuard]
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    canActivate: [PublicGuard]
  },

  // 🔐 RUTAS PROTEGIDAS (requieren autenticación)
  {
    path: 'dashboard',
    loadComponent: () => 
      import('./presentation/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard],
    data: {
      icon: 'fa-solid fa-home',
      title: 'Dashboard',
      description: 'Panel principal'
    }
  },
  
  // 🔥 RUTAS CON DASHBOARDLAYOUT (CHATBOT FONOKIDS) - PROTEGIDAS
  {
    path: 'chat',
    component: DashboardLayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
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
      // Ruta por defecto cuando entras a /chat
      {
        path: '',
        redirectTo: 'orthography',
        pathMatch: 'full'
      }
    ]
  },
  
  // 🔐 RUTAS INDIVIDUALES PROTEGIDAS
  {
    path: 'ejercicios',
    component: EjerciciosOrofacialesComponent,
    canActivate: [AuthGuard],
    data: {
      icon: 'fa-solid fa-dumbbell',
      title: 'Ejercicios Orofaciales',
      description: '10 ejercicios interactivos de fonoaudiología',
    },
  },
  {
    path: 'orofacial',
    component: OrofacialAnalysisComponent,
    canActivate: [AuthGuard],
    data: {
      icon: 'fa-solid fa-face-smile',
      title: 'Análisis Orofacial',
      description: 'Análisis de movimientos faciales',
    },
  },
  {
    path: 'mi-perfil',
    loadComponent: () => import('./pages/mi-perfil/mi-perfil.component').then(m => m.MiPerfilComponent),
    canActivate: [AuthGuard]
  },
  
  // Wildcard route - redirige a login si la ruta no existe
  {
    path: '**',
    redirectTo: '/login'
  }
];