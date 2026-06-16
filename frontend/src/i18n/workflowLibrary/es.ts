import type { WorkflowLibraryCatalog } from '../types'

export const workflowLibraryEs: WorkflowLibraryCatalog = {
  automations: {
    'auto-seed-1': {
      name: 'Enviar email de seguimiento',
      description: 'Cuando un deal pasa a Propuesta, crea una tarea de email para enviar la propuesta formal.',
      createActivitySubject: 'Enviar propuesta formal',
    },
    'auto-seed-2': {
      name: 'Notificar deal ganado',
      description: 'Envía una notificación cuando se cierra un deal exitosamente.',
      notificationTitle: 'Deal ganado',
      notificationMessage: '¡Felicidades! Se ha cerrado un deal exitosamente.',
    },
    'auto-seed-3': {
      name: 'Tarea post-negociación',
      description: 'Cuando un deal entra en Negociación, crea una tarea para revisar los términos.',
      createActivitySubject: 'Revisar términos del contrato',
    },
    'auto-seed-4': {
      name: 'Cualificar tras la primera etapa',
      description: 'Cuando un deal pasa de Lead a Cualificado, programa una llamada de descubrimiento para validar BANT.',
      createActivitySubject: 'Llamada de descubrimiento - validar BANT',
    },
    'auto-seed-5': {
      name: 'Alineación ejecutiva (atajo)',
      description:
        'Cuando un deal salta de Cualificado a Negociación, crea una tarea de alineación ejecutiva antes del legal.',
      createActivitySubject: 'Alineación ejecutiva antes de las cláusulas',
    },
    'auto-seed-6': {
      name: 'Debrief de deal perdido',
      description: 'Cuando se pierde un deal, crea una tarea para capturar motivos y actualizar el pipeline.',
      createActivitySubject: 'Debrief win/loss - actualizar n0CRM',
    },
    'auto-seed-7': {
      name: 'Alerta a manager - deal perdido',
      description: 'Notifica al equipo cuando un deal se marca como perdido para revisar el impacto en el pipeline.',
      notificationTitle: 'Deal perdido',
      notificationMessage: 'Se ha perdido un deal - revisa el impacto en el pipeline y los siguientes pasos para {dealTitle}.',
    },
    'auto-seed-8': {
      name: 'Kickoff tras ganar',
      description: 'Cuando se gana un deal, crea una tarea para programar el kickoff con el cliente.',
      createActivitySubject: 'Programar kickoff con el cliente',
    },
    'auto-seed-9': {
      name: 'Reciclar al descalificar',
      description: 'Cuando un deal vuelve de Propuesta a Lead, reabre el descubrimiento y confirma el alcance.',
      createActivitySubject: 'Re-cualificar alcance tras retroceso',
    },
    'auto-seed-10': {
      name: 'Pausa en negociación - renovar propuesta',
      description: 'Cuando un deal vuelve de Negociación a Propuesta, actualiza precios y adjuntos legales.',
      createActivitySubject: 'Renovar paquete de propuesta',
    },
  },
  sequences: {
    'seq-001': {
      name: 'Outreach inicial',
      description: 'Secuencia de prospección para nuevos leads.',
      steps: {
        'step-001-1': {
          subject: 'Encantado de conectar, {{firstName}}',
          bodyTemplate: 'Hola {{firstName}},\n\nMe gustaría explorar si podemos colaborar.\n\nUn saludo,\n{{senderName}}',
        },
        'step-001-2': {
          subject: 'Seguimiento - {{firstName}}',
          bodyTemplate: 'Hola {{firstName}},\n\nSolo quería hacer seguimiento.\n\nUn saludo,\n{{senderName}}',
        },
        'step-001-3': {
          taskDescription: 'Llamar al contacto para agendar una demo.',
        },
      },
    },
    'seq-002': {
      name: 'Re-engagement',
      description: 'Recuperar contactos que llevan más de 60 días sin responder.',
      steps: {
        'step-002-1': {
          subject: '¿Sigues interesado, {{firstName}}?',
          bodyTemplate: 'Hola {{firstName}},\n\nQuería retomar el contacto.\n\nUn saludo,\n{{senderName}}',
        },
        'step-002-2': {
          subject: 'Último intento, {{firstName}}',
          bodyTemplate: 'Hola {{firstName}},\n\nEste será mi último email.\n\n¡Mucho éxito!\n{{senderName}}',
        },
      },
    },
    'seq-003': {
      name: 'Seguimiento post-demo',
      description: 'Nutrición multicanal tras una demo: resumen, prueba y llamada concertada.',
      steps: {
        'step-003-1': {
          subject: 'Gracias por la demo - {{firstName}}',
          bodyTemplate:
            'Hola {{firstName}},\n\nGracias por la sesión. Aquí tienes un resumen breve de lo visto y el calendario que comentamos.\n\nUn saludo,\n{{senderName}}',
        },
        'step-003-2': {},
        'step-003-3': {
          subject: 'Materiales que pediste - {{company}}',
          bodyTemplate:
            'Hola {{firstName}},\n\nTe envío las referencias y el resumen de seguridad prometidos. Encantado de profundizar en cualquier punto.\n\nUn saludo,\n{{senderName}}',
        },
        'step-003-4': {
          taskDescription: 'Llamar para confirmar criterios de evaluación, revisión de seguridad y comprador económico.',
        },
      },
    },
    'seq-004': {
      name: 'Land and expand',
      description: 'Outreach cálido a clientes actuales: valor, toque social y propuesta comercial de ampliación.',
      steps: {
        'step-004-1': {
          subject: 'Ideas para {{company}} este trimestre',
          bodyTemplate:
            'Hola {{firstName}},\n\nSegún el uso de vuestro equipo, aquí van tres mejoras concretas sin migración disruptiva.\n\nUn saludo,\n{{senderName}}',
        },
        'step-004-2': {
          taskDescription: 'Engagement ligero en LinkedIn con el champion (comentario o MD).',
        },
        'step-004-3': {
          subject: 'Opciones de ampliación - {{firstName}}',
          bodyTemplate:
            'Hola {{firstName}},\n\nSi os encajan más licencias o módulos adicionales, puedo enviar opciones alineadas a la renovación.\n\nUn saludo,\n{{senderName}}',
        },
      },
    },
    'seq-005': {
      name: 'Recuperación ante no-show',
      description: 'Recuperación educada tras una reunión perdida: reagendar, valor y llamada.',
      steps: {
        'step-005-1': {
          subject: 'No coincidimos hoy - ¿reagendamos?',
          bodyTemplate:
            'Hola {{firstName}},\n\nTeníamos bloque y no vi la conexión. Aquí tienes mi agenda para elegir hueco.\n\nUn saludo,\n{{senderName}}',
        },
        'step-005-2': {
          subject: 'Una métrica en 5 minutos - {{firstName}}',
          bodyTemplate:
            'Hola {{firstName}},\n\nTe dejo un benchmark que suelen vigilar equipos como el vuestro. Encantado de comentarlo en vivo.\n\nUn saludo,\n{{senderName}}',
        },
        'step-005-3': {
          taskDescription: 'Llamar para confirmar prioridades y cerrar nueva franja ejecutiva.',
        },
      },
    },
  },
  customFields: {
    'cf-c-01': { label: 'URL de LinkedIn', placeholder: 'https://linkedin.com/in/...' },
    'cf-c-02': {
      label: 'Departamento',
      options: ['Ventas', 'Marketing', 'Tecnología', 'Finanzas', 'RRHH', 'Dirección', 'Operaciones', 'Otro'],
    },
    'cf-c-03': { label: 'NIF / CIF', placeholder: 'B12345678' },
    'cf-c-04': { label: 'Fecha de cumpleaños' },
    'cf-e-01': { label: 'Año de fundación', placeholder: '2020' },
    'cf-e-02': {
      label: 'Tecnologías',
      options: ['React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', '.NET', 'AWS', 'Azure', 'GCP', 'Kubernetes'],
    },
    'cf-e-03': { label: 'Página LinkedIn', placeholder: 'https://linkedin.com/company/...' },
    'cf-d-01': { label: 'Competidor principal', placeholder: 'Nombre del competidor' },
    'cf-d-02': {
      label: 'Tipo de proyecto',
      options: ['Nuevo', 'Migración', 'Ampliación', 'Renovación', 'Consultoría'],
    },
    'cf-d-03': { label: 'Requiere aprobación legal' },
    'cf-d-04': { label: 'Presupuesto aprobado', placeholder: '0,00' },
  },
}
