// ===== CREAR ESTOS ARCHIVOS =====

// 📁 src/app/components/faq-modal/faq-modal.component.ts
import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface FaqQuestion {
  text: string;
  description: string;
  answer: string; // ✅ AGREGAR RESPUESTA
  isExpanded?: boolean; // ✅ AGREGAR ESTADO DE EXPANSIÓN
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
export class FaqModalComponent {
  @Input() isVisible: boolean = false;
  @Output() closeModal = new EventEmitter<void>();

  selectedCategoryIndex: number = 0;

  faqCategories: FaqCategory[] = [
    {
      name: 'Análisis Orofacial',
      icon: '🎥',
      questions: [
        {
          text: '¿Qué ejercicios puedo hacer para mejorar mi pronunciación?',
          description: 'Ejercicios de articulación y praxias orofaciales',
          answer: 'Para mejorar tu pronunciación puedes realizar: **Ejercicios de praxias bucofaciales** (movimientos de labios, lengua, mejillas), **ejercicios de respiración** para controlar el flujo de aire, **repetición de sílabas y palabras** comenzando por sonidos más fáciles, **ejercicios frente al espejo** para observar los movimientos articulatorios. Es importante practicar de forma constante, comenzando con 10-15 minutos diarios.',
          isExpanded: false
        },
        {
          text: '¿Cuánto tiempo debo practicar los ejercicios al día?',
          description: 'Rutina diaria recomendada para mejores resultados',
          answer: 'La rutina ideal es **15-20 minutos diarios**, divididos en 2-3 sesiones cortas de 5-7 minutos cada una. Es mejor practicar poco tiempo pero de forma constante que hacer sesiones largas esporádicas. Para niños pequeños, 5-10 minutos es suficiente. La clave está en la **consistencia** y en hacer los ejercicios de forma correcta.',
          isExpanded: false
        },
        {
          text: '¿Cómo sé si estoy haciendo bien los ejercicios?',
          description: 'Indicadores de progreso y técnica correcta',
          answer: 'Sabrás que estás progresando cuando notes: **mayor claridad en la pronunciación**, **menos esfuerzo al hablar**, **mejor control de la respiración**, **movimientos más precisos de lengua y labios**. Es recomendable grabarte hablando para comparar tu progreso. Si tienes dudas, consulta con tu fonoaudiólogo para recibir retroalimentación profesional.',
          isExpanded: false
        },
        {
          text: '¿Qué ejercicios son buenos para la respiración?',
          description: 'Técnicas respiratorias para el habla',
          answer: 'Los ejercicios respiratorios más efectivos son: **Respiración diafragmática** (inhalar expandiendo el abdomen), **ejercicios de soplo** con pajillas, papeles o pelotas de ping pong, **control del flujo de aire** pronunciando "ssss" o "ffff" de forma prolongada, **coordinación respiración-fonación** hablando en espiración. Practica 5 minutos al día en un ambiente tranquilo.',
          isExpanded: false
        }
      ]
    },
    {
      name: 'Chatbot',
      icon: '🤖',
      questions: [
        {
          text: '¿Qué es el Chatbot FonoKids?',
          description: '¿Para qué sirve?',
          answer: 'El Chatbot FonoKids sirve como una herramienta de apoyo en fonoaudiología que facilita la práctica del lenguaje y la comunicación mediante actividades interactivas y personalizadas, brindando retroalimentación inmediata que motiva al niño y fortalece su aprendizaje. Está dirigido a niños en proceso de adquisición del lenguaje oral y escrito, así como a aquellos con dificultades específicas de comunicación, lectura o escritura, ya que promueve el desarrollo de habilidades lingüísticas de manera lúdica y accesible. Su fundamento se basa en el uso de tecnologías educativas aplicadas a la fonoaudiología, aprovechando la inteligencia artificial y la gamificación para ampliar las oportunidades de intervención temprana, reforzar los ejercicios terapéuticos y acompañar al niño más allá del espacio clínico.',
          isExpanded: false
        },
        {
          text: '¿Para qué sirve el ejercicio de Corregir Ortografia?',
          description: 'Módulo Corregir Ortografia',
          answer: 'El módulo de corrección ortográfica está dirigido a niños que inician la lectoescritura y a escolares con dislexia o disortografía, y se fundamenta en principios de intervención temprana en lectoescritura y conciencia fonológica, recomendados por la American Speech-Language-Hearing Association (ASHA), para fortalecer la relación fonema-grafema mediante práctica guiada con retroalimentación inmediata y favorecer la automatización de la lectura y la escritura.',
          isExpanded: false
        },
        {
          text: '¿Para qué sirve el ejercicio de Pros y Contras?',
          description: 'Módulo de Pros y Contras',
          answer: 'El módulo Pros y Contras de FonoKids está dirigido a escolares que necesitan fortalecer su argumentación y la claridad de su discurso, y se fundamenta en estrategias fonoaudiológicas orientadas a desarrollar la competencia pragmática y discursiva mediante la comparación de ventajas y desventajas, lo que favorece un lenguaje más crítico, reflexivo y funcional. Este enfoque se apoya en lineamientos de la American Speech-Language-Hearing Association (ASHA) sobre language intervention in school-age children, donde se destacan las actividades de comparación y contraste como estrategias para estimular la organización del lenguaje, la coherencia y el pensamiento crítico en contextos de intervención fonoaudiológica.'
        },
        {
          text: '¿Para qué sirve el ejercicio de Traducir Idiomas?',
          description: 'Módulo de Traducir Idiomas',
          answer: 'La fatiga vocal puede deberse a: **tensión excesiva en las cuerdas vocales**, **mala postura al hablar**, **respiración inadecuada**, **hablar en ambientes ruidosos**, **deshidratación**. Para prevenirla: mantén buena postura, hidrátate bien, evita carraspear, usa tu voz de forma eficiente sin gritar. Si persiste, consulta con un especialista para descartar lesiones.',
          isExpanded: false
        }
      ]
    },
    {
      name: 'Desarrollo',
      icon: '💻',
      questions: [
        {
          text: '¿A qué edad debería hablar mi hijo?',
          description: 'Hitos del desarrollo del lenguaje',
          answer: 'Los hitos típicos son: **12 meses**: primeras palabras, **18 meses**: 10-20 palabras, **24 meses**: frases de 2 palabras, **36 meses**: oraciones simples y vocabulario de 200-300 palabras, **48 meses**: habla comprensible para extraños. Recuerda que cada niño es único y puede haber variaciones normales. Si tienes preocupaciones, consulta con un pediatra o fonoaudiólogo.',
          isExpanded: false
        },
        {
          text: 'Mi bebé no dice palabras aún, ¿debo preocuparme?',
          description: 'Señales de alerta en el desarrollo',
          answer: 'Consulta si a los **12 meses** no dice ninguna palabra, a los **18 meses** tiene menos de 10 palabras, a los **24 meses** no hace frases de 2 palabras, o si **pierde habilidades** ya adquiridas. Sin embargo, algunos niños son **habladores tardíos** pero normales. La **comprensión** es tan importante como la expresión. Una evaluación profesional puede darte tranquilidad.',
          isExpanded: false
        },
        {
          text: '¿Cómo puedo estimular el lenguaje de mi hijo?',
          description: 'Actividades para fomentar la comunicación',
          answer: 'Para estimular el lenguaje: **lee cuentos diariamente**, **canta canciones**, **describe lo que haces** ("ahora vamos a bañarnos"), **repite y amplía** lo que dice tu hijo, **juega con sonidos**, **limita el tiempo de pantallas**, **responde a sus intentos de comunicación**. La **interacción cara a cara** es fundamental. Haz del lenguaje algo divertido y natural.',
          isExpanded: false
        },
        {
          text: '¿Es normal que mi hijo de 3 años hable poco?',
          description: 'Variaciones normales en el desarrollo',
          answer: 'A los 3 años, un niño típicamente debería: **usar oraciones de 3-4 palabras**, **tener un vocabulario de 300+ palabras**, **ser entendido por extraños la mayor parte del tiempo**. Si tu hijo habla poco pero **comprende bien**, **interactúa socialmente** y **muestra interés en comunicarse**, puede ser su personalidad. Sin embargo, es recomendable una evaluación para descartar problemas y recibir estrategias específicas.',
          isExpanded: false
        }
      ]
    },
    {
      name: 'Terapia',
      icon: '👩‍⚕️',
      questions: [
        {
          text: '¿Cuándo necesito ir al fonoaudiólogo?',
          description: 'Indicaciones para consultar un especialista',
          answer: 'Consulta un fonoaudiólogo si experimentas: **dificultades persistentes de pronunciación**, **problemas de voz** (ronquera, fatiga), **tartamudez** que interfiere con la comunicación, **retraso del lenguaje** en niños, **dificultades de deglución**, **pérdida auditiva**, o si **otras personas tienen dificultad para entenderte**. También para **prevención** y **mejora del rendimiento vocal** en profesionales de la voz.',
          isExpanded: false
        },
        {
          text: '¿Cuánto dura un tratamiento fonoaudiológico?',
          description: 'Tiempo estimado según el tipo de problema',
          answer: 'La duración varía según el problema: **problemas articulatorios simples**: 3-6 meses, **retraso del lenguaje**: 6-12 meses o más, **tartamudez**: proceso a largo plazo, **problemas de voz**: 2-4 meses con cambios de hábitos. La **constancia en la terapia** y **práctica en casa** aceleran el progreso. Cada caso es único y requiere evaluación individualizada.',
          isExpanded: false
        },
        {
          text: '¿Qué esperar en la primera consulta?',
          description: 'Proceso de evaluación inicial',
          answer: 'En la primera consulta se realizará: **entrevista sobre el historial** médico y del desarrollo, **evaluación del habla y lenguaje**, **pruebas específicas** según la edad, **observación de la interacción**, **revisión de estructuras orales**. Se explicará el **plan de tratamiento**, **objetivos** y **frecuencia de sesiones**. Es importante traer **informes médicos** previos y **preguntas** que tengas.',
          isExpanded: false
        },
        {
          text: '¿Los ejercicios funcionan en adultos también?',
          description: 'Efectividad del tratamiento en diferentes edades',
          answer: 'Sí, la terapia fonoaudiológica es **efectiva a cualquier edad**. Los adultos pueden mejorar: **problemas de pronunciación**, **calidad de voz**, **fluidez del habla**, **problemas de deglución**. Aunque puede tomar más tiempo que en niños debido a patrones más establecidos, la **motivación** y **constancia** del adulto suelen ser ventajas importantes para el éxito del tratamiento.',
          isExpanded: false
        }
      ]
    },
    {
      name: 'General',
      icon: '💡',
      questions: [
        {
          text: '¿Qué es la fonoaudiología exactamente?',
          description: 'Definición y alcance de la profesión',
          answer: 'La fonoaudiología es la disciplina que se encarga del **estudio, prevención, evaluación y tratamiento** de los trastornos de la comunicación humana. Abarca: **problemas del habla y lenguaje**, **trastornos de la voz**, **dificultades auditivas**, **problemas de deglución**, **trastornos cognitivos** relacionados con la comunicación. Los fonoaudiólogos trabajan con personas de todas las edades para mejorar su capacidad de comunicación.',
          isExpanded: false
        },
        {
          text: '¿Cómo puedo cuidar mi voz?',
          description: 'Higiene vocal y prevención de problemas',
          answer: 'Para cuidar tu voz: **mantente hidratado** (beber agua), **evita gritar o susurrar**, **no carraspees** constantemente, **descansa la voz** cuando esté fatigada, **evita ambientes muy secos**, **no fumes**, **controla el reflujo** si lo tienes. **Calienta la voz** antes de usarla intensivamente y **enfríala** después. Si trabajas con tu voz, considera técnicas profesionales de uso vocal.',
          isExpanded: false
        },
        {
          text: '¿La alimentación afecta el habla?',
          description: 'Relación entre deglución y articulación',
          answer: 'Sí, la alimentación influye en el desarrollo del habla. Los **músculos utilizados para comer** son los mismos del habla. Una **deglución correcta** fortalece músculos necesarios para la articulación. **Problemas alimentarios** en bebés pueden asociarse con dificultades posteriores del habla. Texturas variadas, **masticación bilateral** y **hábitos alimentarios adecuados** favorecen el desarrollo de las estructuras orales necesarias para hablar.',
          isExpanded: false
        },
        {
          text: '¿Puedo hacer ejercicios en casa?',
          description: 'Terapia domiciliaria y recomendaciones',
          answer: 'Sí, muchos ejercicios se pueden hacer en casa: **praxias orofaciales**, **ejercicios respiratorios**, **práctica de sonidos**, **lectura en voz alta**, **juegos de lenguaje**. Sin embargo, es importante tener **supervisión profesional** inicial para aprender la técnica correcta. Los ejercicios caseros **complementan** pero no reemplazan la terapia profesional. La **constancia diaria** en casa es clave para el éxito del tratamiento.',
          isExpanded: false
        }
      ]
    }
  ];

  constructor(private router: Router) {}

  selectCategory(index: number) {
    this.selectedCategoryIndex = index;
  }

  getSelectedQuestions(): FaqQuestion[] {
    return this.faqCategories[this.selectedCategoryIndex]?.questions || [];
  }

  selectQuestion(question: FaqQuestion) {
    // ✅ CAMBIAR: Solo expandir/contraer la pregunta
    question.isExpanded = !question.isExpanded;
    console.log('Pregunta expandida/contraída:', question.text);
  }

  // ✅ NUEVO MÉTODO: Para enviar pregunta al chat
  sendQuestionToChat(question: FaqQuestion) {
    console.log('Enviando pregunta al chat:', question.text);
    
    // Cerrar el modal
    this.onClose();
    
    // Redirigir al chat con la pregunta
    this.router.navigate(['/chat/assistant'], {
      queryParams: { question: question.text }
    });
  }

  openFreeChat() {
    console.log('Abriendo chat libre');
    
    // Cerrar el modal
    this.onClose();
    
    // Redirigir al chat sin pregunta predefinida
    this.router.navigate(['/chat/assistant']);
  }

  onClose() {
    document.body.style.overflow = 'auto'; // Restaurar scroll
    this.closeModal.emit();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.isVisible) {
      this.onClose();
    }
  }

  ngOnInit() {
    if (this.isVisible) {
      document.body.style.overflow = 'hidden'; // Prevenir scroll del fondo
    }
  }

  ngOnChanges() {
    if (this.isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }
}