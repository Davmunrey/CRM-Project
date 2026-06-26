import type { WorkflowLibraryCatalog } from '../types'

export const workflowLibraryIt: WorkflowLibraryCatalog = {
  automations: {
    'auto-seed-1': {
      name: 'Invia email di follow-up',
      description: 'Quando un deal passa a Proposta, crea un task email per inviare la proposta formale.',
      createActivitySubject: 'Inviare la proposta formale',
    },
    'auto-seed-2': {
      name: 'Notifica deal vinto',
      description: 'Invia una notifica quando un deal viene concluso con successo.',
      notificationTitle: 'Deal vinto',
      notificationMessage: 'Congratulazioni! Un deal è stato concluso con successo.',
    },
    'auto-seed-3': {
      name: 'Task post-negoziazione',
      description: 'Quando un deal entra in Negoziazione, crea un task per rivedere i termini.',
      createActivitySubject: 'Rivedere i termini del contratto',
    },
    'auto-seed-4': {
      name: 'Qualifica dopo la prima fase',
      description: 'Quando un deal passa da Lead a Qualificato, pianifica una chiamata di discovery per validare il BANT.',
      createActivitySubject: 'Chiamata di discovery - validare BANT',
    },
    'auto-seed-5': {
      name: 'Allineamento esecutivo (scorciatoia)',
      description:
        'Quando un deal salta da Qualificato a Negoziazione, crea un task di allineamento esecutivo prima del legale.',
      createActivitySubject: 'Allineamento esecutivo prima delle clausole',
    },
    'auto-seed-6': {
      name: 'Debriefing deal perso',
      description: "Quando un deal viene perso, crea un task per registrare i motivi e aggiornare il pipeline.",
      createActivitySubject: 'Debrief win/loss - aggiornare Propel',
    },
    'auto-seed-7': {
      name: 'Allarme manager - deal perso',
      description: "Notifica il team quando un deal viene segnato come perso per rivedere l'impatto sul pipeline.",
      notificationTitle: 'Deal perso',
      notificationMessage: "Un deal è stato perso - rivedi l'impatto sul pipeline e i prossimi passi per {dealTitle}.",
    },
    'auto-seed-8': {
      name: 'Kickoff dopo la vittoria',
      description: 'Quando un deal viene vinto, crea un task per pianificare il kickoff con il cliente.',
      createActivitySubject: 'Pianificare il kickoff con il cliente',
    },
    'auto-seed-9': {
      name: 'Riciclo alla disqualifica',
      description: 'Quando un deal torna da Proposta a Lead, riapre la discovery e conferma lo scope.',
      createActivitySubject: 'Riqualificare lo scope dopo il passo indietro',
    },
    'auto-seed-10': {
      name: 'Pausa in negoziazione - rinnovare la proposta',
      description: 'Quando un deal torna da Negoziazione a Proposta, aggiorna i prezzi e gli allegati legali.',
      createActivitySubject: 'Rinnovare il pacchetto proposta',
    },
  },
  sequences: {
    'seq-001': {
      name: 'Primo contatto',
      description: 'Sequenza di prospecting per nuovi lead.',
      steps: {
        'step-001-1': {
          subject: 'Piacere di connetterci, {{firstName}}',
          bodyTemplate: 'Ciao {{firstName}},\n\nVorrei esplorare come potremmo collaborare.\n\nCordiali saluti,\n{{senderName}}',
        },
        'step-001-2': {
          subject: 'Follow-up - {{firstName}}',
          bodyTemplate: 'Ciao {{firstName}},\n\nVolevo solo fare un follow-up.\n\nCordiali saluti,\n{{senderName}}',
        },
        'step-001-3': {
          taskDescription: 'Chiamare il contatto per pianificare una demo.',
        },
      },
    },
    'seq-002': {
      name: 'Riattivazione',
      description: 'Riattivare contatti senza risposta da più di 60 giorni.',
      steps: {
        'step-002-1': {
          subject: 'Ancora interessato, {{firstName}}?',
          bodyTemplate: 'Ciao {{firstName}},\n\nVolevo riprendere i contatti.\n\nCordiali saluti,\n{{senderName}}',
        },
        'step-002-2': {
          subject: "Ultimo tentativo, {{firstName}}",
          bodyTemplate: "Ciao {{firstName}},\n\nQuesto sarà il mio ultimo messaggio.\n\nIn bocca al lupo,\n{{senderName}}",
        },
      },
    },
    'seq-003': {
      name: 'Follow-up post-demo',
      description: 'Nurturing multi-touch dopo una demo: riepilogo, prove e chiamata pianificata.',
      steps: {
        'step-003-1': {
          subject: 'Grazie per la demo - {{firstName}}',
          bodyTemplate:
            'Ciao {{firstName}},\n\nGrazie per la sessione. Ecco un breve riepilogo di quanto abbiamo visto e del calendario discusso.\n\nCordiali saluti,\n{{senderName}}',
        },
        'step-003-2': {},
        'step-003-3': {
          subject: 'Materiali richiesti - {{company}}',
          bodyTemplate:
            'Ciao {{firstName}},\n\nCondivido i riferimenti e il documento di sicurezza promessi. Sono disponibile ad approfondire qualsiasi sezione.\n\nCordiali saluti,\n{{senderName}}',
        },
        'step-003-4': {
          taskDescription: "Chiamare per confermare i criteri di valutazione, la revisione della sicurezza e il decisore economico.",
        },
      },
    },
    'seq-004': {
      name: 'Land and expand',
      description: 'Contatto caldo verso clienti esistenti: valore, touch social e proposta commerciale di espansione.',
      steps: {
        'step-004-1': {
          subject: 'Idee per {{company}} questo trimestre',
          bodyTemplate:
            "Ciao {{firstName}},\n\nBasandomi sull'utilizzo del tuo team, ecco tre miglioramenti concreti senza una migrazione disruptiva.\n\nCordiali saluti,\n{{senderName}}",
        },
        'step-004-2': {
          taskDescription: 'Interazione leggera su LinkedIn con il tuo champion (commento o messaggio diretto).',
        },
        'step-004-3': {
          subject: 'Opzioni di espansione - {{firstName}}',
          bodyTemplate:
            "Ciao {{firstName}},\n\nSe sei aperto a più licenze o moduli aggiuntivi, posso condividere opzioni allineate alla tua finestra di rinnovo.\n\nCordiali saluti,\n{{senderName}}",
        },
      },
    },
    'seq-005': {
      name: 'Recupero no-show',
      description: 'Recupero educato dopo una riunione mancata: riprogrammare, valore e chiamata telefonica.',
      steps: {
        'step-005-1': {
          subject: 'Ci siamo mancati - vuoi riprogrammare?',
          bodyTemplate:
            "Ciao {{firstName}},\n\nAvevamo un blocco prenotato e non ti ho visto entrare. Ecco il link al mio calendario - scegli quello che ti conviene.\n\nCordiali saluti,\n{{senderName}}",
        },
        'step-005-2': {
          subject: 'Una metrica che vale 5 minuti - {{firstName}}',
          bodyTemplate:
            'Ciao {{firstName}},\n\nUna breve nota con un benchmark che i tuoi colleghi del settore tengono d\'occhio. Disponibile ad approfondirlo dal vivo.\n\nCordiali saluti,\n{{senderName}}',
        },
        'step-005-3': {
          taskDescription: "Chiamare per confermare le priorità e bloccare un nuovo slot esecutivo.",
        },
      },
    },
  },
  customFields: {
    'cf-c-01': { label: 'URL LinkedIn', placeholder: 'https://linkedin.com/in/...' },
    'cf-c-02': {
      label: 'Dipartimento',
      options: ['Vendite', 'Marketing', 'Tecnologia', 'Finanza', 'HR', 'Direzione', 'Operazioni', 'Altro'],
    },
    'cf-c-03': { label: 'Partita IVA / CF', placeholder: 'IT12345678901' },
    'cf-c-04': { label: 'Data di nascita' },
    'cf-e-01': { label: 'Anno di fondazione', placeholder: '2020' },
    'cf-e-02': {
      label: 'Tecnologie',
      options: ['React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', '.NET', 'AWS', 'Azure', 'GCP', 'Kubernetes'],
    },
    'cf-e-03': { label: 'Pagina LinkedIn aziendale', placeholder: 'https://linkedin.com/company/...' },
    'cf-d-01': { label: 'Concorrente principale', placeholder: 'Nome del concorrente' },
    'cf-d-02': {
      label: 'Tipo di progetto',
      options: ['Nuovo', 'Migrazione', 'Espansione', 'Rinnovo', 'Consulenza'],
    },
    'cf-d-03': { label: 'Richiede approvazione legale' },
    'cf-d-04': { label: 'Budget approvato', placeholder: '0,00' },
  },
}
