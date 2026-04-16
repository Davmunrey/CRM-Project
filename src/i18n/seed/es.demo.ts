import type { SeedDemoCatalog } from '../types'

export const seedDemo: SeedDemoCatalog = {
  products: {
    'prod-001': {
      name: 'Licencia CRM Pro',
      description: 'Licencia anual CRM Pro con soporte incluido',
    },
    'prod-002': {
      name: 'Implementación básica',
      description: 'Servicio de implementación y migración de datos',
    },
    'prod-003': {
      name: 'Soporte premium 24/7',
      description: 'Soporte prioritario con SLA garantizado < 2h',
    },
    'prod-004': {
      name: 'Formación de equipos',
      description: 'Sesiones de formación presencial para equipos de ventas',
    },
    'prod-005': {
      name: 'Pack integración API',
      description: 'Integraciones con sistemas externos vía API REST',
    },
    'prod-006': {
      name: 'Servidor on-premise',
      description: 'Hardware dedicado para instalación local del CRM',
    },
  },
  emailTemplates: {
    'tpl-001': {
      name: 'Primer contacto',
      subject: 'Encantado de conectar, {{firstName}}',
      body: 'Hola {{firstName}},\n\nMe gustaría explorar si podríamos colaborar.\n\nUn saludo,\n{{senderName}}',
    },
    'tpl-002': {
      name: 'Seguimiento reunión',
      subject: 'Resumen de nuestra reunión — {{dealTitle}}',
      body: 'Hola {{firstName}},\n\nGracias por tu tiempo. Te enviaré la propuesta en los próximos días.\n\nUn saludo,\n{{senderName}}',
    },
    'tpl-003': {
      name: 'Envío de propuesta',
      subject: 'Propuesta comercial — {{dealTitle}}',
      body: 'Hola {{firstName}},\n\nAdjunto encontrarás la propuesta comercial para {{dealTitle}}.\n\nUn saludo,\n{{senderName}}',
    },
    'tpl-004': {
      name: 'Cierre de deal',
      subject: 'Siguientes pasos para cerrar {{dealTitle}}',
      body: 'Hola {{firstName}},\n\nQuería hacer seguimiento sobre la propuesta de {{dealTitle}}.\n\nUn saludo,\n{{senderName}}',
    },
    'tpl-005': {
      name: 'Nurturing — contenido de valor',
      subject: '{{firstName}}, un recurso que puede interesarte',
      body: 'Hola {{firstName}},\n\nHemos publicado un estudio relevante para {{company}}.\n\nUn saludo,\n{{senderName}}',
    },
  },
  quickReplies: {
    'qr-1': {
      title: 'Seguimiento rápido',
      body: 'Hola {{firstName}},\n\nSolo quería hacer un seguimiento.\n\nUn saludo,',
    },
    'qr-2': {
      title: 'Resumen de reunión',
      body: 'Gracias por tu tiempo hoy.\n\nComo acordamos, próximos pasos:\n1) \n2) \n3) \n\nUn saludo,',
    },
  },
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
          subject: 'Seguimiento — {{firstName}}',
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
  demoAuth: {
    organizationName: 'CRM Pro Ventas',
    users: {
      u1: { jobTitle: 'Director comercial' },
      u2: { jobTitle: 'Ejecutiva de cuentas' },
      u3: { jobTitle: 'SDR' },
    },
  },
}
