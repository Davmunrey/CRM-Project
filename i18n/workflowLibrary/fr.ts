import type { WorkflowLibraryCatalog } from '../types'

export const workflowLibraryFr: WorkflowLibraryCatalog = {
  automations: {
    'auto-seed-1': {
      name: 'Envoyer un email de suivi',
      description: "Quand un deal passe à Proposition, crée une tâche d'email pour envoyer la proposition formelle.",
      createActivitySubject: 'Envoyer la proposition formelle',
    },
    'auto-seed-2': {
      name: 'Notifier deal gagné',
      description: "Envoie une notification quand un deal est conclu avec succès.",
      notificationTitle: 'Deal gagné',
      notificationMessage: 'Félicitations ! Un deal a été conclu avec succès.',
    },
    'auto-seed-3': {
      name: 'Tâche post-négociation',
      description: "Quand un deal entre en Négociation, crée une tâche pour revoir les conditions.",
      createActivitySubject: 'Revoir les conditions du contrat',
    },
    'auto-seed-4': {
      name: 'Qualifier après la première étape',
      description: "Quand un deal passe de Lead à Qualifié, planifie un appel de découverte pour valider le BANT.",
      createActivitySubject: 'Appel de découverte - valider le BANT',
    },
    'auto-seed-5': {
      name: 'Alignement exécutif (raccourci)',
      description:
        "Quand un deal saute de Qualifié à Négociation, crée une tâche d'alignement exécutif avant le juridique.",
      createActivitySubject: 'Alignement exécutif avant les clauses',
    },
    'auto-seed-6': {
      name: 'Debriefing deal perdu',
      description: "Quand un deal est perdu, crée une tâche pour noter les raisons et mettre à jour le pipeline.",
      createActivitySubject: 'Debrief win/loss - mettre à jour Propel',
    },
    'auto-seed-7': {
      name: 'Alerte manager - deal perdu',
      description: "Notifie l'équipe quand un deal est marqué comme perdu pour revoir l'impact sur le pipeline.",
      notificationTitle: 'Deal perdu',
      notificationMessage: 'Un deal a été perdu - revoyez l\'impact sur le pipeline et les prochaines étapes pour {dealTitle}.',
    },
    'auto-seed-8': {
      name: 'Kickoff après la victoire',
      description: "Quand un deal est gagné, crée une tâche pour planifier le kickoff avec le client.",
      createActivitySubject: 'Planifier le kickoff avec le client',
    },
    'auto-seed-9': {
      name: 'Recycler lors de la disqualification',
      description: "Quand un deal revient de Proposition à Lead, rouvre la découverte et confirme le périmètre.",
      createActivitySubject: 'Re-qualifier le périmètre après retour en arrière',
    },
    'auto-seed-10': {
      name: 'Pause en négociation - renouveler la proposition',
      description: "Quand un deal revient de Négociation à Proposition, met à jour les prix et les annexes juridiques.",
      createActivitySubject: 'Renouveler le dossier de proposition',
    },
  },
  sequences: {
    'seq-001': {
      name: 'Premier contact',
      description: 'Séquence de prospection pour les nouveaux leads.',
      steps: {
        'step-001-1': {
          subject: 'Ravi de se connecter, {{firstName}}',
          bodyTemplate: 'Bonjour {{firstName}},\n\nJe souhaiterais explorer comment nous pourrions collaborer.\n\nCordialement,\n{{senderName}}',
        },
        'step-001-2': {
          subject: 'Relance - {{firstName}}',
          bodyTemplate: 'Bonjour {{firstName}},\n\nJe souhaitais simplement faire un point.\n\nCordialement,\n{{senderName}}',
        },
        'step-001-3': {
          taskDescription: 'Appeler le contact pour planifier une démo.',
        },
      },
    },
    'seq-002': {
      name: 'Réengagement',
      description: 'Relancer les contacts sans réponse depuis plus de 60 jours.',
      steps: {
        'step-002-1': {
          subject: 'Toujours intéressé, {{firstName}} ?',
          bodyTemplate: 'Bonjour {{firstName}},\n\nJe voulais reprendre contact.\n\nCordialement,\n{{senderName}}',
        },
        'step-002-2': {
          subject: 'Dernier contact, {{firstName}}',
          bodyTemplate: 'Bonjour {{firstName}},\n\nCeci sera mon dernier email.\n\nBonne continuation,\n{{senderName}}',
        },
      },
    },
    'seq-003': {
      name: 'Suivi post-démo',
      description: 'Nurturing multi-touch après une démo : récap, preuve, puis appel planifié.',
      steps: {
        'step-003-1': {
          subject: 'Merci pour la démo - {{firstName}}',
          bodyTemplate:
            'Bonjour {{firstName}},\n\nMerci pour la session. Voici un bref récapitulatif de ce que nous avons vu et du calendrier évoqué.\n\nCordialement,\n{{senderName}}',
        },
        'step-003-2': {},
        'step-003-3': {
          subject: 'Documents demandés - {{company}}',
          bodyTemplate:
            'Bonjour {{firstName}},\n\nJe vous transmets les références et la synthèse sécurité promises. N\'hésitez pas à approfondir un point.\n\nCordialement,\n{{senderName}}',
        },
        'step-003-4': {
          taskDescription: "Appeler pour confirmer les critères d'évaluation, la revue sécurité et le décideur économique.",
        },
      },
    },
    'seq-004': {
      name: 'Land and expand',
      description: 'Relance chaleureuse vers des clients existants : valeur, contact social puis proposition commerciale.',
      steps: {
        'step-004-1': {
          subject: 'Idées pour {{company}} ce trimestre',
          bodyTemplate:
            "Bonjour {{firstName}},\n\nAu vu de l'utilisation de votre équipe, voici trois gains concrets sans migration disruptive.\n\nCordialement,\n{{senderName}}",
        },
        'step-004-2': {
          taskDescription: 'Interaction légère sur LinkedIn avec votre champion (commentaire ou message direct).',
        },
        'step-004-3': {
          subject: "Options d'extension - {{firstName}}",
          bodyTemplate:
            "Bonjour {{firstName}},\n\nSi vous êtes ouvert à plus de licences ou à des modules complémentaires, je peux partager des options alignées sur votre renouvellement.\n\nCordialement,\n{{senderName}}",
        },
      },
    },
    'seq-005': {
      name: 'Récupération no-show',
      description: 'Relance polie après une réunion manquée : reprogrammer, valeur, puis appel téléphonique.',
      steps: {
        'step-005-1': {
          subject: "On s'est manqués - vous souhaitez reprogrammer ?",
          bodyTemplate:
            "Bonjour {{firstName}},\n\nNous avions un créneau réservé et je ne vous ai pas vu rejoindre. Voici mon lien agenda - choisissez ce qui vous convient.\n\nCordialement,\n{{senderName}}",
        },
        'step-005-2': {
          subject: 'Un chiffre qui vaut 5 minutes - {{firstName}}',
          bodyTemplate:
            'Bonjour {{firstName}},\n\nUn benchmark que les équipes de votre secteur suivent de près. Ravi de l\'approfondir en direct.\n\nCordialement,\n{{senderName}}',
        },
        'step-005-3': {
          taskDescription: 'Appeler pour confirmer les priorités et bloquer un nouveau créneau exécutif.',
        },
      },
    },
  },
  customFields: {
    'cf-c-01': { label: 'URL LinkedIn', placeholder: 'https://linkedin.com/in/...' },
    'cf-c-02': {
      label: 'Département',
      options: ['Ventes', 'Marketing', 'Technologie', 'Finance', 'RH', 'Direction', 'Opérations', 'Autre'],
    },
    'cf-c-03': { label: 'SIRET / TVA', placeholder: 'FR12345678901' },
    'cf-c-04': { label: 'Date de naissance' },
    'cf-e-01': { label: 'Année de fondation', placeholder: '2020' },
    'cf-e-02': {
      label: 'Technologies',
      options: ['React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', '.NET', 'AWS', 'Azure', 'GCP', 'Kubernetes'],
    },
    'cf-e-03': { label: 'Page LinkedIn entreprise', placeholder: 'https://linkedin.com/company/...' },
    'cf-d-01': { label: 'Concurrent principal', placeholder: 'Nom du concurrent' },
    'cf-d-02': {
      label: 'Type de projet',
      options: ['Nouveau', 'Migration', 'Extension', 'Renouvellement', 'Conseil'],
    },
    'cf-d-03': { label: 'Approbation juridique requise' },
    'cf-d-04': { label: 'Budget approuvé', placeholder: '0,00' },
  },
}
