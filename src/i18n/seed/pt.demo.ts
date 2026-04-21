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
    'auto-seed-4': {
      name: 'Qualificar após a primeira etapa',
      description: 'Quando um negócio passa de Lead para Qualificado, agenda uma chamada de descoberta para validar BANT.',
      createActivitySubject: 'Chamada de descoberta — validar BANT',
    },
    'auto-seed-5': {
      name: 'Alinhamento executivo (atalho)',
      description:
        'Quando um negócio salta de Qualificado para Negociação, cria uma tarefa de alinhamento executivo antes do jurídico.',
      createActivitySubject: 'Alinhamento executivo antes das cláusulas',
    },
    'auto-seed-6': {
      name: 'Debrief de negócio perdido',
      description: 'Quando um negócio é perdido, cria uma tarefa para registar motivos e atualizar o pipeline.',
      createActivitySubject: 'Debrief win/loss — atualizar CRM',
    },
    'auto-seed-7': {
      name: 'Alerta ao gestor — negócio perdido',
      description: 'Notifica a equipa quando um negócio é marcado como perdido para rever o impacto no pipeline.',
      notificationTitle: 'Negócio perdido',
      notificationMessage: 'Um negócio foi perdido — rever o impacto no pipeline e próximos passos para {dealTitle}.',
    },
    'auto-seed-8': {
      name: 'Kickoff após vitória',
      description: 'Quando um negócio é ganho, cria uma tarefa para agendar o kickoff com o cliente.',
      createActivitySubject: 'Agendar kickoff com o cliente',
    },
    'auto-seed-9': {
      name: 'Reciclar ao desqualificar',
      description: 'Quando um negócio volta de Proposta para Lead, reabre a descoberta e confirma o âmbito.',
      createActivitySubject: 'Re-qualificar âmbito após retrocesso',
    },
    'auto-seed-10': {
      name: 'Pausa na negociação — renovar proposta',
      description: 'Quando um negócio volta de Negociação para Proposta, atualiza preços e anexos legais.',
      createActivitySubject: 'Renovar pacote de proposta',
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
    'seq-003': {
      name: 'Acompanhamento pós-demo',
      description: 'Nutrição multitoque após uma demo: resumo, prova e chamada agendada.',
      steps: {
        'step-003-1': {
          subject: 'Obrigado pela demo — {{firstName}}',
          bodyTemplate:
            'Olá {{firstName}},\n\nObrigado pela sessão. Segue um resumo curto do que vimos e o calendário que combinámos.\n\nAtenciosamente,\n{{senderName}}',
        },
        'step-003-2': {},
        'step-003-3': {
          subject: 'Materiais que pediu — {{company}}',
          bodyTemplate:
            'Olá {{firstName}},\n\nEnvio as referências e a visão de segurança prometidas. Disponível para aprofundar qualquer ponto.\n\nAtenciosamente,\n{{senderName}}',
        },
        'step-003-4': {
          taskDescription: 'Ligar para confirmar critérios de avaliação, revisão de segurança e comprador económico.',
        },
      },
    },
    'seq-004': {
      name: 'Land and expand',
      description: 'Outreach quente a clientes atuais: valor, toque social e pedido comercial de expansão.',
      steps: {
        'step-004-1': {
          subject: 'Ideias para {{company}} neste trimestre',
          bodyTemplate:
            'Olá {{firstName}},\n\nCom base na utilização da equipa, três ganhos concretos sem migração disruptiva.\n\nAtenciosamente,\n{{senderName}}',
        },
        'step-004-2': {
          taskDescription: 'Engagement leve no LinkedIn com o champion (comentário ou DM).',
        },
        'step-004-3': {
          subject: 'Opções de expansão — {{firstName}}',
          bodyTemplate:
            'Olá {{firstName}},\n\nSe fizer sentido mais licenças ou módulos, posso enviar opções alinhadas à renovação.\n\nAtenciosamente,\n{{senderName}}',
        },
      },
    },
    'seq-005': {
      name: 'Recuperação após no-show',
      description: 'Recuperação educada após falta à reunião: reagendar, valor e chamada.',
      steps: {
        'step-005-1': {
          subject: 'Não nos cruzámos hoje — reagendar?',
          bodyTemplate:
            'Olá {{firstName}},\n\nTínhamos horário marcado e não vi a ligação. Segue o link da minha agenda para escolher slot.\n\nAtenciosamente,\n{{senderName}}',
        },
        'step-005-2': {
          subject: 'Uma métrica em 5 minutos — {{firstName}}',
          bodyTemplate:
            'Olá {{firstName}},\n\nUma referência que equipas do vosso setor acompanham de perto. Posso explicar ao vivo.\n\nAtenciosamente,\n{{senderName}}',
        },
        'step-005-3': {
          taskDescription: 'Ligar para confirmar prioridades e fechar nova janela executiva.',
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
