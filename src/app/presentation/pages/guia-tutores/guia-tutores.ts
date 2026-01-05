import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

type VistaActual = 'home' | 'entendiendo-terapia' | 'ayudar-casa' | 'guia-ejercicios' | 'senales-progreso' | 'preguntas-frecuentes';

interface Categoria {
  id: VistaActual;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  icono: string;
  color: string;
  imagen: string;
}

@Component({
  selector: 'app-guia-tutores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guia-tutores.html',
  styleUrls: ['./guia-tutores.css']
})
export class GuiaTutoresComponent implements OnInit {
  
  vistaActual: VistaActual = 'home';
  itemExpandido: string | null = null;

  categorias: Categoria[] = [
    {
      id: 'entendiendo-terapia',
      titulo: 'Entendiendo la Terapia',
      subtitulo: 'Fundamentos esenciales',
      descripcion: 'Aprende sobre los ejercicios orofaciales y su importancia en el desarrollo del habla',
      icono: '🧠',
      color: 'from-blue-400 to-blue-600',
      imagen: 'assets/images/LaTarea.png'
    },
    {
      id: 'ayudar-casa',
      titulo: 'Cómo Ayudar en Casa',
      subtitulo: 'Guía práctica para padres',
      descripcion: 'Estrategias efectivas para crear un ambiente de práctica positivo y motivador',
      icono: '🏠',
      color: 'from-green-400 to-green-600',
      imagen: 'assets/images/AyudaCasa.png'
    },
    {
      id: 'guia-ejercicios',
      titulo: 'Guía de Ejercicios',
      subtitulo: 'Ejercicios detallados',
      descripcion: 'Conoce en profundidad los 17 ejercicios y cómo verificar su correcta ejecución',
      icono: '📚',
      color: 'from-purple-400 to-purple-600',
      imagen: 'assets/images/GuiaEjercicios.png'
    },
    {
      id: 'senales-progreso',
      titulo: 'Señales de Progreso',
      subtitulo: 'Monitoreo y seguimiento',
      descripcion: 'Identifica los indicadores de mejora en el desarrollo del habla y comunicación',
      icono: '📈',
      color: 'from-orange-400 to-orange-600',
      imagen: 'assets/images/Progreso.png'
    },
    {
      id: 'preguntas-frecuentes',
      titulo: 'Preguntas Frecuentes',
      subtitulo: 'Respuestas rápidas',
      descripcion: 'Encuentra soluciones a las dudas más comunes sobre la terapia y la aplicación',
      icono: '❓',
      color: 'from-pink-400 to-pink-600',
      imagen: 'assets/images/Preguntas.png'
    }
  ];

  // Contenido de Entendiendo la Terapia
  articulosTerapia = [
    {
      id: 'que-son',
      titulo: '¿Qué son los ejercicios orofaciales?',
      icono: '🎯',
      contenido: [
        'Los ejercicios orofaciales son movimientos específicos que trabajan los músculos de la boca, lengua, labios y mandíbula.',
        'Estos ejercicios ayudan a mejorar la fuerza, coordinación y movilidad de los órganos del habla.',
        'Son una herramienta fundamental en la terapia de fonoaudiología para niños con dificultades en el habla, deglución o articulación.',
        'Al practicarlos regularmente, los niños desarrollan mejor control sobre sus movimientos orales, lo que facilita una comunicación más clara.'
      ]
    },
    {
      id: 'importancia',
      titulo: 'Importancia de la práctica diaria',
      icono: '📅',
      contenido: [
        'La constancia es clave en la terapia de habla. Practicar diariamente ayuda a crear memoria muscular.',
        'Se recomienda realizar los ejercicios al menos 3 veces al día para ver resultados significativos.',
        'Cada sesión de práctica no necesita ser larga - 5 a 10 minutos son suficientes si se hace con regularidad.',
        'Es mejor practicar poco tiempo todos los días que hacer sesiones largas esporádicamente.'
      ]
    },
    {
      id: 'categorias',
      titulo: 'Categorías de ejercicios en FonoKids',
      icono: '🏷️',
      contenido: [
        'FonoKids incluye 17 ejercicios orofaciales distribuidos en tres categorías:',
        '👄 Ejercicios Labiales (6): Trabajan los labios para mejorar pronunciación de sonidos como B, P, M.',
        '👅 Ejercicios Linguales (7): Fortalecen la lengua para sonidos como L, R, T, D, N.',
        '🦷 Ejercicios Mandibulares (4): Mejoran la apertura bucal y movimientos de la mandíbula.',
        'Cada ejercicio está detectado por tecnología de visión por computadora para verificar su correcta ejecución.'
      ]
    },
    {
      id: 'resultados',
      titulo: '¿Qué resultados esperar?',
      icono: '⏰',
      contenido: [
        'Los primeros cambios suelen notarse después de 2-4 semanas de práctica constante.',
        'Mejoras significativas generalmente aparecen entre los 2 y 3 meses de terapia regular.',
        'Cada niño progresa a su propio ritmo - la paciencia es fundamental.',
        'Es normal tener días buenos y días difíciles - lo importante es no rendirse.'
      ]
    },
    {
      id: 'tecnologia',
      titulo: 'Tecnología de detección facial',
      icono: '🔬',
      contenido: [
        'FonoKids utiliza MediaPipe Face Mesh para detectar 468 puntos del rostro en tiempo real.',
        'La detección funciona solo con la cámara web - no requiere equipos especiales.',
        'Todo el procesamiento se hace localmente en tu dispositivo - la privacidad está garantizada.',
        'La retroalimentación visual ayuda a los niños a entender si están haciendo el ejercicio correctamente.'
      ]
    }
  ];

  // Contenido de Cómo Ayudar en Casa
  consejosCasa = [
    {
      id: 'ambiente',
      titulo: 'Crear un ambiente de práctica positivo',
      icono: '🏠',
      tips: [
        'Elige un lugar tranquilo sin distracciones (TV apagada, juguetes guardados)',
        'Asegúrate de tener buena iluminación natural o artificial',
        'Ten un espejo grande donde el niño pueda verse mientras practica',
        'Coloca la tablet o computadora con FonoKids lista para usar',
        'Mantén el espacio ordenado y dedicado exclusivamente a la práctica',
        'Considera tener una silla cómoda a la altura adecuada para el niño'
      ]
    },
    {
      id: 'rutina',
      titulo: 'Establecer rutinas diarias',
      icono: '⏰',
      tips: [
        'Establece horarios fijos (ejemplo: después del desayuno, después de la escuela, antes de dormir)',
        'Lo ideal son 3 sesiones diarias de 5-10 minutos cada una',
        'Usa alarmas o recordatorios en el celular para no olvidar',
        'Crea una tabla visual con stickers para que el niño vea su progreso',
        'Sé flexible pero consistente - si un día no se puede, recupera al día siguiente',
        'Celebra cuando se complete la rutina semanal con una actividad especial'
      ]
    },
    {
      id: 'motivacion',
      titulo: 'Técnicas de motivación efectiva',
      icono: '⭐',
      tips: [
        'Usa refuerzos positivos: "¡Qué bien moviste la lengua!", "¡Cada día lo haces mejor!"',
        'Celebra los pequeños logros, no solo los grandes avances',
        'Evita comparaciones con otros niños - cada uno avanza a su ritmo',
        'Permite que el niño elija qué juego de FonoKids quiere hacer primero',
        'Crea un sistema de recompensas por constancia (no por perfección)',
        'Nunca uses la terapia como castigo o amenaza'
      ]
    },
    {
      id: 'frustracion',
      titulo: 'Manejo de frustración',
      icono: '💪',
      tips: [
        'Mantén la calma - tu actitud afecta directamente la del niño',
        'Pregunta: "¿Qué te parece difícil?" para entender la frustración',
        'Ofrece un descanso corto (2-3 minutos) y luego retomen',
        'Cambia de ejercicio si uno es muy frustrante',
        'Divide el ejercicio en pasos más pequeños',
        'Recuerda al niño ejercicios que antes le costaban y ahora domina',
        'Si la resistencia persiste, habla con el fonoaudiólogo'
      ]
    },
    {
      id: 'familia',
      titulo: 'Involucramiento de toda la familia',
      icono: '👨‍👩‍👧‍👦',
      tips: [
        'Hermanos mayores pueden practicar juntos y hacer los ejercicios divertidos',
        'Papá y mamá pueden turnarse para acompañar las sesiones',
        'Hagan ejercicios faciales graciosos en familia - todos se ríen y el niño practica',
        'Los abuelos pueden jugar a "hacer caras" con el niño',
        'Evita que familiares critiquen o se burlen del habla del niño',
        'Celebren juntos los logros - hagan que el niño se sienta apoyado'
      ]
    },
    {
      id: 'dia-dia',
      titulo: 'Integrar la terapia en el día a día',
      icono: '💬',
      tips: [
        'Durante las comidas, señala: "Mira cómo mueves los labios para masticar"',
        'Al lavarse los dientes, practiquen movimientos faciales frente al espejo',
        'En el auto, canten canciones que requieran diferentes movimientos de boca',
        'Al leer cuentos, exagera los sonidos y anima al niño a imitarte',
        'Jueguen a las adivinanzas de sonidos de animales',
        'Soplar burbujas, velas, molinetes - todo ayuda a fortalecer labios'
      ]
    },
    {
      id: 'paciencia',
      titulo: 'La importancia de la paciencia',
      icono: '🌱',
      tips: [
        'El progreso es gradual - piensa en semanas y meses, no en días',
        'Habrá retrocesos temporales - son normales y parte del proceso',
        'Cada niño es único - no compares con otros casos',
        'Confía en el proceso aunque a veces parezca que no avanza',
        'Registra videos cada mes para ver el progreso real',
        'Tu apoyo constante es más valioso que la perfección en cada ejercicio'
      ]
    }
  ];

  // Contenido de Ejercicios - LOS 17 EJERCICIOS REALES
  ejercicios = [
    // EJERCICIOS LABIALES (6)
    { id: 1, nombre: 'Sonrisa Amplia', categoria: 'Labial', descripcion: 'Extiende los labios hacia los lados formando una sonrisa amplia', repeticiones: '3 veces por día' },
    { id: 2, nombre: 'Beso', categoria: 'Labial', descripcion: 'Proyecta los labios hacia adelante como dando un beso', repeticiones: '3 veces por día' },
    { id: 3, nombre: 'Sonrisa-Beso Alternado', categoria: 'Labial', descripcion: 'Alterna entre sonrisa amplia y posición de beso', repeticiones: '3 veces por día' },
    { id: 4, nombre: 'Inflar Mejillas', categoria: 'Labial', descripcion: 'Infla las mejillas manteniendo el aire dentro', repeticiones: '3 veces por día' },
    { id: 5, nombre: 'Mover Aire', categoria: 'Labial', descripcion: 'Pasa el aire de una mejilla a otra', repeticiones: '3 veces por día' },
    { id: 6, nombre: 'Vibración de Labios', categoria: 'Labial', descripcion: 'Haz vibrar los labios mientras sueltas aire', repeticiones: '3 veces por día' },
    
    // EJERCICIOS LINGUALES (7)
    { id: 7, nombre: 'Lengua Afuera', categoria: 'Lingual', descripcion: 'Saca la lengua lo más que puedas hacia adelante', repeticiones: '3 veces por día' },
    { id: 8, nombre: 'Tocar Nariz', categoria: 'Lingual', descripcion: 'Intenta tocar la punta de tu nariz con la lengua', repeticiones: '3 veces por día' },
    { id: 9, nombre: 'Tocar Barbilla', categoria: 'Lingual', descripcion: 'Intenta tocar tu barbilla con la lengua', repeticiones: '3 veces por día' },
    { id: 10, nombre: 'Lengua a Comisuras', categoria: 'Lingual', descripcion: 'Toca las esquinas de tu boca con la lengua', repeticiones: '3 veces por día' },
    { id: 11, nombre: 'Lengua Circular', categoria: 'Lingual', descripcion: 'Mueve la lengua en círculos alrededor de los labios', repeticiones: '3 veces por día' },
    { id: 12, nombre: 'Chasquido', categoria: 'Lingual', descripcion: 'Haz el sonido de chasquido con la lengua', repeticiones: '3 veces por día' },
    { id: 13, nombre: 'Lengua Ancha/Angosta', categoria: 'Lingual', descripcion: 'Alterna entre lengua ancha y puntiaguda', repeticiones: '3 veces por día' },
    
    // EJERCICIOS MANDIBULARES (4)
    { id: 14, nombre: 'Abrir y Cerrar Boca', categoria: 'Mandibular', descripcion: 'Abre y cierra la boca de forma controlada', repeticiones: '3 veces por día' },
    { id: 15, nombre: 'Mandíbula a los Lados', categoria: 'Mandibular', descripcion: 'Mueve la mandíbula de lado a lado', repeticiones: '3 veces por día' },
    { id: 16, nombre: 'Mandíbula Adelante/Atrás', categoria: 'Mandibular', descripcion: 'Proyecta y retrae la mandíbula', repeticiones: '3 veces por día' },
    { id: 17, nombre: 'Movimiento Circular Mandíbula', categoria: 'Mandibular', descripcion: 'Mueve la mandíbula en círculos suaves', repeticiones: '3 veces por día' }
  ];

  // Contenido de Señales de Progreso
  senalesProgreso = [
    {
      icono: '🗣️',
      titulo: 'Mejoras en el Habla',
      indicadores: [
        'Mayor claridad al pronunciar palabras',
        'Menos sustitución de sonidos',
        'Habla más fluida y natural'
      ]
    },
    {
      icono: '💪',
      titulo: 'Fortalecimiento Muscular',
      indicadores: [
        'Mayor facilidad para hacer ejercicios',
        'Puede mantener posiciones más tiempo',
        'Movimientos más amplios y controlados'
      ]
    },
    {
      icono: '😊',
      titulo: 'Aspectos Emocionales',
      indicadores: [
        'Mayor confianza al hablar',
        'Menos frustración al comunicarse',
        'Participa más en conversaciones'
      ]
    }
  ];

  // Contenido de Preguntas Frecuentes
  preguntas = [
    {
      id: 'p1',
      pregunta: '¿Cuánto tiempo dura la terapia de habla?',
      respuesta: 'La duración varía según cada niño y sus necesidades específicas. En promedio, un tratamiento puede durar de 6 meses a 2 años con sesiones semanales. La práctica constante en casa con FonoKids acelera significativamente el progreso.'
    },
    {
      id: 'p2',
      pregunta: '¿A qué edad debe empezar la terapia?',
      respuesta: 'Lo ideal es iniciar tan pronto se detecte una dificultad. Generalmente a partir de los 3 años se pueden realizar ejercicios estructurados, pero cada caso debe ser evaluado por un fonoaudiólogo profesional.'
    },
    {
      id: 'p3',
      pregunta: '¿Qué pasa si mi hijo/a no quiere practicar un día?',
      respuesta: 'Es completamente normal. No fuerces la situación. Intenta hacer los ejercicios en forma de juego, ofrece un descanso y retoma más tarde. La constancia es más importante que la perfección diaria.'
    },
    {
      id: 'p4',
      pregunta: '¿Puedo hacer más de 3 sesiones al día?',
      respuesta: 'Sí, pero con moderación. Lo importante es la calidad, no la cantidad. 3 sesiones bien hechas son mejor que 6 sesiones apresuradas. Evita cansar al niño.'
    },
    {
      id: 'p5',
      pregunta: '¿Necesito equipo especial para usar FonoKids?',
      respuesta: 'No. Solo necesitas una computadora o tablet con cámara web y conexión a internet. El sistema funciona con cualquier navegador moderno y detecta automáticamente los movimientos faciales.'
    },
    {
      id: 'p6',
      pregunta: '¿Es seguro usar la cámara?',
      respuesta: 'Completamente seguro. Todo el procesamiento de imagen se hace localmente en tu dispositivo. Ninguna imagen o video se envía a servidores externos. Tu privacidad está 100% protegida.'
    },
    {
      id: 'p7',
      pregunta: '¿Cuándo veré los primeros resultados?',
      respuesta: 'Los primeros cambios suelen notarse después de 2-4 semanas de práctica constante. Mejoras significativas aparecen típicamente entre los 2-3 meses. Cada niño progresa a su propio ritmo.'
    },
    {
      id: 'p8',
      pregunta: '¿Qué hago si no veo progreso después de varias semanas?',
      respuesta: 'Primero verifica la constancia de práctica. Si has practicado consistentemente por 6 semanas sin cambios visibles, consulta con el fonoaudiólogo para ajustar el plan de tratamiento.'
    },
    {
      id: 'p9',
      pregunta: '¿Cómo sé si mi hijo/a hace bien los ejercicios?',
      respuesta: 'FonoKids detecta automáticamente si el ejercicio se ejecuta correctamente usando visión por computadora. Verás feedback en pantalla (verde = correcto, rojo = incorrecto). También puedes guiarte por las instrucciones visuales.'
    },
    {
      id: 'p10',
      pregunta: '¿Deben doler los ejercicios?',
      respuesta: 'No. Los ejercicios nunca deben causar dolor. Si hay molestias, consulta inmediatamente con el fonoaudiólogo - puede haber un problema que requiere atención profesional.'
    },
    {
      id: 'p11',
      pregunta: '¿Cómo mantengo a mi hijo/a motivado/a?',
      respuesta: 'Usa refuerzos positivos, celebra pequeños logros, varía los juegos de FonoKids, crea un sistema de recompensas por constancia (no por perfección), y sobre todo: sé paciente y positivo.'
    },
    {
      id: 'p12',
      pregunta: '¿FonoKids reemplaza las sesiones con el fonoaudiólogo?',
      respuesta: 'No. FonoKids es una herramienta complementaria que apoya la terapia presencial. Las sesiones con el fonoaudiólogo profesional siguen siendo esenciales para evaluar progreso y ajustar el tratamiento.'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
  console.log(' Guía para Tutores cargada');
  // Scroll al inicio cuando se carga el componente
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, 0);
}

  navegarCategoria(categoria: Categoria): void {
    console.log(`📂 Mostrando: ${categoria.titulo}`);
    this.vistaActual = categoria.id;
    this.itemExpandido = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volverHome(): void {
    this.vistaActual = 'home';
    this.itemExpandido = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  navegarAFonoBot(): void {
    this.router.navigate(['/chat/assistant-page']);
  }

  toggleItem(id: string): void {
    this.itemExpandido = this.itemExpandido === id ? null : id;
  }
}