import type { Language } from '../i18n'

export interface IndustryOption {
  value: string
  labels: Record<Language, string>
  aliases?: string[]
}

// LinkedIn public industry taxonomy (normalized for CRM usage).
export const LINKEDIN_INDUSTRY_OPTIONS: IndustryOption[] = [
  { value: 'accounting', labels: { en: 'Accounting', es: 'Contabilidad', pt: 'Contabilidade', fr: 'Comptabilite', de: 'Buchhaltung', it: 'Contabilita' } },
  { value: 'airlines-aviation', labels: { en: 'Airlines and Aviation', es: 'Aerolíneas y aviación', pt: 'Linhas aéreas e aviação', fr: 'Compagnies aériennes et aviation', de: 'Fluggesellschaften und Luftfahrt', it: 'Compagnie aeree e aviazione' } },
  { value: 'automotive', labels: { en: 'Automotive', es: 'Automoción', pt: 'Automotivo', fr: 'Automobile', de: 'Automobilindustrie', it: 'Automotive' } },
  { value: 'banking', labels: { en: 'Banking', es: 'Banca', pt: 'Bancos', fr: 'Banque', de: 'Bankwesen', it: 'Bancario' } },
  { value: 'biotechnology', labels: { en: 'Biotechnology', es: 'Biotecnología', pt: 'Biotecnologia', fr: 'Biotechnologie', de: 'Biotechnologie', it: 'Biotecnologia' } },
  { value: 'broadcast-media', labels: { en: 'Broadcast Media', es: 'Medios de difusión', pt: 'Midia de transmissão', fr: 'Médias audiovisuels', de: 'Rundfunkmedien', it: 'Media broadcast' } },
  { value: 'civil-engineering', labels: { en: 'Civil Engineering', es: 'Ingeniería civil', pt: 'Engenharia civil', fr: 'Génie civil', de: 'Bauingenieurwesen', it: 'Ingegneria civile' } },
  { value: 'computer-software', labels: { en: 'Computer Software', es: 'Software', pt: 'Software', fr: 'Logiciels', de: 'Software', it: 'Software' }, aliases: ['saas', 'technology'] },
  { value: 'construction', labels: { en: 'Construction', es: 'Construcción', pt: 'Construção', fr: 'Construction', de: 'Bauwesen', it: 'Costruzioni' } },
  { value: 'consumer-electronics', labels: { en: 'Consumer Electronics', es: 'Electrónica de consumo', pt: 'Eletrônicos de consumo', fr: 'Électronique grand public', de: 'Unterhaltungselektronik', it: 'Elettronica di consumo' } },
  { value: 'consumer-goods', labels: { en: 'Consumer Goods', es: 'Bienes de consumo', pt: 'Bens de consumo', fr: 'Biens de consommation', de: 'Konsumguter', it: 'Beni di consumo' } },
  { value: 'education-management', labels: { en: 'Education Management', es: 'Gestión educativa', pt: 'Gestão educacional', fr: 'Gestion de l éducation', de: 'Bildungsmanagement', it: 'Gestione dell istruzione' } },
  { value: 'e-learning', labels: { en: 'E-Learning', es: 'Aprendizaje en línea', pt: 'Ensino a distância', fr: 'E-learning', de: 'E-Learning', it: 'E-learning' } },
  { value: 'financial-services', labels: { en: 'Financial Services', es: 'Servicios financieros', pt: 'Serviços financeiros', fr: 'Services financiers', de: 'Finanzdienstleistungen', it: 'Servizi finanziari' }, aliases: ['fintech'] },
  { value: 'food-beverages', labels: { en: 'Food and Beverages', es: 'Alimentos y bebidas', pt: 'Alimentos e bebidas', fr: 'Alimentation et boissons', de: 'Lebensmittel und Getranke', it: 'Cibo e bevande' } },
  { value: 'government-administration', labels: { en: 'Government Administration', es: 'Administración pública', pt: 'Administração pública', fr: 'Administration publique', de: 'Offentliche Verwaltung', it: 'Amministrazione pubblica' } },
  { value: 'health-wellness-fitness', labels: { en: 'Health, Wellness and Fitness', es: 'Salud, bienestar y fitness', pt: 'Saúde, bem-estar e fitness', fr: 'Santé, bien-être et fitness', de: 'Gesundheit, Wellness und Fitness', it: 'Salute, benessere e fitness' } },
  { value: 'hospital-health-care', labels: { en: 'Hospital and Health Care', es: 'Hospitales y salud', pt: 'Hospitais e saúde', fr: 'Hôpitaux et soins de santé', de: 'Krankenhauswesen und Gesundheitsversorgung', it: 'Ospedali e assistenza sanitaria' }, aliases: ['healthcare'] },
  { value: 'hospitality', labels: { en: 'Hospitality', es: 'Hostelería', pt: 'Hospitalidade', fr: 'Hôtellerie', de: 'Gastgewerbe', it: 'Ospitalità' } },
  { value: 'human-resources', labels: { en: 'Human Resources', es: 'Recursos humanos', pt: 'Recursos humanos', fr: 'Ressources humaines', de: 'Personalwesen', it: 'Risorse umane' } },
  { value: 'industrial-automation', labels: { en: 'Industrial Automation', es: 'Automatización industrial', pt: 'Automação industrial', fr: 'Automatisation industrielle', de: 'Industrielle Automatisierung', it: 'Automazione industriale' } },
  { value: 'information-technology-services', labels: { en: 'IT Services and IT Consulting', es: 'Servicios TI y consultoría', pt: 'Serviços e consultoria de TI', fr: 'Services et conseil en informatique', de: 'IT-Dienstleistungen und IT-Beratung', it: 'Servizi e consulenza IT' }, aliases: ['consulting'] },
  { value: 'insurance', labels: { en: 'Insurance', es: 'Seguros', pt: 'Seguros', fr: 'Assurance', de: 'Versicherungen', it: 'Assicurazioni' } },
  { value: 'internet', labels: { en: 'Internet', es: 'Internet', pt: 'Internet', fr: 'Internet', de: 'Internet', it: 'Internet' } },
  { value: 'legal-services', labels: { en: 'Legal Services', es: 'Servicios legales', pt: 'Serviços jurídicos', fr: 'Services juridiques', de: 'Rechtsdienstleistungen', it: 'Servizi legali' } },
  { value: 'logistics-supply-chain', labels: { en: 'Logistics and Supply Chain', es: 'Logística y cadena de suministro', pt: 'Logística e cadeia de suprimentos', fr: 'Logistique et chaîne d approvisionnement', de: 'Logistik und Lieferkette', it: 'Logistica e supply chain' } },
  { value: 'management-consulting', labels: { en: 'Management Consulting', es: 'Consultoría de gestión', pt: 'Consultoria de gestão', fr: 'Conseil en management', de: 'Unternehmensberatung', it: 'Consulenza direzionale' } },
  { value: 'manufacturing', labels: { en: 'Manufacturing', es: 'Manufactura', pt: 'Manufatura', fr: 'Fabrication', de: 'Fertigung', it: 'Manifattura' } },
  { value: 'marketing-advertising', labels: { en: 'Marketing and Advertising', es: 'Marketing y publicidad', pt: 'Marketing e publicidade', fr: 'Marketing et publicité', de: 'Marketing und Werbung', it: 'Marketing e pubblicità' } },
  { value: 'medical-device', labels: { en: 'Medical Device', es: 'Dispositivos médicos', pt: 'Dispositivos médicos', fr: 'Dispositifs médicaux', de: 'Medizintechnik', it: 'Dispositivi medici' } },
  { value: 'non-profit-organization-management', labels: { en: 'Non-Profit Organization Management', es: 'Gestión de organizaciones sin ánimo de lucro', pt: 'Gestão de organizações sem fins lucrativos', fr: 'Gestion des organisations à but non lucratif', de: 'Management von Non-Profit-Organisationen', it: 'Gestione di organizzazioni non profit' } },
  { value: 'pharmaceuticals', labels: { en: 'Pharmaceuticals', es: 'Farmacéutica', pt: 'Farmacêutica', fr: 'Pharmaceutique', de: 'Pharma', it: 'Farmaceutica' } },
  { value: 'real-estate', labels: { en: 'Real Estate', es: 'Inmobiliario', pt: 'Imobiliário', fr: 'Immobilier', de: 'Immobilien', it: 'Immobiliare' } },
  { value: 'renewables-environment', labels: { en: 'Renewables and Environment', es: 'Renovables y medio ambiente', pt: 'Renováveis e meio ambiente', fr: 'Énergies renouvelables et environnement', de: 'Erneuerbare Energien und Umwelt', it: 'Rinnovabili e ambiente' } },
  { value: 'retail', labels: { en: 'Retail', es: 'Retail', pt: 'Varejo', fr: 'Commerce de détail', de: 'Einzelhandel', it: 'Retail' } },
  { value: 'telecommunications', labels: { en: 'Telecommunications', es: 'Telecomunicaciones', pt: 'Telecomunicações', fr: 'Télécommunications', de: 'Telekommunikation', it: 'Telecomunicazioni' } },
  { value: 'transportation-trucking-railroad', labels: { en: 'Transportation and Railroad', es: 'Transporte y ferrocarril', pt: 'Transporte e ferroviário', fr: 'Transport et ferroviaire', de: 'Transport und Schienenverkehr', it: 'Trasporti e ferroviario' } },
  { value: 'utilities', labels: { en: 'Utilities', es: 'Servicios públicos', pt: 'Serviços públicos', fr: 'Services publics', de: 'Versorgungsunternehmen', it: 'Servizi di pubblica utilità' } },
  { value: 'venture-capital-private-equity', labels: { en: 'Venture Capital and Private Equity', es: 'Capital riesgo y private equity', pt: 'Venture capital e private equity', fr: 'Capital-risque et private equity', de: 'Venture Capital und Private Equity', it: 'Venture capital e private equity' } },
  { value: 'wholesale', labels: { en: 'Wholesale', es: 'Comercio mayorista', pt: 'Atacado', fr: 'Commerce de gros', de: 'Großhandel', it: 'Commercio all ingrosso' } },
  { value: 'other', labels: { en: 'Other', es: 'Otro', pt: 'Outro', fr: 'Autre', de: 'Andere', it: 'Altro' } },
]

const industryByValue = new Map(LINKEDIN_INDUSTRY_OPTIONS.map((industry) => [industry.value, industry]))

const legacyIndustryMap: Record<string, string> = {
  fintech: 'financial-services',
  saas: 'computer-software',
  consulting: 'management-consulting',
  healthcare: 'hospital-health-care',
}

export function normalizeIndustryValue(raw: string): string {
  const value = raw.trim().toLowerCase()
  if (!value) return 'other'
  const mapped = legacyIndustryMap[value] ?? value
  if (industryByValue.has(mapped)) return mapped
  for (const industry of LINKEDIN_INDUSTRY_OPTIONS) {
    if (industry.aliases?.includes(mapped)) return industry.value
  }
  return 'other'
}

export function getIndustryLabel(value: string, language: Language): string {
  const normalized = normalizeIndustryValue(value)
  const option = industryByValue.get(normalized)
  return option?.labels[language] ?? option?.labels.en ?? normalized
}

export function getIndustryOptions(language: Language): Array<{ value: string; label: string }> {
  return LINKEDIN_INDUSTRY_OPTIONS.map((industry) => ({
    value: industry.value,
    label: industry.labels[language] ?? industry.labels.en,
  }))
}
