import type { WorkflowLibraryCatalog } from '../types'

export const workflowLibraryDe: WorkflowLibraryCatalog = {
  automations: {
    'auto-seed-1': {
      name: 'Follow-up-E-Mail senden',
      description: 'Wenn ein Deal zu Angebot wechselt, erstellt eine E-Mail-Aufgabe zum Senden des formellen Angebots.',
      createActivitySubject: 'Formelles Angebot senden',
    },
    'auto-seed-2': {
      name: 'Gewonnenen Deal benachrichtigen',
      description: 'Sendet eine Benachrichtigung, wenn ein Deal erfolgreich abgeschlossen wird.',
      notificationTitle: 'Deal gewonnen',
      notificationMessage: 'Glückwunsch! Ein Deal wurde erfolgreich abgeschlossen.',
    },
    'auto-seed-3': {
      name: 'Aufgabe nach Verhandlung',
      description: 'Wenn ein Deal in Verhandlung wechselt, erstellt eine Aufgabe zur Überprüfung der Konditionen.',
      createActivitySubject: 'Vertragsbedingungen prüfen',
    },
    'auto-seed-4': {
      name: 'Qualifizieren nach erster Phase',
      description: 'Wenn ein Deal von Lead zu Qualifiziert wechselt, plant einen Discovery-Call zur BANT-Validierung.',
      createActivitySubject: 'Discovery-Call - BANT validieren',
    },
    'auto-seed-5': {
      name: 'Executive Alignment (Abkürzung)',
      description:
        'Wenn ein Deal von Qualifiziert zu Verhandlung springt, erstellt eine Executive-Alignment-Aufgabe vor dem Legal-Check.',
      createActivitySubject: 'Executive Alignment vor Klauseln',
    },
    'auto-seed-6': {
      name: 'Verlorener Deal Debriefing',
      description: 'Wenn ein Deal verloren geht, erstellt eine Aufgabe zur Erfassung der Gründe und Pipeline-Aktualisierung.',
      createActivitySubject: 'Win/Loss-Debriefing - Propel aktualisieren',
    },
    'auto-seed-7': {
      name: 'Manager-Alarm - Deal verloren',
      description: 'Benachrichtigt das Team, wenn ein Deal als verloren markiert wird, um den Pipeline-Einfluss zu prüfen.',
      notificationTitle: 'Deal verloren',
      notificationMessage: 'Ein Deal wurde verloren - überprüfe den Pipeline-Einfluss und die nächsten Schritte für {dealTitle}.',
    },
    'auto-seed-8': {
      name: 'Kickoff nach dem Gewinn',
      description: 'Wenn ein Deal gewonnen wird, erstellt eine Aufgabe zur Planung des Kickoffs mit dem Kunden.',
      createActivitySubject: 'Kickoff mit dem Kunden planen',
    },
    'auto-seed-9': {
      name: 'Recyceln bei Disqualifizierung',
      description: 'Wenn ein Deal von Angebot zu Lead zurückkehrt, öffnet die Discovery erneut und bestätigt den Scope.',
      createActivitySubject: 'Scope nach Rückschritt neu qualifizieren',
    },
    'auto-seed-10': {
      name: 'Pause in Verhandlung - Angebot erneuern',
      description: 'Wenn ein Deal von Verhandlung zu Angebot zurückkehrt, aktualisiert Preise und rechtliche Anhänge.',
      createActivitySubject: 'Angebotspaket erneuern',
    },
  },
  sequences: {
    'seq-001': {
      name: 'Erstkontakt',
      description: 'Prospecting-Sequenz für neue Leads.',
      steps: {
        'step-001-1': {
          subject: 'Schön, in Kontakt zu kommen, {{firstName}}',
          bodyTemplate: 'Hallo {{firstName}},\n\nIch würde gerne erkunden, wie wir zusammenarbeiten können.\n\nMit freundlichen Grüßen,\n{{senderName}}',
        },
        'step-001-2': {
          subject: 'Nachfass - {{firstName}}',
          bodyTemplate: 'Hallo {{firstName}},\n\nIch wollte nur kurz nachfragen.\n\nMit freundlichen Grüßen,\n{{senderName}}',
        },
        'step-001-3': {
          taskDescription: 'Kontakt anrufen, um eine Demo zu vereinbaren.',
        },
      },
    },
    'seq-002': {
      name: 'Reaktivierung',
      description: 'Kontakte reaktivieren, die seit mehr als 60 Tagen nicht geantwortet haben.',
      steps: {
        'step-002-1': {
          subject: 'Noch interessiert, {{firstName}}?',
          bodyTemplate: 'Hallo {{firstName}},\n\nIch wollte wieder Kontakt aufnehmen.\n\nMit freundlichen Grüßen,\n{{senderName}}',
        },
        'step-002-2': {
          subject: 'Letzte Nachricht, {{firstName}}',
          bodyTemplate: 'Hallo {{firstName}},\n\nDies wird meine letzte E-Mail sein.\n\nAlles Gute,\n{{senderName}}',
        },
      },
    },
    'seq-003': {
      name: 'Nachfass nach Demo',
      description: 'Multi-Touch-Nurturing nach einer Demo: Zusammenfassung, Beweis und geplanter Anruf.',
      steps: {
        'step-003-1': {
          subject: 'Danke für die Demo - {{firstName}}',
          bodyTemplate:
            'Hallo {{firstName}},\n\nVielen Dank für die Session. Hier ist eine kurze Zusammenfassung des Besprochenen und des diskutierten Zeitplans.\n\nMit freundlichen Grüßen,\n{{senderName}}',
        },
        'step-003-2': {},
        'step-003-3': {
          subject: 'Angeforderte Unterlagen - {{company}}',
          bodyTemplate:
            'Hallo {{firstName}},\n\nIch schicke die versprochenen Referenzen und die Sicherheitsübersicht. Gerne gehe ich tiefer auf jeden Abschnitt ein.\n\nMit freundlichen Grüßen,\n{{senderName}}',
        },
        'step-003-4': {
          taskDescription: 'Anrufen, um Bewertungskriterien, Sicherheitsprüfung und wirtschaftlichen Entscheider zu bestätigen.',
        },
      },
    },
    'seq-004': {
      name: 'Land and Expand',
      description: 'Warme Kontaktaufnahme mit Bestandskunden: Mehrwert, sozialer Kontakt und kommerzielles Erweiterungsangebot.',
      steps: {
        'step-004-1': {
          subject: 'Ideen für {{company}} dieses Quartal',
          bodyTemplate:
            'Hallo {{firstName}},\n\nBasierend auf der Nutzung Ihres Teams gibt es drei konkrete Verbesserungen ohne aufwändige Migration.\n\nMit freundlichen Grüßen,\n{{senderName}}',
        },
        'step-004-2': {
          taskDescription: 'Leichter LinkedIn-Kontakt mit Ihrem Champion (Kommentar oder Direktnachricht).',
        },
        'step-004-3': {
          subject: 'Erweiterungsoptionen - {{firstName}}',
          bodyTemplate:
            'Hallo {{firstName}},\n\nFalls Sie offen für mehr Lizenzen oder Zusatzmodule sind, kann ich Optionen passend zu Ihrer Verlängerung teilen.\n\nMit freundlichen Grüßen,\n{{senderName}}',
        },
      },
    },
    'seq-005': {
      name: 'No-Show-Wiederherstellung',
      description: 'Höfliche Wiederherstellung nach einem verpassten Meeting: umplanen, Mehrwert und Telefonanruf.',
      steps: {
        'step-005-1': {
          subject: 'Haben uns verpasst - möchten Sie neu terminieren?',
          bodyTemplate:
            'Hallo {{firstName}},\n\nWir hatten einen Block reserviert und ich habe Sie nicht eingeloggt gesehen. Hier ist mein Kalenderlink - wählen Sie, was passt.\n\nMit freundlichen Grüßen,\n{{senderName}}',
        },
        'step-005-2': {
          subject: 'Eine Kennzahl für 5 Minuten - {{firstName}}',
          bodyTemplate:
            'Hallo {{firstName}},\n\nEine Benchmark-Zahl, die Teams in Ihrem Bereich genau beobachten. Gerne bespreche ich sie live.\n\nMit freundlichen Grüßen,\n{{senderName}}',
        },
        'step-005-3': {
          taskDescription: 'Anrufen, um Prioritäten zu bestätigen und einen neuen Executive-Slot zu buchen.',
        },
      },
    },
  },
  customFields: {
    'cf-c-01': { label: 'LinkedIn-URL', placeholder: 'https://linkedin.com/in/...' },
    'cf-c-02': {
      label: 'Abteilung',
      options: ['Vertrieb', 'Marketing', 'Technologie', 'Finanzen', 'HR', 'Führung', 'Betrieb', 'Sonstiges'],
    },
    'cf-c-03': { label: 'Steuer-ID / USt-IdNr', placeholder: 'DE123456789' },
    'cf-c-04': { label: 'Geburtstag' },
    'cf-e-01': { label: 'Gründungsjahr', placeholder: '2020' },
    'cf-e-02': {
      label: 'Technologien',
      options: ['React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', '.NET', 'AWS', 'Azure', 'GCP', 'Kubernetes'],
    },
    'cf-e-03': { label: 'LinkedIn-Unternehmensseite', placeholder: 'https://linkedin.com/company/...' },
    'cf-d-01': { label: 'Hauptkonkurrent', placeholder: 'Name des Konkurrenten' },
    'cf-d-02': {
      label: 'Projekttyp',
      options: ['Neu', 'Migration', 'Erweiterung', 'Verlängerung', 'Beratung'],
    },
    'cf-d-03': { label: 'Erfordert rechtliche Genehmigung' },
    'cf-d-04': { label: 'Genehmigtes Budget', placeholder: '0,00' },
  },
}
