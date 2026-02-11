import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface FaqQuestion {
  text: string;
  description: string;
  answer: string;
  isExpanded: boolean;
}

interface FaqCategory {
  name: string;
  icon: string;
  questions: FaqQuestion[];
}

@Component({
  selector: 'app-faq-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq-modal.component.html',
  styleUrls: ['./faq-modal.component.css']
})
export class FaqModalComponent implements OnInit, OnChanges {
  @Input() isVisible: boolean = false;
  @Output() closeModal = new EventEmitter<void>();

  selectedCategoryIndex: number = 0;

  faqCategories: FaqCategory[] = [
    {
      name: 'Mis Actividades',
      icon: '📅',
      questions: [
        {
          text: '¿Qué puedo ver en "Mis Actividades"?',
          description: 'Historial y seguimiento de tu progreso',
          answer: 'En Mis Actividades puedes ver un registro completo de todos los ejercicios y juegos que has realizado. Incluye fecha y hora de cada sesión, tipo de ejercicio practicado, resultados obtenidos y tu progreso general.',
          isExpanded: false
        },
        {
          text: '¿Cómo se registra mi progreso?',
          description: 'Sistema de seguimiento automático',
          answer: 'Tu progreso se registra automáticamente cada vez que completas un ejercicio o juego. El sistema guarda qué ejercicios hiciste, cuántas veces los practicaste y cuánto tiempo dedicaste.',
          isExpanded: false
        },
        {
          text: '¿Puedo ver ejercicios de días anteriores?',
          description: 'Acceso al historial completo',
          answer: 'Sí, puedes ver todo tu historial de actividades. Puedes revisar qué ejercicios hiciste ayer, la semana pasada o en cualquier momento.',
          isExpanded: false
        },
        {
          text: '¿El progreso se reinicia cada día?',
          description: 'Persistencia de datos',
          answer: 'El progreso diario se reinicia cada día para motivarte a practicar nuevamente. Sin embargo, tu historial completo se guarda permanentemente.',
          isExpanded: false
        }
      ]
    },
    {
      name: 'Ejercicios',
      icon: '🎥',
      questions: [
        {
          text: '¿Qué son las praxias orofaciales?',
          description: 'Ejercicios para fortalecer los músculos del habla',
          answer: 'Las praxias orofaciales son ejercicios que fortalecen y coordinan los músculos de la boca, lengua y cara. FonoKids incluye 17 ejercicios: 7 linguales, 6 labiales y 4 mandibulares.',
          isExpanded: false
        },
        {
          text: '¿Cómo funciona la detección facial?',
          description: 'Tecnología de reconocimiento de movimientos',
          answer: 'FonoKids usa inteligencia artificial con MediaPipe Face Mesh que detecta 468 puntos en tu cara en tiempo real para guiarte en los ejercicios.',
          isExpanded: false
        },
        {
          text: '¿Necesito cámara para los ejercicios?',
          description: 'Requisitos técnicos',
          answer: 'Sí, necesitas una cámara web o la cámara de tu dispositivo para que el sistema pueda ver tus movimientos y darte retroalimentación.',
          isExpanded: false
        },
        {
          text: '¿Qué tipos de ejercicios puedo practicar?',
          description: 'Categorías de praxias disponibles',
          answer: 'Puedes practicar Praxias Linguales (lengua), Praxias Labiales (labios) y Praxias Mandibulares (mandíbula). Cada uno trabaja músculos diferentes.',
          isExpanded: false
        },
        {
          text: '¿Cómo sé si hago bien el ejercicio?',
          description: 'Sistema de retroalimentación',
          answer: 'El sistema te da retroalimentación inmediata con mensajes motivacionales. No hay puntuaciones negativas, solo motivación positiva.',
          isExpanded: false
        }
      ]
    },
    {
      name: 'Juegos',
      icon: '🎮',
      questions: [
        {
          text: '¿Cuántos juegos hay disponibles?',
          description: 'Catálogo de juegos terapéuticos',
          answer: 'FonoKids tiene 8 juegos terapéuticos diseñados para fortalecer los músculos de tu boca mientras te diviertes.',
          isExpanded: false
        },
        {
          text: '¿Los juegos tienen puntuación o vidas?',
          description: 'Sistema sin presión',
          answer: '¡No! Los juegos están diseñados sin puntuaciones, sin vidas y sin tiempo límite para que practiques sin estrés.',
          isExpanded: false
        },
        {
          text: '¿Qué habilidades trabajan los juegos?',
          description: 'Beneficios terapéuticos',
          answer: 'Los juegos trabajan control del soplo, fuerza de labios, coordinación de lengua, movimientos mandibulares y reconocimiento de voz.',
          isExpanded: false
        },
        {
          text: '¿Puedo jugar sin límite de tiempo?',
          description: 'Libertad para practicar',
          answer: 'Sí, puedes jugar todo el tiempo que quieras. No hay cronómetros ni límites que te presionen.',
          isExpanded: false
        },
        {
          text: '¿Los juegos también usan la cámara?',
          description: 'Tecnología en los juegos',
          answer: 'Sí, la mayoría de los juegos usan la cámara para detectar tus movimientos faciales y hacerlos interactivos.',
          isExpanded: false
        }
      ]
    },
    {
      name: 'FonoBot IA',
      icon: '🤖',
      questions: [
        {
          text: '¿Qué es FonoBot?',
          description: 'Tu asistente de inteligencia artificial',
          answer: 'FonoBot es un asistente virtual con IA diseñado para ayudarte con dudas sobre fonoaudiología. Es como tener un ayudante disponible 24/7.',
          isExpanded: false
        },
        {
          text: '¿Qué puedo preguntarle a FonoBot?',
          description: 'Temas que puede ayudarte',
          answer: 'Puedes preguntarle sobre ejercicios de pronunciación, técnicas de respiración, cómo hacer las praxias y consejos para practicar.',
          isExpanded: false
        },
        {
          text: '¿FonoBot puede corregir mi ortografía?',
          description: 'Módulo de corrección ortográfica',
          answer: 'Sí, FonoBot tiene un módulo de corrección ortográfica que te ayuda a identificar y corregir errores de escritura.',
          isExpanded: false
        },
        {
          text: '¿Puedo hablar con FonoBot por voz?',
          description: 'Reconocimiento de voz',
          answer: 'Sí, FonoBot tiene reconocimiento de voz. Puedes hablarle en lugar de escribir.',
          isExpanded: false
        },
        {
          text: '¿FonoBot reemplaza al fonoaudiólogo?',
          description: 'Rol del asistente virtual',
          answer: 'No, FonoBot es una herramienta de apoyo. El diagnóstico y tratamiento siempre deben ser supervisados por un profesional.',
          isExpanded: false
        }
      ]
    },
    {
      name: 'Guía Padres',
      icon: '👨‍👩‍👧',
      questions: [
        {
          text: '¿Qué información hay en la Guía?',
          description: 'Contenido para tutores y familia',
          answer: 'La Guía incluye información sobre la terapia, cómo apoyar a tu hijo en casa, explicación de los ejercicios y consejos para motivar la práctica.',
          isExpanded: false
        },
        {
          text: '¿Cómo puedo apoyar a mi hijo en casa?',
          description: 'Participación familiar en la terapia',
          answer: 'Puedes apoyar practicando los ejercicios juntos, creando una rutina diaria de 15-20 minutos y celebrando sus logros sin presionarlo.',
          isExpanded: false
        },
        {
          text: '¿Puedo ver el progreso de mi hijo?',
          description: 'Seguimiento para padres',
          answer: 'Sí, en Mis Actividades puedes ver el historial completo de ejercicios realizados y el progreso general.',
          isExpanded: false
        },
        {
          text: '¿Cuánto tiempo debe practicar al día?',
          description: 'Rutina recomendada',
          answer: 'La rutina ideal es de 15-20 minutos diarios. Lo más importante es la constancia: practicar poco tiempo todos los días.',
          isExpanded: false
        },
        {
          text: '¿Qué hago si no quiere practicar?',
          description: 'Motivación y estrategias',
          answer: 'No lo fuerces, intenta hacer los ejercicios como un juego, usa los juegos terapéuticos y celebra cada pequeño logro.',
          isExpanded: false
        }
      ]
    },
    {
      name: 'General',
      icon: '💡',
      questions: [
        {
          text: '¿Qué es FonoKids?',
          description: 'Sobre la plataforma',
          answer: 'FonoKids es una plataforma web de rehabilitación orofacial pediátrica con IA, detección facial y gamificación.',
          isExpanded: false
        },
        {
          text: '¿Para quién está diseñado?',
          description: 'Usuarios de la plataforma',
          answer: 'Está diseñado para niños en terapia fonoaudiológica que necesitan practicar ejercicios de habla en casa.',
          isExpanded: false
        },
        {
          text: '¿Necesito internet?',
          description: 'Requisitos de conexión',
          answer: 'Sí, necesitas conexión a internet. La detección facial se procesa localmente para mayor rapidez.',
          isExpanded: false
        },
        {
          text: '¿Es seguro para los niños?',
          description: 'Seguridad y privacidad',
          answer: 'Sí, no hay publicidad, no se comparten datos con terceros y todo el contenido es apropiado para niños.',
          isExpanded: false
        },
        {
          text: '¿Funciona en celular o tablet?',
          description: 'Dispositivos compatibles',
          answer: 'Sí, funciona en computadoras, tablets y celulares con cámara. Recomendamos tablet o computadora para mejor experiencia.',
          isExpanded: false
        }
      ]
    }
  ];

  constructor(private router: Router) {}

  selectCategory(index: number): void {
    this.selectedCategoryIndex = index;
    // Cerrar todas las preguntas
    this.faqCategories.forEach(cat => {
      cat.questions.forEach(q => q.isExpanded = false);
    });
  }

  getSelectedQuestions(): FaqQuestion[] {
    return this.faqCategories[this.selectedCategoryIndex]?.questions || [];
  }

  selectQuestion(question: FaqQuestion): void {
    // Toggle la pregunta clickeada
    question.isExpanded = !question.isExpanded;
    console.log('Pregunta expandida:', question.text, '| Estado:', question.isExpanded);
  }

  sendQuestionToChat(question: FaqQuestion): void {
    this.onClose();
    this.router.navigate(['/chat/assistant-page'], {
      queryParams: { question: question.text }
    });
  }

  openFreeChat(): void {
    this.onClose();
    this.router.navigate(['/chat/assistant-page']);
  }

  onClose(): void {
    document.body.style.overflow = 'auto';
    this.closeModal.emit();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isVisible) {
      this.onClose();
    }
  }

  ngOnInit(): void {
    if (this.isVisible) {
      document.body.style.overflow = 'hidden';
    }
  }

  ngOnChanges(): void {
    if (this.isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }
}