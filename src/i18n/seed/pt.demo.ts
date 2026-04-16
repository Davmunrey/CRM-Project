import type { SeedDemoCatalog } from '../types'
import { demoEntityOverlaysPt } from './entityOverlaysPt'

export const seedDemo: SeedDemoCatalog = {
  products: {
    'prod-001': {
      name: 'Licença CRM Pro',
      description: 'Licença anual CRM Pro com suporte incluído',
    },
    'prod-002': {
      name: 'Implementação básica',
      description: 'Serviço de implementação e migração de dados',
    },
    'prod-003': {
      name: 'Suporte premium 24/7',
      description: 'Suporte prioritário com SLA < 2h',
    },
    'prod-004': {
      name: 'Treinamento de equipes',
      description: 'Sessões presenciais de treinamento para equipes de vendas',
    },
    'prod-005': {
      name: 'Pacote integração API',
      description: 'Integrações com sistemas externos via API REST',
    },
    'prod-006': {
      name: 'Servidor on-premise',
      description: 'Hardware dedicado para instalação local do CRM',
    },
  },
  emailTemplates: {
    'tpl-001': {
      name: 'Primeiro contato',
      subject: 'Prazer em conectar, {{firstName}}',
      body: 'Olá {{firstName}},\n\nGostaria de explorar como podemos colaborar.\n\nAtenciosamente,\n{{senderName}}',
    },
    'tpl-002': {
      name: 'Acompanhamento pós-reunião',
      subject: 'Resumo da nossa reunião — {{dealTitle}}',
      body: 'Olá {{firstName}},\n\nObrigado pelo seu tempo. Enviarei a proposta nos próximos dias.\n\nAtenciosamente,\n{{senderName}}',
    },
    'tpl-003': {
      name: 'Envio de proposta',
      subject: 'Proposta comercial — {{dealTitle}}',
      body: 'Olá {{firstName}},\n\nSegue em anexo a proposta comercial para {{dealTitle}}.\n\nAtenciosamente,\n{{senderName}}',
    },
    'tpl-004': {
      name: 'Fechamento do negócio',
      subject: 'Próximos passos para fechar {{dealTitle}}',
      body: 'Olá {{firstName}},\n\nQueria retomar o contato sobre a proposta de {{dealTitle}}.\n\nAtenciosamente,\n{{senderName}}',
    },
    'tpl-005': {
      name: 'Nutrição — conteúdo de valor',
      subject: '{{firstName}}, um recurso que pode interessar',
      body: 'Olá {{firstName}},\n\nPublicámos um estudo relevante para {{company}}.\n\nAtenciosamente,\n{{senderName}}',
    },
  },
  quickReplies: {
    'qr-1': {
      title: 'Acompanhamento rápido',
      body: 'Olá {{firstName}},\n\nSó passando para acompanhar.\n\nAtenciosamente,',
    },
    'qr-2': {
      title: 'Resumo da reunião',
      body: 'Obrigado pelo tempo hoje.\n\nConforme combinado, próximos passos:\n1) \n2) \n3) \n\nAtenciosamente,',
    },
  },
  automations: {
    'auto-seed-1': {
      name: 'Enviar e-mail de acompanhamento',
      description: 'Quando um negócio passa para Proposta, cria uma tarefa de e-mail para enviar a proposta formal.',
      createActivitySubject: 'Enviar proposta formal',
    },
    'auto-seed-2': {
      name: 'Notificar negócio ganho',
      description: 'Envia uma notificação quando um negócio é fechado com sucesso.',
      notificationTitle: 'Negócio ganho',
      notificationMessage: 'Parabéns! Um negócio foi fechado com sucesso.',
    },
    'auto-seed-3': {
      name: 'Tarefa pós-negociação',
      description: 'Quando um negócio entra em Negociação, cria uma tarefa para rever os termos.',
      createActivitySubject: 'Rever termos do contrato',
    },
  },
  sequences: {
    'seq-001': {
      name: 'Outreach inicial',
      description: 'Sequência de prospecção para novos leads.',
      steps: {
        'step-001-1': {
          subject: 'Prazer em conectar, {{firstName}}',
          bodyTemplate: 'Olá {{firstName}},\n\nGostaria de explorar se podemos colaborar.\n\nAtenciosamente,\n{{senderName}}',
        },
        'step-001-2': {
          subject: 'Acompanhamento — {{firstName}}',
          bodyTemplate: 'Olá {{firstName}},\n\nSó queria fazer um acompanhamento.\n\nAtenciosamente,\n{{senderName}}',
        },
        'step-001-3': {
          taskDescription: 'Ligar ao contacto para agendar uma demo.',
        },
      },
    },
    'seq-002': {
      name: 'Reengajamento',
      description: 'Recuperar contactos sem resposta há mais de 60 dias.',
      steps: {
        'step-002-1': {
          subject: 'Ainda tem interesse, {{firstName}}?',
          bodyTemplate: 'Olá {{firstName}},\n\nQueria retomar o contacto.\n\nAtenciosamente,\n{{senderName}}',
        },
        'step-002-2': {
          subject: 'Última tentativa, {{firstName}}',
          bodyTemplate: 'Olá {{firstName}},\n\nEste será o meu último e-mail.\n\nMuito sucesso!\n{{senderName}}',
        },
      },
    },
  },
  customFields: {
    'cf-c-01': { label: 'URL do LinkedIn', placeholder: 'https://linkedin.com/in/...' },
    'cf-c-02': {
      label: 'Departamento',
      options: ['Vendas', 'Marketing', 'Tecnologia', 'Finanças', 'RH', 'Direção', 'Operações', 'Outro'],
    },
    'cf-c-03': { label: 'NIF / VAT', placeholder: 'PT123456789' },
    'cf-c-04': { label: 'Data de aniversário' },
    'cf-e-01': { label: 'Ano de fundação', placeholder: '2020' },
    'cf-e-02': {
      label: 'Tecnologias',
      options: ['React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', '.NET', 'AWS', 'Azure', 'GCP', 'Kubernetes'],
    },
    'cf-e-03': { label: 'Página LinkedIn da empresa', placeholder: 'https://linkedin.com/company/...' },
    'cf-d-01': { label: 'Concorrente principal', placeholder: 'Nome do concorrente' },
    'cf-d-02': {
      label: 'Tipo de projeto',
      options: ['Novo', 'Migração', 'Expansão', 'Renovação', 'Consultoria'],
    },
    'cf-d-03': { label: 'Requer aprovação jurídica' },
    'cf-d-04': { label: 'Orçamento aprovado', placeholder: '0,00' },
  },
  ...demoEntityOverlaysPt,
  demoAuth: {
    organizationName: 'CRM Pro Vendas',
    users: {
      u1: { jobTitle: 'Gestor de vendas' },
      u2: { jobTitle: 'Executiva de contas' },
      u3: { jobTitle: 'SDR' },
    },
  },
}
