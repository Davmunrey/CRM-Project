export type Language = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it'

export type SeedProductId = 'prod-001' | 'prod-002' | 'prod-003' | 'prod-004' | 'prod-005' | 'prod-006'

export type SeedTemplateId = 'tpl-001' | 'tpl-002' | 'tpl-003' | 'tpl-004' | 'tpl-005'

export type SeedQuickReplyId = 'qr-1' | 'qr-2'

export type SeedAutomationId =
  | 'auto-seed-1'
  | 'auto-seed-2'
  | 'auto-seed-3'
  | 'auto-seed-4'
  | 'auto-seed-5'
  | 'auto-seed-6'
  | 'auto-seed-7'
  | 'auto-seed-8'
  | 'auto-seed-9'
  | 'auto-seed-10'

export type SeedSequenceId = 'seq-001' | 'seq-002' | 'seq-003' | 'seq-004' | 'seq-005'

export interface SeedCustomFieldDemo {
  label: string
  placeholder?: string
  options?: string[]
}

export interface SeedAutomationDemoCopy {
  name: string
  description: string
  createActivitySubject?: string
  notificationTitle?: string
  notificationMessage?: string
}

export interface SeedSequenceStepCopy {
  subject?: string
  bodyTemplate?: string
  taskDescription?: string
}

export interface SeedSequenceDemoCopy {
  name: string
  description: string
  steps: Record<string, SeedSequenceStepCopy>
}

/** Optional i18n overlays for offline demo CRM entities (keyed by stable seed ids). */
export type SeedDemoAuthUserId = 'u1' | 'u2' | 'u3'

export interface SeedDemoAuthOverlay {
  organizationName: string
  users: Partial<Record<SeedDemoAuthUserId, { jobTitle: string }>>
}

export interface SeedCompanyDemoOverlay {
  name?: string
  notes?: string
  city?: string
  country?: string
}

export interface SeedContactDemoOverlay {
  firstName?: string
  lastName?: string
  jobTitle?: string
  notes?: string
}

export interface SeedDealDemoOverlay {
  title?: string
  notes?: string
}

export interface SeedActivityDemoOverlay {
  subject?: string
  description?: string
  outcome?: string
}

export interface SeedEmailDemoOverlay {
  subject?: string
  body?: string
}

export interface SeedDemoCatalog {
  products: Record<SeedProductId, { name: string; description: string }>
  emailTemplates: Record<SeedTemplateId, { name: string; subject: string; body: string }>
  quickReplies: Record<SeedQuickReplyId, { title: string; body: string }>
  automations: Record<SeedAutomationId, SeedAutomationDemoCopy>
  sequences: Record<SeedSequenceId, SeedSequenceDemoCopy>
  customFields: Record<string, SeedCustomFieldDemo>
  /** Demo org + seed user job titles (names stay aligned with `assignedTo` in seed data). */
  demoAuth?: SeedDemoAuthOverlay
  demoCompanies?: Record<string, SeedCompanyDemoOverlay>
  demoContacts?: Record<string, SeedContactDemoOverlay>
  demoDeals?: Record<string, SeedDealDemoOverlay>
  demoActivities?: Record<string, SeedActivityDemoOverlay>
  demoEmails?: Record<string, SeedEmailDemoOverlay>
}

export interface Translations {
  // ─── Navigation ──────────────────────────────────────────────────────────────
  nav: {
    dashboard: string
    leads: string
    contacts: string
    companies: string
    deals: string
    timeline: string
    calendar: string
    activities: string
    followUps: string
    goals: string
    notifications: string
    inbox: string
    reports: string
    managerDashboard: string
    forecast: string
    leaderboard: string
    templates: string
    sequences: string
    aiAssistant: string
    team: string
    products: string
    automations: string
    settings: string
    audit: string
    collapse: string
    expand: string
    collapseSidebar: string
    expandSidebar: string
  }

  // ─── Nav Sections ────────────────────────────────────────────────────────────
  navSections: {
    main: string
    sales: string
    comms: string
    ai: string
    config: string
  }

  // ─── Common ──────────────────────────────────────────────────────────────────
  common: {
    search: string
    filters: string
    clear: string
    save: string
    cancel: string
    delete: string
    edit: string
    create: string
    close: string
    confirm: string
    actions: string
    name: string
    email: string
    phone: string
    status: string
    notes: string
    tags: string
    createdAt: string
    updatedAt: string
    noResults: string
    loading: string
    skipToMain: string
    envBannerStaging: string
    envBannerDemo: string
    export: string
    import: string
    reset: string
    view: string
    all: string
    selected: string
    selectAll: string
    select: string
    assignedTo: string
    back: string
    details: string
    add: string
    remove: string
    yes: string
    no: string
    ok: string
    or: string
    and: string
    of: string
    total: string
    showing: string
    from: string
    to: string
    previous: string
    next: string
    date: string
    type: string
    description: string
    value: string
    priority: string
    active: string
    inactive: string
    enabled: string
    disabled: string
    changeStatus: string
    bulkDelete: string
    bulkDeleteConfirm: string
    nSelected: string
    searchPlaceholder: string
    continue: string
    notAvailable: string
    unassigned: string
  }

  // ─── Contact ─────────────────────────────────────────────────────────────────
  contacts: {
    title: string
    newContact: string
    createContact: string
    editContact: string
    firstName: string
    lastName: string
    jobTitle: string
    company: string
    source: string
    score: string
    lastContacted: string
    duplicates: string
    duplicatesFound: string
    noDuplicates: string
    merge: string
    myContacts: string
    noCompany: string
    emptyTitle: string
    emptyDescription: string
    deleteConfirm: string
    created: string
    updated: string
    deleted: string
    bulkDeleted: string
    bulkEmailQueue: string
    bulkEmailSubject: string
    bulkEmailBody: string
    bulkEmailEnqueue: string
    bulkEmailMarketingHint: string
    bulkEmailStaggerLabel: string
    bulkEmailEnqueuedSummary: string
    bulkEmailNeedSupabase: string
    statusLabels: {
      prospect: string
      customer: string
      churned: string
    }
    sourceLabels: {
      website: string
      referral: string
      outbound: string
      event: string
      linkedin: string
      other: string
    }
  }

  leads: {
    title: string
    addLead: string
    createLead: string
    firstName: string
    lastName: string
    company: string
    leadInbox: string
    scoringRules: string
    noScoringRules: string
    allowDemotion: string
    searchPlaceholder: string
    allStages: string
    allScores: string
    hot: string
    warm: string
    cold: string
    noLeads: string
    /** Extra line under empty inbox */
    emptyInboxHint: string
    loadingLeads: string
    scoreAction: string
    scoreActionHint: string
    timelineAction: string
    convertAction: string
    convertActionHint: string
    scoreBreakdownAction: string
    timelineTitle: string
    scoreBreakdownTitle: string
    scoreHistory: string
    noEvents: string
    noScoreInsight: string
    enabled: string
    refresh: string
    confidence: string
    baselineSignals: string
    eventScore: string
    recentSignals: string
    confidenceLevels: {
      high: string
      medium: string
      low: string
    }
    stageLabels: {
      subscriber: string
      lead: string
      mql: string
      sql: string
      opportunity: string
      customer: string
    }
  }

  // ─── Company ─────────────────────────────────────────────────────────────────
  companies: {
    title: string
    name: string
    newCompany: string
    editCompany: string
    domain: string
    domainPlaceholder: string
    industry: string
    size: string
    country: string
    city: string
    website: string
    websiteUrlPlaceholder: string
    revenue: string
    contactCount: string
    dealCount: string
    emptyTitle: string
    deleteConfirm: string
    created: string
    updated: string
    deleted: string
    bulkDeleted: string
    statusLabels: {
      prospect: string
      customer: string
      partner: string
      churned: string
    }
    industryLabels: {
      fintech: string
      saas: string
      consulting: string
      insurance: string
      banking: string
      retail: string
      healthcare: string
      other: string
    }
  }

  // ─── Deal ────────────────────────────────────────────────────────────────────
  deals: {
    title: string
    newDeal: string
    editDeal: string
    stage: string
    probability: string
    expectedClose: string
    contact: string
    company: string
    pipeline: string
    kanban: string
    list: string
    won: string
    lost: string
    aging: string
    daysInStage: string
    quote: string
    quoteBuilder: string
    addItem: string
    subtotal: string
    discount: string
    quoteNumber: string
    vatPercent: string
    validityDays: string
    taxableBase: string
    withholdingPercent: string
    documentType: string
    documentTypeQuote: string
    documentTypeInvoice: string
    documentTypeProforma: string
    lineDescriptionPlaceholder: string
    clientTaxIdPlaceholder: string
    contactPersonPlaceholder: string
    clientAddressPlaceholder: string
    globalDiscountPlaceholder: string
    paymentDaysPlaceholder: string
    paymentMethodPlaceholder: string
    referencePlaceholder: string
    bankNamePlaceholder: string
    ibanPlaceholder: string
    accountHolderPlaceholder: string
    lateFeeClausePlaceholder: string
    acceptanceClausePlaceholder: string
    additionalNotesPlaceholder: string
    clientData: string
    referenceShort: string
    lineDiscountLabel: string
    globalDiscountLabel: string
    termsAndConditions: string
    validityLabel: string
    paymentMethodLabel: string
    paymentTermLabel: string
    bankDetailsLabel: string
    lateFeeLabel: string
    acceptanceClauseLabel: string
    notesLabel: string
    pageLabel: string
    emptyTitle: string
    emptyDescription: string
    deleteConfirm: string
    created: string
    updated: string
    deleted: string
    dragDealsHere: string
    stageLabels: {
      lead: string
      qualified: string
      proposal: string
      negotiation: string
      closed_won: string
      closed_lost: string
    }
    priorityLabels: {
      low: string
      medium: string
      high: string
    }
    /** Plain-text quote email draft (Gmail compose) — use `{dealTitle}` where needed */
    quoteEmailGreeting: string
    quoteEmailBodyIntro: string
    quoteEmailSignOff: string
    quoteEmailSubject: string
    quoteEmailTaxIdPrefix: string
    quoteEmailBillingEmailPrefix: string
    quoteEmailBillingPhonePrefix: string
    /** Default quote form values (reset when language changes in QuoteBuilder) */
    quoteDefaultPaymentMethod: string
    quoteDefaultLateFeeClause: string
    quoteDefaultAcceptanceClause: string
    quotePdfWebPrefix: string
    quotePdfContactEmailPrefix: string
    quotePdfTotalLabel: string
    /** e.g. VAT ({percent}%) — `{percent}` replaced at runtime */
    quotePdfVatRow: string
    quotePdfWithholdingRow: string
  }

  // ─── Activity ────────────────────────────────────────────────────────────────
  activities: {
    title: string
    newActivity: string
    editActivity: string
    subject: string
    outcome: string
    dueDate: string
    completedAt: string
    overdue: string
    upcoming: string
    completed: string
    pending: string
    cancelled: string
    emptyTitle: string
    emptyDescription: string
    typeLabels: {
      call: string
      email: string
      meeting: string
      note: string
      task: string
      linkedin: string
    }
    statusLabels: {
      pending: string
      completed: string
      cancelled: string
    }
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  dashboard: {
    title: string
    totalContacts: string
    openDeals: string
    pipelineValue: string
    wonThisMonth: string
    revenueByMonth: string
    dealFunnel: string
    recentActivities: string
    topDeals: string
    activityHeatmap: string
    quickActions: string
    newContact: string
    newDeal: string
    newActivity: string
    monthlyQuota: string
    quotaProgress: string
    dayLabels: string[]
    salesVelocity: string
    conversionRate: string
    teamLeaderboard: string
    latestNotifications: string
    closed: string
    remaining: string
    avgCloseTime: string
    days: string
    dealsClosedLabel: string
    activeDealsLabel: string
    heatmapLess: string
    heatmapMore: string
    viewAll: string
    viewPipeline: string
    viewNotifications: string
    noData: string
    onboardingBannerTitle: string
    onboardingBannerBody: string
    onboardingBannerSettings: string
    onboardingBannerDismiss: string
  }

  managerDashboard: {
    title: string
    subtitle: string
    methodologyHint: string
    mqlCount: string
    sqlCount: string
    sqlShare: string
    sqlShareHint: string
    heatmapTitle: string
    heatmapHint: string
    stage: string
    bucket0_7: string
    bucket8_14: string
    bucket15_30: string
    bucket31p: string
    responseTitle: string
    responseHint: string
    responseNoData: string
    medianHours: string
    linkReports: string
    /** Suffix after median hours value, e.g. "h" */
    hoursAbbrev: string
  }

  // ─── Calendar ────────────────────────────────────────────────────────────────
  calendar: {
    title: string
    today: string
    month: string
    week: string
    day: string
    hour: string
    allDay: string
    newEvent: string
    noEvents: string
  }

  // ─── Settings ────────────────────────────────────────────────────────────────
  settings: {
    title: string
    general: string
    currency: string
    language: string
    languageModeBrowser: string
    languageModeManual: string
    languageModeHelp: string
    theme: string
    themeSystem: string
    themeLight: string
    themeDark: string
    uiDensity: string
    uiDensityComfortable: string
    uiDensityCompact: string
    uiDensityHelp: string
    tags: string
    addTag: string
    pipeline: string
    customFields: string
    fieldName: string
    fieldType: string
    entityType: string
    required: string
    placeholder: string
    options: string
    aiConfig: string
    apiKey: string
    apiKeyPlaceholder: string
    gmailIntegration: string
    connected: string
    disconnected: string
    connect: string
    disconnect: string
    notifications: string
    importExport: string
    exportData: string
    importData: string
    resetData: string
    resetConfirm: string
    dangerZone: string
    entityLabels: {
      contact: string
      company: string
      deal: string
    }
    fieldTypeLabels: {
      text: string
      number: string
      date: string
      select: string
      multiselect: string
      checkbox: string
      url: string
      email: string
      currency: string
      textarea: string
    }
    notifTypeLabels: {
      deal_won: string
      deal_lost: string
      deal_stage_changed: string
      activity_overdue: string
      activity_assigned: string
      follow_up_due: string
      contact_assigned: string
      goal_achieved: string
      goal_at_risk: string
      mention: string
      system: string
    }
    // ── Additional text used in Settings page ─────────────────────────
    apiKeyConfigured: string
    apiKeyHint: string
    gmailConnected: string
    gmailDisconnected: string
    gmailConnectionActive: string
    gmailEnterClientId: string
    gmailConnectedSuccess: string
    gmailSetupTitle: string
    gmailSetupStep1: string
    gmailSetupStep2: string
    gmailSetupStep3: string
    gmailSetupStep4: string
    placeholderGoogleOAuthClientId: string
    placeholderEmailSignatureHtml: string
    placeholderBrandingDomain: string
    placeholderPrivacyPolicyUrl: string
    placeholderTermsUrl: string
    fieldPlaceholderHint: string
    optionsPlaceholder: string
    valuePlaceholderHint: string
    requiredToggleOn: string
    requiredToggleOff: string
    activeToggleOn: string
    activeToggleOff: string
    editField: string
    deleteField: string
    newTagPlaceholder: string
    deleteTagAriaLabel: string
    users: string
    usersAuthHint: string
    branding: string
    appName: string
    primaryColor: string
    logoUrl: string
    customDomain: string
    privacyUrl: string
    termsUrl: string
    resetBranding: string
    permissionProfiles: string
    permissionProfilesHint: string
    permissionsUpdated: string
    pipelineReorderHint: string
    pipelineStageProtected: string
    pipelineStageDeleteHint: string
    currencyLabels: {
      eur: string
      usd: string
      gbp: string
    }
    leadOpsTitle: string
    leadOpsSubtitle: string
    leadOpsLastSuccess: string
    leadOpsSlaLabel: string
    leadOpsSlaHours: string
    leadOpsRecentErrors: string
    leadOpsNoRuns: string
    leadOpsAllOrgs: string
    leadOpsSingleOrg: string
    leadOpsProcessed: string
    leadOpsJustNow: string
    leadOpsMinsAgo: string
    leadOpsHoursAgo: string
    leadOpsDaysAgo: string
    leadOpsNotAvailable: string
    leadOpsHealthy: string
    leadOpsBreached: string
    leadOpsFilterAll: string
    leadOpsFilterSuccess: string
    leadOpsFilterRunning: string
    leadOpsFilterError: string
    leadOpsMailboxScope: string
    leadOpsMailboxPrivate: string
    leadOpsMailboxPrivateHint: string
    emailProviderHealth: string
    emailSyncState: string
    emailLastSync: string
    emailLastError: string
    emailSignatures: string
    signatureName: string
    signatureHtml: string
    signatureDefault: string
    signatureSetDefault: string
    signatureSaved: string
    signatureDeleted: string
    signatureNamePlaceholder: string
    signatureToolbarBold: string
    signatureToolbarItalic: string
    signatureToolbarLink: string
    signatureToolbarImage: string
    signatureMergeFieldsTitle: string
    signatureMergeFieldsHelp: string
    tabGeneral: string
    tabBranding: string
    tabPipeline: string
    tabEmail: string
    tabPermissions: string
    tabData: string
    tabNavigation: string
    tabAdvanced: string
    tabWebhooks: string
    tabOnboarding: string
    onboardingTitle: string
    onboardingIntro: string
    onboardingStepImport: string
    onboardingStepDeal: string
    onboardingStepSequence: string
    onboardingMarkDone: string
    onboardingMarkTodo: string
    onboardingReset: string
    onboardingGoContacts: string
    onboardingGoDeals: string
    onboardingGoSequences: string
    webhooksTitle: string
    webhooksIntro: string
    webhooksRequiresSupabase: string
    webhooksCronHint: string
    webhooksCreateSection: string
    webhooksName: string
    webhooksTargetUrl: string
    webhooksSigningSecret: string
    webhooksEventFilters: string
    webhooksEventFiltersHint: string
    webhooksCustomHeadersJson: string
    webhooksCustomHeadersHint: string
    webhooksCreate: string
    webhooksCreated: string
    webhooksLoadError: string
    webhooksListTitle: string
    webhooksListEmpty: string
    webhooksEnabled: string
    webhooksLastStatus: string
    webhooksTest: string
    webhooksTestOk: string
    webhooksTestFail: string
    webhooksDelete: string
    webhooksDeleteConfirm: string
    webhooksSecretMin: string
    webhooksInvalidHeadersJson: string
    webhooksRotateTitle: string
    webhooksRotateIntro: string
    webhooksNewSecret: string
    webhooksRotateSubmit: string
    webhooksRotated: string
    legalCompanyName: string
    taxIdVat: string
    addressLine1: string
    postalCode: string
    billingEmail: string
    billingPhone: string
    quoteFooter: string
    quoteFooterPlaceholder: string
    navEditorTitle: string
    navEditorSubtitle: string
    navNewGroup: string
    navReset: string
    navBaseSections: string
    navCustomGroups: string
    navNoCustomGroups: string
    navSectionHidden: string
    navSectionVisible: string
    navGroupName: string
    navGroupIcon: string
    navItemsCount: string
    navRoleRules: string
    navAddLink: string
    navDeleteGroup: string
    navMoveUp: string
    navMoveDown: string
    navLabel: string
    navRoute: string
    navSavedViews: string
    permissionActionLabels: {
      read: string
      create: string
      update: string
      delete: string
      export: string
      send: string
      link: string
      move: string
      enroll: string
      use: string
      manage_roles: string
      invite: string
      csv: string
      json: string
    }
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────
  reports: {
    title: string
    salesOverview: string
    performance: string
    pipeline: string
    conversionRate: string
    activityReport: string
    periodLabel: string
    thisMonth: string
    lastMonth: string
    thisQuarter: string
    thisYear: string
    emailTrackingTitle: string
    emailTrackingSubtitle: string
    emailTrackingServerBadge: string
    /** Same header slot as server badge when analytics run in local demo mode */
    emailTrackingDemoBadge: string
    emailTrackingOpens: string
    emailTrackingClicks: string
    emailTrackingPrivacyNote: string
    emailTrackingEmpty: string
    emailTrackingLoadError: string
    emailTrackingNotConfigured: string
    emailTrackingReliabilityNote: string
  }

  csvImport: {
    title: string
    rows: string
    contacts: string
    companies: string
    downloadTemplate: string
    dropTitle: string
    dropSubtitle: string
    dropHint: string
    expectedFieldsFor: string
    mapColumns: string
    doNotMap: string
    requiredFieldsWarning: string
    back: string
    preview: string
    previewRows: string
    toImport: string
    importRecords: string
    importing: string
    completed: string
    importedSummary: string
    importMore: string
    close: string
  }

  // ─── Other pages ─────────────────────────────────────────────────────────────
  followUps: {
    title: string
    urgency: string
    daysSince: string
    /** `{days}` = number of days since last contact */
    daysSinceBadge: string
    suggestedAction: string
    critical: string
    high: string
    medium: string
    low: string
  }

  goals: {
    title: string
    revenue: string
    dealsClosed: string
    activitiesCompleted: string
    contactsAdded: string
    monthly: string
    quarterly: string
    yearly: string
    progress: string
    onTrack: string
    atRisk: string
    behind: string
    targetValuePlaceholder: string
  }

  forecast: {
    title: string
    weighted: string
    bestCase: string
    committed: string
    expected: string
    /** Pipeline health composite (0–100), subtitle under section title */
    healthScoreSubtitle: string
    /** Tier labels for pipeline health score bands */
    healthExcellent: string
    healthGood: string
    healthFair: string
    healthLow: string
    /** After a count: "3 deals" / "3 oportunidades" */
    closingDealsSuffix: string
    /** Shown when month-over-month growth cannot be computed (insufficient history) */
    growthUnavailable: string
  }

  leaderboard: {
    title: string
    rank: string
    user: string
    dealsWon: string
    revenue: string
    conversionRate: string
    subtitle: string
    podiumTitle: string
    fullRanking: string
    teamAchievements: string
    achievementsLegend: string
    achievements: string
    salesRep: string
    activePipeline: string
    activities: string
    successRate: string
    score: string
    totalRevenue: string
    thisMonth: string
    thisQuarter: string
    thisYear: string
    success: string
    // Badge labels
    firstDeal: string
    firstDealDesc: string
    winStreak: string
    winStreakDesc: string
    activityMachine: string
    activityMachineDesc: string
    topPerformer: string
    topPerformerDesc: string
    bigDeal: string
    bigDealDesc: string
    // Achievement descriptions for the badges section
    firstDealFull: string
    winStreakFull: string
    activityMachineFull: string
    topPerformerFull: string
    bigDealFull: string
    // Stats
    teamStats: string
    noAchievements: string
  }

  sequences: {
    title: string
    newSequence: string
    steps: string
    enrolled: string
    active: string
    paused: string
    /** Link label to Automations (same nav area) */
    crossLinkAutomations: string
    /** Empty list / right pane hint */
    emptyDescription: string
    toastSequenceDeleted: string
    /** Interpolation: `{name}`, `{sequence}` */
    toastEnrolled: string
  }

  automations: {
    title: string
    newRule: string
    trigger: string
    action: string
    executionCount: string
    lastExecuted: string
    libraryTitle: string
    librarySubtitle: string
    useTemplate: string
    crossLinkSequences: string
    emptyRulesDescription: string
    statInactiveRules: string
    executionLogTitle: string
    executionLogRuleId: string
    toastRuleCreated: string
    toastRuleUpdated: string
    toastRuleDeleted: string
    toastTemplateAdded: string
    executionStatusOk: string
    executionStatusFailed: string
    /** Interpolation: `{ruleName}` */
    runtimeActivityDescription: string
    /** Interpolation: `{dealTitle}` */
    runtimeActivitySubjectFallback: string
    runtimeCreatedBy: string
    /** Interpolation: `{ruleName}` */
    runtimeNotificationTitleFallback: string
    /** Interpolation: `{dealTitle}`, `{ruleName}` */
    runtimeNotificationMessageFallback: string
  }

  /** Template library (automations + sequences by situation) */
  workflowTemplates: {
    dialogTitle: string
    dialogSubtitle: string
    browseButton: string
    filterAll: string
    filterAutomations: string
    filterSequences: string
    searchPlaceholder: string
    install: string
    toastAutomationInstalled: string
    toastSequenceInstalled: string
    categories: {
      deal_motion: string
      nurture: string
      recovery: string
    }
    situations: {
      proposalFollowUp: string
      dealWonNotify: string
      negotiationReview: string
      coldOutreach: string
      winback: string
      dealQualification: string
      executiveFastTrack: string
      lostDealDebrief: string
      pipelineReviewAlert: string
      customerKickoffPrep: string
      scopeResetRecycle: string
      negotiationRollback: string
      postDemoNurture: string
      accountExpansion: string
      noShowRecovery: string
    }
  }

  products: {
    title: string
    newProduct: string
    sku: string
    price: string
    category: string
    /** No products in catalog */
    emptyNoProducts: string
    /** Search/filter returned nothing */
    emptyFiltered: string
    categoryLabels: {
      software: string
      hardware: string
      service: string
      consulting: string
      support: string
      other: string
    }
  }

  team: {
    title: string
    members: string
    role: string
    permissions: string
    invite: string
    roleLabels: {
      admin: string
      manager: string
      sales_rep: string
      viewer: string
    }
    roleDescriptions: {
      admin: string
      manager: string
      sales_rep: string
      viewer: string
    }
    // ── Extended keys used by TeamManagement ──────────────────────────────
    newUser: string
    createUser: string
    inviteByEmail: string
    invitationValidity: string
    pendingInvitations: string
    expires: string
    activeSection: string
    activeMembersCount: string
    inactiveSection: string
    you: string
    noJobTitle: string
    lastLogin: string
    never: string
    changeRole: string
    resetPassword: string
    deactivateUser: string
    reactivate: string
    planInfo: string
    // Labels for the add-user / invite forms
    labelName: string
    labelEmail: string
    labelPassword: string
    labelJobTitle: string
    // Placeholders
    placeholderFullName: string
    placeholderEmail: string
    placeholderMinPassword: string
    placeholderPhoneExample: string
    placeholderJobTitle: string
    placeholderNewPassword: string
    // Toast messages
    toastFillRequired: string
    toastPasswordMin: string
    toastUserCreated: string
    toastUserCreateError: string
    toastEnterEmail: string
    toastInviteSent: string
    toastPasswordMin6: string
    toastPasswordReset: string
    toastInviteCancelled: string
    toastUserDeactivated: string
    toastUserReactivated: string
    toastRoleUpdated: string
  }

  audit: {
    title: string
    subtitle: string
    action: string
    entity: string
    user: string
    timestamp: string
    empty: string
    emptyFiltered: string
    systemUser: string
  }

  emailTemplates: {
    title: string
    newTemplate: string
    quickReplies: string
    quickReplyTitlePlaceholder: string
    quickReplyBodyPlaceholder: string
    category: string
    variables: string
    usageCount: string
    categoryLabels: {
      follow_up: string
      intro: string
      proposal: string
      closing: string
      nurture: string
      custom: string
    }
    previewSamples: {
      firstName: string
      lastName: string
      company: string
      dealTitle: string
      dealValue: string
    }
  }

  inbox: {
    title: string
    compose: string
    sent: string
    drafts: string
    sendFailed: string
    snoozed: string
    noMessages: string
    markRead: string
    markUnread: string
    archive: string
    trash: string
    replyAll: string
    pinnedLink: string
    autoLink: string
    pinLink: string
    unpin: string
    saveLink: string
    contactPlaceholder: string
    dealPlaceholder: string
    useMatchedDeal: string
    refreshInbox: string
    selectThread: string
    selectMessage: string
    selectedCount: string
    threadUpdated: string
    appliedToThreads: string
    appliedToMessages: string
    followUpCreated: string
    noEntityToPin: string
    pinnedLinkRemoved: string
    manualLinkSaved: string
    downloadAttachmentError: string
    attachments: string
    crmSentInThread: string
    scheduled: string
    unknownSender: string
    clicks: string
    searchPlaceholder: string
    searchOperatorsHint: string
    loadMore: string
    disconnectError: string
    mailboxScopePrivate: string
    mailboxOnly: string
    mailboxOwner: string
    mailboxPrivacyHint: string
    mailboxVisibleCount: string
    hasAttachments: string
    onlyMine: string
    savedViews: string
    savedViewNamePlaceholder: string
    savedViewCreated: string
    syncHealthy: string
    syncSyncing: string
    syncStale: string
    syncError: string
    snoozeOneDay: string
    snoozeOneHour: string
    snoozeOneWeek: string
    trackingDemoSimulate: string
    trackingServerMetricsHint: string
    /** Mobile: return from message to list */
    backToMailbox: string
    /** Thread header: message count */
    messageCount: string
    /** a11y: folder navigation landmark */
    foldersNavLabel: string
    /** a11y: thread list region */
    threadListLabel: string
    listTotalThreads: string
    listVisibleOfTotal: string
    listTotalMessages: string
    listVisibleMessages: string
    folderUnreadTooltip: string
    folderTotalTooltip: string
    /** a11y: reading pane region */
    readingPaneLabel: string
    /** Collapsible search help summary */
    searchSyntaxHelp: string
    /** Reading pane when nothing selected */
    readingPaneSelectTitle: string
    readingPaneSelectHint: string
    /** Snoozed folder empty secondary line */
    snoozedFolderEmptyHint: string
    /** Reply action (short) */
    reply: string
    threadShowFullMessage: string
    threadCollapseMessage: string
    threadMessageListLabel: string
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────
  auth: {
    login: string
    register: string
    logout: string
    email: string
    password: string
    currentPassword: string
    newPassword: string
    confirmPassword: string
    forgotPassword: string
    rememberMe: string
    loginButton: string
    registerButton: string
    noAccount: string
    hasAccount: string
    profile: string
    editProfile: string
    forgotPasswordTitle: string
    resetPasswordPageTitle: string
    checkEmailTitle: string
    checkEmailSent: string
    checkEmailInstructions: string
    sendLink: string
    backToLogin: string
    realAuthEnabled: string
    /** Shown on login when offline demo channel (same pill slot as real auth). */
    demoModeBadge: string
    emailPlaceholder: string
    checkEmailConfirmation: string
    passwordsDoNotMatch: string
    passwordMinLength: string
    savePassword: string
    sso: string
    saml: string
    samlDomainPlaceholder: string
    useSaml: string
    connecting: string
    companyDomainRequired: string
    demoLogin: string
    landingTagline: string
    landingFeature1: string
    landingFeature2: string
    landingFeature3: string
    demoCredentialsTitle: string
    googleSsoUseCompanySso: string
    googleSsoUnavailable: string
    passwordShowAria: string
    passwordHideAria: string
  }

  // ─── Org Setup ───────────────────────────────────────────────────────────────
  orgSetup: {
    title: string
    subtitle: string
    orgNameLabel: string
    orgNamePlaceholder: string
    slugLabel: string
    slugPrefix: string
    slugPlaceholder: string
    slugHint: string
    legalCompanyName: string
    taxIdVat: string
    addressLine1: string
    city: string
    country: string
    billingEmail: string
    billingPhone: string
    createButton: string
    errorNameRequired: string
    errorSlugRequired: string
    errorNotConfigured: string
    errorNotAuthenticated: string
    errorCompleteLegalProfile: string
  }

  // ─── Invitations ─────────────────────────────────────────────────────────────
  invitations: {
    invalidToken: string
    invalidOrExpired: string
    alreadyAccepted: string
    expired: string
  }

  acceptInvite: {
    invalidTitle: string
    loginCta: string
    welcomeTo: string
    redirecting: string
    joinOrg: string
    invitedToTeam: string
    organization: string
    assignedRole: string
    acceptCta: string
    roleAdmin: string
    roleManager: string
    roleSalesRep: string
    roleViewer: string
  }

  errorBoundary: {
    title: string
    fallbackDescription: string
    retry: string
  }

  commandPalette: {
    dealsCategory: string
    navigateHint: string
    openHint: string
    closeHint: string
  }

  // ─── Errors ──────────────────────────────────────────────────────────────────
  errors: {
    supabaseNotConfigured: string
    /** Shown on auth screens when Supabase env is missing and demo mode is off */
    supabaseNotConfiguredDetail: string
    generic: string
    gmailConnectionError: string
    gmailThreadsLoadError: string
    invitationSendError: string
    duplicateTag: string
    noPermissionTitle: string
    noPermissionDescription: string
    userNotFound: string
    accountDeactivated: string
    wrongPassword: string
    wrongCurrentPassword: string
    emailAlreadyExists: string
    notAuthenticated: string
    userLimitReached: string
    invitationNotFound: string
    invitationUsedOrExpired: string
    invitationExpired: string
    invalidRecipientEmail: string
    invalidReplyToEmail: string
    emptyServerResponse: string
    unknownError: string
    defaultUserDisplayName: string
    memberWithoutName: string
    tenantInvitationWithOrg: string
    tenantInvitationGeneric: string
    /** Fatal misconfiguration before router mounts (production/staging without Supabase) */
    configurationBootstrapTitle: string
    configurationBootstrapUses: string
    configurationBootstrapOr: string
    configurationBootstrapRequiresValid: string
    configurationBootstrapAnd: string
    configurationBootstrapDemoIntro: string
    configurationBootstrapDemoOutro: string
    configurationBootstrapFooter: string
  }

  /** Short descriptions written to the in-app audit log */
  auditMessages: {
    activityCreated: string
    activityDeleted: string
    activityCompleted: string
    contactCreated: string
    contactUpdated: string
    contactDeleted: string
    dealCreated: string
    dealUpdated: string
    dealDeleted: string
    /** `{stage}` = localized stage label */
    dealMovedTo: string
    emailSent: string
    /** `{role}` = new role key/label */
    roleChangedTo: string
    /** `{from}` `{to}` numeric scores */
    leadScoreRecomputed: string
  }

  attachments: {
    fileTooLarge: string
    fileAttached: string
    fileRemoved: string
    fileSizeB: string
    fileSizeKb: string
    fileSizeMb: string
  }

  dealSync: {
    emptyInsertResponse: string
    /** Appended after server `message` (with a period before this suffix). */
    dealSavedRetrySuffix: string
  }

  dealNotifications: {
    wonTitle: string
    wonMessage: string
    lostTitle: string
    lostMessage: string
    stageTitle: string
    stageMessage: string
  }

  notificationSeeds: {
    dealWonTitle: string
    dealWonMessage: string
    dealStageTitle: string
    dealStageMessage: string
    activityOverdueTitle: string
    activityOverdueMessage: string
    goalAchievedTitle: string
    goalAchievedMessage: string
    welcomeTitle: string
    welcomeMessage: string
    triggeredBySystem: string
  }

  /** Zod / react-hook-form validation messages */
  formErrors: {
    invalidEmail: string
    contactFirstNameRequired: string
    contactLastNameRequired: string
    contactAssignedToRequired: string
    activitySubjectRequired: string
    activityCreatedByRequired: string
    dealTitleRequired: string
    dealValueRequired: string
    dealStageRequired: string
    dealStageInvalid: string
    dealExpectedCloseRequired: string
    dealAssignedToRequired: string
    companyNameRequired: string
    companyIndustryRequired: string
  }

  // ─── Email ───────────────────────────────────────────────────────────────────
  email: {
    gmailApiLabel: string
    googleClientIdLabel: string
    ccLabel: string
    bccLabel: string
    replyToLabel: string
    undoSendHint: string
    undoSend: string
    undoSendSuccess: string
    draftSaved: string
    closeComposer: string
    discardDraftConfirm: string
    addFile: string
    sendLater: string
    scheduleSendTime: string
    attachHint: string
    emailScheduled: string
    sentLocalFallback: string
    senderNamePlaceholder: string
    useSignature: string
    signaturePlaceholder: string
    signatureSelectLabel: string
    subjectPresetFollowUp: string
    subjectPresetNextSteps: string
    subjectPresetProposal: string
    /** Composer: explain why Send is disabled */
    sendDisabledHint: string
    scheduleSendDisabledHint: string
    /** Must connect Gmail before sending (Gmail provider) */
    connectGmailToSend: string
    /** Toggle: track opens/clicks (not CRM follow-up tasks) */
    openEmailTracking: string
    /** Composer — Pipedrive-style layout */
    composerFrom: string
    composerInsertField: string
    composerTemplatesToolbar: string
    crmLinkTitle: string
    crmLinkHint: string
    formatBold: string
    formatItalic: string
    formatBulletList: string
    formatToolbarLabel: string
    formatUnderline: string
    formatStrikethrough: string
    formatNumberedList: string
    formatQuote: string
    formatIndent: string
    formatOutdent: string
    formatInsertLink: string
    formatInsertImage: string
    formatClear: string
    formatUndo: string
    formatRedo: string
    promptLinkUrl: string
    promptLinkText: string
    promptImageUrl: string
    promptImageAlt: string
    send: string
    discardComposer: string
  }

  // ─── Notifications page ──────────────────────────────────────────────────────
  notifications: {
    unread: string
    markAllRead: string
    clearAll: string
    emptyTitle: string
    emptyDescription: string
    /** Shown when filters yield no notifications */
    emptyHint: string
    today: string
    older: string
    markRead: string
  }

  // ─── Pipeline Timeline page ──────────────────────────────────────────────────
  // ─── Default Smart Views ─────────────────────────────────────────────────────
  views: {
    sv01: string
    sv02: string
    sv03: string
    sv04: string
    sv05: string
  }

  timeline: {
    title: string
    subtitle: string
    dealsInView: string
    totalPipeline: string
    weightedForecast: string
    expectedWinRate: string
    allStages: string
    allSalesReps: string
    dealColumn: string
    noDealsTitle: string
    noDealsHint: string
    closeLabel: string
    probabilityShort: string
  }

  seedDemo: SeedDemoCatalog

  // Additional inbox labels used by inbox views/actions
  // (kept here to preserve existing translation structure)
}
