import { Routes } from '@angular/router';
import { OrofacialAnalysisComponent } from './presentation/components/orofacial-analysis/orofacial-analysis.component';
import { EjerciciosOrofacialesComponent } from './ejercicios-orofaciales/ejercicios-orofaciales.component';
import { LoginComponent } from './presentation/pages/login/login.component';
import { DashboardLayoutComponent } from './presentation/layouts/dashboardLayout/dashboardLayout.component';
// IMPORTS DE AUTENTICACIÓN
import { ForgotPasswordComponent } from './presentation/pages/forgot-password/forgot-password.component';
import { VerifyCodeComponent } from './presentation/pages/verify-code/verify-code.component';
import { ResetPasswordComponent } from './presentation/pages/reset-password/reset-password.component';
// IMPORTS DE GUARDS
import { AuthGuard, PublicGuard } from './presentation/guards/auth.guard';
// IMPORT DEL NUEVO COMPONENTE DE JUEGOS
import { JuegosTerapeuticosComponent } from './presentation/pages/juegos-terapeuticos/juegos-terapeuticos.component';
import { ArmaCaraGameComponent } from './presentation/pages/arma-cara-game.component/arma-cara-game.component';
import { SoploVirtualGameComponent } from './presentation/pages/soplo-virtual-game/soplo-virtual-game';
import { MemoriaGestosGameComponent } from './presentation/pages/memoria-gestos-game/memoria-gestos-name';
import { AtrapaLenguaGameComponent } from './presentation/pages/atrapa-lengua-game/atrapa-lengua-game.component';
import { PuzzleMovimientosGameComponent } from './presentation/pages/puzzle-movimientos-game/puzzle-movimientos-game.component';
import { RitmoSilabasGameComponent } from './presentation/pages/ritmo-silabas-game/ritmo-silabas-game.component';
import { RuletaPraxiasComponent } from './presentation/pages/RuletaPraxiasComponent/ruleta-praxiascomponent';
// ========== IMPORTS DE NUEVOS JUEGOS MANDIBULARES ==========
import { SonidosDivertidosComponent } from './presentation/pages/SonidosDivertidos/sonidos-divertidos.component';
import { ParejasSilabasComponent } from './presentation/pages/ParejasSilabas/parejas-silabas.component';

export const routes: Routes = [
  // RUTAS PÚBLICAS (solo para usuarios NO logueados)
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

  // RUTAS PROTEGIDAS (requieren autenticación)
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
  
  // RUTAS CON DASHBOARDLAYOUT (CHATBOT FONOKIDS) - PROTEGIDAS
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
          icon: 'fa-solid fa-microphone',
          title: 'Evaluar Pronunciación',
          description: 'Graba tu voz y evalúa tu pronunciación',
        },
      },
      // ========== RUTAS COMENTADAS (NO APARECEN EN MENÚ) ==========
      // {
      //   path: 'image-generation',
      //   loadComponent: () =>
      //     import('./presentation/pages/imageGenerationPage/imageGenerationPage.component'),
      //   data: {
      //     icon: 'fa-solid fa-image',
      //     title: 'Imágenes',
      //     description: 'Generar imágenes',
      //   },
      // },
      // {
      //   path: 'image-tunning',
      //   loadComponent: () =>
      //     import('./presentation/pages/imageTunningPage/imageTunningPage.component'),
      //   data: {
      //     icon: 'fa-solid fa-wand-magic',
      //     title: 'Editar imagen',
      //     description: 'Generación continua',
      //   },
      // },
      // ========== FIN RUTAS COMENTADAS ==========
      
      // ========== RUTA DE ASSISTANT PARA EL DASHBOARD (sin icono destacado) ==========
      {
        path: 'assistant',
        loadComponent: () =>
          import('./presentation/pages/assistantPage/assistantPage.component'),
      },
      {
        path: 'assistant-page',
        loadComponent: () =>
          import('./presentation/pages/assistantPage/assistantPage.component'),
        data: {
          icon: 'fa-solid fa-robot',
          title: 'FonoBot',
          description: 'Asistente de Fonoaudiología',
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
  
  // RUTAS INDIVIDUALES PROTEGIDAS
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
  // NUEVA RUTA PARA JUEGOS TERAPÉUTICOS
  {
    path: 'juegos-terapeuticos',
    component: JuegosTerapeuticosComponent,
    canActivate: [AuthGuard],
    data: {
      icon: 'fa-solid fa-gamepad',
      title: 'Juegos Terapéuticos',
      description: 'Juegos interactivos para fortalecer la musculatura orofacial',
    },
  },
  // RUTA PARA EL JUEGO ARMA LA CARA
  {
    path: 'juego/labiales/arma-cara-labiales',
    component: ArmaCaraGameComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Arma la Cara - Labiales',
      description: 'Juego de drag & drop para ejercicios labiales',
    },
  },
  // RUTA PARA EL JUEGO MEMORIA DE GESTOS
  {
    path: 'juego/labiales/memoria-gestos-labiales',
    component: MemoriaGestosGameComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Memoria de Gestos - Labiales',
      description: 'Juego de memoria para ejercicios labiales',
    },
  },
  // RUTA PARA EL JUEGO SOPLO VIRTUAL
  {
    path: 'juego/labiales/soplo-virtual',
    component: SoploVirtualGameComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Soplo Virtual - Labiales',
      description: 'Juego de soplo para ejercicios respiratorios',
    },
  },
  // RUTAS DE JUEGOS LINGUALES
  {
    path: 'juego/linguales/atrapa-lengua',
    component: AtrapaLenguaGameComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Atrapa la Lengua - Linguales',
      description: 'Juego de reacción para ejercicios linguales',
    },
  },
  {
    path: 'juego/linguales/puzzle-movimientos',
    component: PuzzleMovimientosGameComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Puzzle de Movimientos - Linguales',
      description: 'Juego de secuenciación para ejercicios linguales'
    },
  },
  {
    path: 'juego/linguales/ritmo-silabas',
    component: RitmoSilabasGameComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Ritmo de Sílabas - Linguales',
      description: 'Juego de ritmo para coordinación lingüística'
    },
  },
  // ========== NUEVA RUTA PARA REPITE EL SONIDO ==========
  {
    path: 'juego/audio/repite-sonido',
    loadComponent: () => 
      import('./presentation/pages/repite-sonido-game/repite-sonido-game.component')
        .then(m => m.RepiteSonidoGameComponent),
    canActivate: [AuthGuard],
    data: {
      title: 'Repite el Sonido',
      description: 'Juego de pronunciación con IA'
    },
  },
  // RUTA PARA LA RULETA DE PRAXIAS
  {
    path: 'ruleta-praxias',
    component: RuletaPraxiasComponent,
    canActivate: [AuthGuard],
    data: {
      icon: 'fa-solid fa-dice',
      title: 'Ruleta de Praxias',
      description: 'Ruleta interactiva con IA para ejercicios de praxias orofaciales',
    },
  },
  
  // ========== RUTAS DE NUEVOS JUEGOS MANDIBULARES ==========
  {
    path: 'sonidos-divertidos',
    component: SonidosDivertidosComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Sonidos Divertidos',
      description: 'Practica onomatopeyas divertidas con animales y objetos'
    },
  },
  {
    path: 'parejas-silabas',
    component: ParejasSilabasComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Parejas de Sílabas',
      description: 'Arrastra las sílabas correctas hacia sus imágenes'
    },
  },
  
  // RUTA DE PERFIL DE USUARIO
  {
    path: 'mi-perfil',
    loadComponent: () => import('./pages/mi-perfil/mi-perfil.component').then(m => m.MiPerfilComponent),
    canActivate: [AuthGuard]
  },

  // WILDCARD ROUTE - DEBE SER SIEMPRE LA ÚLTIMA RUTA
  {
    path: '**',
    redirectTo: '/login'
  }
];