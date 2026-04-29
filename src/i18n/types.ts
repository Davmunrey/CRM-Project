export type Language = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it'

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

/** Built-in automation / sequence templates + starter custom-field labels (not tenant CRM data). */
export interface WorkflowLibraryCatalog {
  automations: Record<SeedAutomationId, SeedAutomationDemoCopy>
  sequences: Record<SeedSequenceId, SeedSequenceDemoCopy>
  customFields: Record<string, SeedCustomFieldDemo>
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
    /** Settings → Integrations (Google) */
    integrations: string
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

  /** Product identity (Velo). `productName` is the commercial proper noun. */
  brand: {
    productName: string
    defaultAppName: string
    productTagline: string
  }

  // ─── Common ──────────────────────────────────────────────────────────────────
  common: {
    search: string
    filters: string
    clear: string
    save: string
    copied: string
    copy: string
    cancel: string
    delete: string
    edit: string
    create: string
    close: string
    /** Invisible overlay that closes a menu or popup (accessibility). */
    closeMenu: string
    /** Compact placeholder for empty table cells or missing values (e.g. hyphen). */
    emptyCell: string
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
    export: string
    /** Short label for CSV download buttons (e.g. toolbar). */
    csv: string
    import: string
    reset: string
    refresh: string
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
    /** Shown when Supabase delete fails (e.g. RLS); list is refreshed after. */
    deleteFailed: string
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
    duplicates: string
    duplicatesFound: string
    noDuplicates: string
    merge: string
    sortIndustry: string
    sortUpdated: string
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
    /** Plain-text quote email draft (Gmail compose) - use `{dealTitle}` where needed */
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
    /** e.g. VAT ({percent}%) - `{percent}` replaced at runtime */
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
    signatureEditorLinkPrompt: string
    signatureEditorVisualHint: string
    signatureEditorPreviewLabel: string
    signatureEditorPreviewEmpty: string
    /** Default when opening compose / new sequence email (no per-step override) */
    composerSignatureDefaultLabel: string
    composerSignatureDefaultAutomatic: string
    composerSignatureDefaultManual: string
    composerSignatureDefaultHelp: string
    tabGeneral: string
    tabBranding: string
    tabPipeline: string
    tabEmail: string
    tabPermissions: string
    tabSecurity: string
    mfaTitle: string
    mfaDescription: string
    mfaEnroll: string
    mfaUnenroll: string
    mfaFactorName: string
    mfaScanQr: string
    mfaEnterCode: string
    mfaEnrolled: string
    mfaNotEnrolled: string
    mfaConfirmEnroll: string
    mfaToastEnrolled: string
    mfaToastUnenrolled: string
    tabData: string
    tabNavigation: string
    tabAdvanced: string
    tabWebhooks: string
    tabIntegrations: string
    integrationsPageTitle: string
    integrationsPageSubtitle: string
    googleCardTitle: string
    googleCardBlurb: string
    googleCardFeatures: string
    googleGmailStatus: string
    googleCalendarCardTitle: string
    googleCalendarCardBlurb: string
    googleCalendarCardBlurbLocked: string
    googleCalendarConnect: string
    googleCalendarOpening: string
    googleCalendarLocked: string
    googleCalendarActive: string
    googleConnect: string
    googleOpening: string
    googleConnected: string
    googleDisconnect: string
    googleDisconnectConfirm: string
    googlePermissionsHeading: string
    googlePermGmailRead: string
    googlePermGmailSend: string
    googlePermGmailCompose: string
    googlePermGmailModify: string
    googlePermCalendar: string
    googlePermissionsRevokeHint: string
    gmailConnectViaIntegrations: string
    gmailOpenIntegrations: string
    backToSettings: string
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
    activationFunnelTitle: string
    activationFunnelSubtitle: string
    activationHealthLabel: string
    activationLoginLabel: string
    activationOrgSetupLabel: string
    activationResetLabel: string
    activationFunnelHint: string
    webhooksTitle: string
    webhooksIntro: string
    webhooksTagline: string
    webhooksRequiresSupabase: string
    webhooksCronHint: string
    webhooksCronHintTitle: string
    webhooksCreateSection: string
    webhooksName: string
    webhooksTargetUrl: string
    webhooksSigningSecret: string
    webhooksSigningSecretHelpToggle: string
    webhooksSigningSecretHelpP1: string
    webhooksSigningSecretHelpP2: string
    webhooksSigningSecretHelpP3: string
    webhooksEventFilters: string
    webhooksEventFiltersHint: string
    webhooksCustomHeadersJson: string
    webhooksCustomHeadersHint: string
    webhooksOptionalFieldsTitle: string
    webhooksOptionalFieldsHint: string
    webhooksCreate: string
    webhooksCreated: string
    webhooksLoadError: string
    webhooksLoadErrorInline: string
    webhooksRetryLoad: string
    webhooksListTitle: string
    webhooksListEmpty: string
    webhooksListEmptyHint: string
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
    webhooksGenerateSecret: string
    webhooksReadOnlyHint: string
    webhooksFailedTitle: string
    webhooksFailedEmpty: string
    webhooksFailedEvent: string
    webhooksFailedAttempts: string
    webhooksFailedError: string
    webhooksReplay: string
    webhooksReplayed: string
    webhooksLoadFailed: string
    integrationsTitle: string
    integrationsIntro: string
    integrationsPublicApiTitle: string
    integrationsPublicApiHint: string
    integrationsEndpointLabel: string
    integrationsPublicApiAuthHint: string
    integrationsApiKeyName: string
    integrationsCreateApiKey: string
    integrationsApiKeysList: string
    integrationsApiKeysEmpty: string
    integrationsCopyKeyOnce: string
    integrationsRevokeKey: string
    integrationsRevokeConfirm: string
    integrationsRevoked: string
    integrationsDeleteApiKey: string
    integrationsDeleteApiKeyConfirm: string
    integrationsDeleted: string
    integrationsKeyPrefix: string
    integrationsLastUsed: string
    integrationsRevokedBadge: string
    integrationsLeadCaptureTitle: string
    integrationsLeadCaptureHint: string
    integrationsLeadCaptureHoneypotHint: string
    integrationsTokenLabel: string
    integrationsCreateToken: string
    integrationsTokensList: string
    integrationsTokensEmpty: string
    integrationsDeleteToken: string
    integrationsDeleteTokenConfirm: string
    integrationsTokenCreated: string
    integrationsLoadError: string
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
    /** Same header slot as server badge when Supabase is not configured */
    emailTrackingUnconfiguredBadge: string
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
    /** Pipeline health composite (0-100), subtitle under section title */
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
    /** Default name when creating a sequence from the studio */
    defaultNewSequenceName: string
    steps: string
    /** Flow editor tab label */
    tabFlow: string
    tabStructure: string
    tabPersonalise: string
    tabMetrics: string
    /** Enrollments tab label */
    tabEnrolled: string
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
    /** Shown after flow + steps are saved to the server */
    toastFlowSaved: string
    /** When user tries to enroll while the sequence is inactive */
    enrollBlockedInactive: string
    /** Label next to the on/off control for whether the sequence accepts new enrollments / runs */
    sequenceActiveToggleLabel: string
    /** Sequence setting: cancel automation when the contact replies */
    stopOnContactReplyLabel: string
    stopOnContactReplyHint: string
    /** Enrollment badge when stopped because the contact replied */
    enrollmentStatusReplied: string
    enrollmentStartDelayLabel: string
    enrollmentStartDelayHint: string
    sequenceNoActiveEnrollmentsBanner: string
    /** Collapsible header section for stop-on-reply + enrollment start delay */
    sequenceDeliveryRulesToggle: string
    flow: {
      studioTitle: string
      toolbarAdd: string
      addAbSplit: string
      deleteNode: string
      canvasHint: string
      /** Short label for collapsed “how the flow editor works” help */
      canvasHintSummary: string
      inspectorTitle: string
      /** Title row when embedding the inbox-style composer in the flow inspector */
      sequenceMailboxEditorTitle: string
      /** Shown under the title when Gmail is not connected (sequence step editor still saves drafts) */
      sequenceStepDraftWithoutGmailHint: string
      inspectorEmpty: string
      abWeightA: string
      abWeightB: string
      /** Interpolation: `{a}`, `{b}`: branch weight percents */
      abSplitWeightsSummary: string
      abInspectorHint: string
      waitInspectorHint: string
      metricsPlaceholder: string
      /** Interpolation: `{days}`: short line on node cards when delay is greater than zero */
      nodeTimingAfterDays: string
      /** Shown under the email body editor (merge fields, formatting) */
      emailBodyComposerHint: string
      /** Label for delay field on email / call / LinkedIn steps */
      timingGapDaysLabel: string
      /** Helper under delay field (non-wait steps) */
      timingGapDaysHint: string
      /** Compact label next to delay input on flow canvas cards */
      nodeCanvasDelayLabel: string
      inspectorLegacyNonEmail: string
      inspectorLegacyNonEmailHint: string
      /** Label for delay on a dedicated Wait node */
      timingWaitDaysLabel: string
      /** Helper for Wait node duration */
      timingWaitDaysHint: string
      /** When the first step in the path has delay 0 */
      timingFirstStepGapNote: string
      /** Email step: send as new Gmail message vs reply in the last outbound thread for this enrollment */
      emailThreadModeLabel: string
      emailThreadModeNew: string
      emailThreadModeReply: string
      emailThreadModeReplyHint: string
      nodeSummaryEmail: string
      nodeSummaryTask: string
      /** Interpolation: `{days}` */
      nodeSummaryWait: string
      nodeTypeAbSplit: string
      nodeTypeLabels: {
        email: string
        call_task: string
        linkedin_task: string
        wait: string
      }
      validationEmpty: string
      validationCycle: string
      /** Enrollment table: show current node id when set */
      enrollmentNodeColumn: string
      /** Enrollment table: branch variant */
      enrollmentVariantColumn: string
      stepEmailTemplateLabel: string
      stepEmailTemplateNone: string
      sequenceStepCcPlaceholder: string
      sequenceStepBccPlaceholder: string
      personalizeTitle: string
      personalizeIntro: string
      personalizeCopy: string
      personalizeTokenCopied: string
      metricsTitle: string
      metricsSubtitle: string
      metricsEmpty: string
      metricsNeedsSupabase: string
      metricsColTime: string
      metricsColEvent: string
      metricsColNode: string
      metricsColMeta: string
    }
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
    toastUserCreated: string
    toastUserCreateError: string
    toastEnterEmail: string
    toastInviteSent: string
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
    /** Short hint under the template body composer (formatting + variables). */
    bodyEditorHint: string
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
    emailPlaceholder: string
    checkEmailConfirmation: string
    passwordsDoNotMatch: string
    passwordMinLength: string
    /** Button to fill a cryptographically random strong password */
    generateSecurePassword: string
    /** Shown under password fields that enforce the strong policy */
    passwordStrengthHint: string
    /** Heading above the live password requirement checklist */
    passwordPolicyTitle: string
    /** Shown under the checklist on login (current password is not validated against this list). */
    passwordPolicyLoginHint: string
    savePassword: string
    sso: string
    saml: string
    samlDomainPlaceholder: string
    useSaml: string
    connecting: string
    companyDomainRequired: string
    landingTagline: string
    landingFeature1: string
    landingFeature2: string
    landingFeature3: string
    googleSsoUseCompanySso: string
    googleSsoUnavailable: string
    passwordShowAria: string
    passwordHideAria: string
    mfaRequiredTitle: string
    mfaCodeLabel: string
    mfaVerify: string
    mfaInvalidCode: string
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
    /** Shown on auth screens when Supabase env is missing */
    supabaseNotConfiguredDetail: string
    generic: string
    gmailConnectionError: string
    googleIntegrationStartFailed: string
    /**
     * When functions.invoke fails (e.g. function not deployed, network) — not an OAuth rejection.
     */
    googleEdgeFunctionUnreachable: string
    googleOAuthAccessDenied: string
    googleOAuthStateInvalid: string
    googleOAuthEmailMismatch: string
    gmailMissingScopeSend: string
    gmailMissingScopeRead: string
    gmailScheduledFailedAfterRetries: string
    gmailOriginNotAllowed: string
    gmailReconnectRequired: string
    gmailThreadsLoadError: string
    invitationSendError: string
    duplicateTag: string
    noPermissionTitle: string
    noPermissionDescription: string
    userNotFound: string
    accountDeactivated: string
    wrongPassword: string
    passwordWeakLength: string
    passwordWeakLower: string
    passwordWeakUpper: string
    passwordWeakDigit: string
    passwordWeakSymbol: string
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
    /** `{name}` = resolved workspace display name from hostname */
    workspaceUrlSigningInTo: string
    workspaceUrlUnknownSlug: string
    workspaceHostMismatchTitle: string
    workspaceHostMismatch: string
    /** Fatal misconfiguration before router mounts (production/staging without Supabase) */
    configurationBootstrapTitle: string
    configurationBootstrapUses: string
    configurationBootstrapOr: string
    configurationBootstrapRequiresValid: string
    configurationBootstrapAnd: string
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
    /** Toggle: track opens/clicks (not manual follow-up tasks) */
    openEmailTracking: string
    /** Composer - Pipedrive-style layout */
    composerFrom: string
    /** Composer: outbound address is always the connected mailbox */
    outboundFromMailboxHint: string
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

  // ─── Entity lists (saved filters + distribution lists) ─────────────────────────
  entityLists: {
    saveFilteredList: string
    filteredListNamePlaceholder: string
    filteredListSaved: string
    nameRequired: string
    noMembersSelected: string
    distributionList: string
    noDistributionList: string
    newDistributionList: string
    listNamePlaceholder: string
    createFromSelection: string
    createFromCurrentResults: string
    distributionListCreated: string
    distributionListDeleted: string
    deleteDistributionList: string
    deleteDistributionListConfirm: string
    pinToBar: string
    name: string
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

  workflowLibrary: WorkflowLibraryCatalog

  // Additional inbox labels used by inbox views/actions
  // (kept here to preserve existing translation structure)
}
