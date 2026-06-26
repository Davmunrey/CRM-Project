import { useState, useMemo, useEffect } from 'react'
import { useTranslations, useI18nStore } from '../../i18n'
import { localizedProduct } from '../../i18n/localizeSeed'
import { useDealsStore } from '../../store/dealsStore'
import { useProductsStore } from '../../store/productsStore'
import { useSettingsStore } from '../../store/settingsStore'
import { Select } from '../../components/ui/Select'
import { toast } from '../../store/toastStore'
import { formatDateShort } from '../../utils/formatters'
import type { Deal, QuoteItem } from '../../types'

function newItem(): QuoteItem {
  return { id: crypto.randomUUID(), name: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }
}

function calcTotal(q: number, u: number, d: number) {
  return Math.round(q * u * (1 - d / 100) * 100) / 100
}

type QuoteDocumentType = 'quote' | 'invoice' | 'proforma'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function nextSequentialDocNumber(docType: QuoteDocumentType): string {
  const date = new Date()
  const y = String(date.getFullYear())
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const scope = `${docType}:${y}${m}`
  const key = `crm_doc_seq:${scope}`
  const next = Number(localStorage.getItem(key) ?? '0') + 1
  localStorage.setItem(key, String(next))
  const prefix = docType === 'invoice' ? 'FAC' : docType === 'proforma' ? 'PRO' : 'PRE'
  return `${prefix}-${y}${m}-${String(next).padStart(4, '0')}`
}

export interface QuoteBuilderProps {
  dealId: string
  dealTitle: string
  initialItems: QuoteItem[]
  contactEmail?: string
  companyName?: string
  currency: Deal['currency']
  onComposeQuoteDraft: (draft: {
    to: string
    subject: string
    body: string
    attachments: Array<{ name: string; mimeType: string; size: number; dataBase64: string }>
  }) => void
}

export function QuoteBuilder({
  dealId,
  dealTitle,
  initialItems,
  contactEmail,
  companyName,
  currency,
  onComposeQuoteDraft,
}: QuoteBuilderProps) {
  const t = useTranslations()
  const branding = useSettingsStore((s) => s.settings.branding)
  const language = useI18nStore((s) => s.language)
  const [allProducts, setAllProducts] = useState(() => useProductsStore.getState().products)
  useEffect(() => useProductsStore.subscribe((s) => setAllProducts(s.products)), [])
  const products = useMemo(() => allProducts.filter((p) => p.isActive), [allProducts])
  const [items, setItems] = useState<QuoteItem[]>(initialItems)
  const [saved, setSaved] = useState(false)
  const [vatPercent, setVatPercent] = useState(21)
  const [validityDays, setValidityDays] = useState(15)
  const [documentType, setDocumentType] = useState<QuoteDocumentType>('quote')
  const [quoteNumber, setQuoteNumber] = useState(() => nextSequentialDocNumber('quote'))
  const [clientTaxId, setClientTaxId] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0)
  const [withholdingPercent, setWithholdingPercent] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentDays, setPaymentDays] = useState(30)
  const [bankIban, setBankIban] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [lateFeeClause, setLateFeeClause] = useState('')
  const [acceptanceClause, setAcceptanceClause] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [reference, setReference] = useState('')
  const [productPick, setProductPick] = useState('')

  const updateItem = (id: string, patch: Partial<QuoteItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        const merged = { ...it, ...patch }
        return { ...merged, total: calcTotal(merged.quantity, merged.unitPrice, merged.discount) }
      })
    )
    setSaved(false)
  }

  const removeItem = (id: string) => { setItems((prev) => prev.filter((i) => i.id !== id)); setSaved(false) }

  const addFromProduct = (productId: string) => {
    const p = products.find((pr) => pr.id === productId)
    if (!p) return
    const lp = localizedProduct(p, t)
    setItems((prev) => [...prev, { id: crypto.randomUUID(), productId: lp.id, name: lp.name, description: lp.description, quantity: 1, unitPrice: lp.price, discount: 0, total: lp.price }])
    setSaved(false)
  }

  const addBlank = () => { setItems((prev) => [...prev, newItem()]); setSaved(false) }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const lineDiscount = items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.discount / 100), 0)
  const lineNet = items.reduce((s, i) => s + i.total, 0)
  const globalDiscountAmount = Math.round(lineNet * (globalDiscountPercent / 100) * 100) / 100
  const baseTaxable = Math.max(0, lineNet - globalDiscountAmount)
  const vatAmount = Math.round(baseTaxable * (vatPercent / 100) * 100) / 100
  const withholdingAmount = Math.round(baseTaxable * (withholdingPercent / 100) * 100) / 100
  const grandTotal = Math.round((baseTaxable + vatAmount - withholdingAmount) * 100) / 100
  const issueDate = new Date()
  const validUntil = new Date(Date.now() + validityDays * 86400000)

  const localeByLanguage: Record<typeof language, string> = {
    en: 'en-US',
    es: 'es-ES',
    pt: 'pt-PT',
    fr: 'fr-FR',
    de: 'de-DE',
    it: 'it-IT',
  }
  const fmt = (n: number) => new Intl.NumberFormat(localeByLanguage[language], { style: 'currency', currency }).format(n)
  const formatDateForQuote = (value: Date) => formatDateShort(value.toISOString())

  useEffect(() => {
    setQuoteNumber(nextSequentialDocNumber(documentType))
  }, [documentType])

  useEffect(() => {
    setPaymentMethod(t.deals.quoteDefaultPaymentMethod)
    setLateFeeClause(t.deals.quoteDefaultLateFeeClause)
    setAcceptanceClause(t.deals.quoteDefaultAcceptanceClause)
  }, [language, t.deals.quoteDefaultPaymentMethod, t.deals.quoteDefaultLateFeeClause, t.deals.quoteDefaultAcceptanceClause])

  const handleSave = () => {
    useDealsStore.getState().updateQuote(dealId, items)
    setSaved(true)
    toast.success(t.deals.quoteBuilder)
  }

  const generateQuotePdfAttachment = async () => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])
    const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const accent = branding.primaryColor || '#4f46e5'
    const title = documentType === 'invoice'
      ? t.deals.documentTypeInvoice
      : documentType === 'proforma'
        ? t.deals.documentTypeProforma
        : t.deals.documentTypeQuote
    const companyLines = [
      branding.legalName || branding.appName || t.brand.defaultAppName,
      ...(branding.taxId ? [`${t.settings.taxIdVat}: ${branding.taxId}`] : []),
      ...((branding.addressLine1 || branding.postalCode || branding.city || branding.country)
        ? [[branding.addressLine1, branding.postalCode, branding.city, branding.country].filter(Boolean).join(', ')]
        : []),
      ...(branding.billingPhone ? [`${t.common.phone}: ${branding.billingPhone}`] : []),
      ...(branding.billingEmail ? [`${t.deals.quoteEmailBillingEmailPrefix} ${branding.billingEmail}`] : []),
      ...(branding.customDomain ? [`${t.deals.quotePdfWebPrefix} ${branding.customDomain}`] : []),
    ]
    doc.setFillColor(accent)
    doc.rect(0, 0, pageWidth, 30, 'F')
    doc.setTextColor('#FFFFFF')
    doc.setFontSize(15)
    doc.text(title.toUpperCase(), 14, 12)
    doc.setFontSize(10)
    doc.text(quoteNumber, 14, 19)
    doc.text(`${t.common.date}: ${formatDateForQuote(issueDate)}`, 14, 24)
    doc.text(`${t.deals.validityLabel}: ${formatDateForQuote(validUntil)}`, 72, 24)
    doc.setTextColor('#111111')
    doc.setFontSize(10)
    let y = 38
    companyLines.forEach((line) => { doc.text(line, 14, y); y += 5 })

    doc.setFillColor(245, 247, 250)
    doc.roundedRect(pageWidth - 95, 36, 81, 34, 2, 2, 'F')
    doc.setFontSize(10)
    doc.setTextColor('#444444')
    doc.text(t.deals.clientData, pageWidth - 91, 43)
    const clientLines = [
      companyName || '-',
      ...(clientTaxId ? [`${t.deals.clientTaxIdPlaceholder}: ${clientTaxId}`] : []),
      ...(clientAddress ? [clientAddress] : []),
      ...(contactPerson ? [`${t.deals.contactPersonPlaceholder}: ${contactPerson}`] : []),
      ...(contactEmail ? [`${t.deals.quotePdfContactEmailPrefix} ${contactEmail}`] : []),
      ...(reference ? [`${t.deals.referenceShort}: ${reference}`] : []),
    ]
    let clientY = 49
    clientLines.forEach((line) => { doc.text(line, pageWidth - 91, clientY); clientY += 4.8 })

    autoTable(doc, {
      startY: Math.max(y + 4, 76),
      head: [[t.deals.referenceShort, t.common.description, t.deals.lineDescriptionPlaceholder, t.common.total, t.products.price, `${t.deals.discount} %`, t.common.total]],
      body: items.map((item, idx) => [
        item.productId || `L${idx + 1}`,
        item.name || '-',
        item.description || item.name || '-',
        String(item.quantity),
        fmt(item.unitPrice),
        `${item.discount}%`,
        fmt(item.total),
      ]),
      styles: { fontSize: 8.5, cellPadding: 1.8, overflow: 'linebreak' },
      headStyles: { fillColor: accent, textColor: 255 },
      columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 28 }, 2: { cellWidth: 64 }, 3: { halign: 'right', cellWidth: 12 }, 4: { halign: 'right', cellWidth: 22 }, 5: { halign: 'right', cellWidth: 14 }, 6: { halign: 'right', cellWidth: 22 } },
      margin: { left: 14, right: 14 },
    })

    const bodyRows = [
      [t.deals.subtotal, fmt(subtotal)],
      [t.deals.lineDiscountLabel, `-${fmt(lineDiscount)}`],
      [t.deals.globalDiscountLabel, `${globalDiscountPercent}% (-${fmt(globalDiscountAmount)})`],
      [t.deals.taxableBase, fmt(baseTaxable)],
      [t.deals.quotePdfVatRow.replace('{percent}', String(vatPercent)), fmt(vatAmount)],
      [t.deals.quotePdfWithholdingRow.replace('{percent}', String(withholdingPercent)), `-${fmt(withholdingAmount)}`],
      [t.deals.quotePdfTotalLabel, fmt(grandTotal)],
    ]
    const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120
    let totalsY = finalY + 8
    if (totalsY > pageHeight - 80) {
      doc.addPage()
      totalsY = 20
    }
    autoTable(doc, {
      startY: totalsY,
      body: bodyRows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 46, fontStyle: 'bold' }, 1: { cellWidth: 44, halign: 'right' } },
      margin: { left: pageWidth - 104, right: 14 },
    })
    let termsY = ((doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? totalsY) + 8
    if (termsY > pageHeight - 70) {
      doc.addPage()
      termsY = 20
    }
    doc.setFontSize(10)
    doc.setTextColor('#222222')
    doc.text(t.deals.termsAndConditions, 14, termsY)
    const terms = [
      `${t.deals.validityLabel}: ${validityDays} ${t.dashboard.days}`,
      `${t.deals.paymentMethodLabel}: ${paymentMethod}`,
      `${t.deals.paymentTermLabel}: ${paymentDays} ${t.dashboard.days}`,
      `${t.deals.bankDetailsLabel}: ${bankName || '-'} | ${t.deals.ibanPlaceholder} ${bankIban || '-'} | ${t.deals.accountHolderPlaceholder} ${accountHolder || '-'}`,
      `${t.deals.lateFeeLabel}: ${lateFeeClause || '-'}`,
      `${t.deals.acceptanceClauseLabel}: ${acceptanceClause || '-'}`,
      ...(additionalNotes ? [`${t.deals.notesLabel}: ${additionalNotes}`] : []),
    ]
    let lineY = termsY + 5
    doc.setFontSize(8.8)
    terms.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, pageWidth - 28)
      doc.text(wrapped, 14, lineY)
      lineY += wrapped.length * 4.4
      if (lineY > pageHeight - 18) {
        doc.addPage()
        lineY = 18
      }
    })

    const pages = doc.getNumberOfPages()
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page)
      doc.setFontSize(8)
      doc.setTextColor('#666666')
      doc.text(`${branding.legalName || branding.appName || ''} • ${branding.taxId || ''} • ${branding.billingEmail || ''}`, 14, pageHeight - 8)
      doc.text(`${t.deals.pageLabel} ${page}/${pages}`, pageWidth - 30, pageHeight - 8)
    }

    const arrayBuffer = doc.output('arraybuffer')
    const dataBase64 = bytesToBase64(new Uint8Array(arrayBuffer))
    return {
      fileName: `${quoteNumber}.pdf`,
      mimeType: 'application/pdf',
      size: new Uint8Array(arrayBuffer).length,
      dataBase64,
      blob: new Blob([arrayBuffer], { type: 'application/pdf' }),
    }
  }

  const exportPdf = async () => {
    if (items.length === 0) {
      toast.error(t.deals.addItem)
      return
    }
    try {
      const pdf = await generateQuotePdfAttachment()
      const url = URL.createObjectURL(pdf.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = pdf.fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t.errors.generic)
    }
  }

  const sendQuoteByEmail = async () => {
    if (items.length === 0) {
      toast.error(t.deals.addItem)
      return
    }
    const body = [
      t.deals.quoteEmailGreeting,
      '',
      t.deals.quoteEmailBodyIntro.replace('{dealTitle}', dealTitle),
      '',
      `${t.deals.quoteNumber}: ${quoteNumber}`,
      `${t.deals.expectedClose}: ${formatDateForQuote(new Date(Date.now() + validityDays * 86400000))}`,
      '',
      ...items.map((item) => `- ${item.name || t.common.description}: ${item.quantity} x ${fmt(item.unitPrice)} (${item.discount}%) = ${fmt(item.total)}`),
      '',
      `${t.deals.subtotal}: ${fmt(subtotal)}`,
      `${t.deals.discount}: -${fmt(lineDiscount + globalDiscountAmount)}`,
      `${t.deals.vatPercent} (${vatPercent}%): ${fmt(vatAmount)}`,
      `${t.common.total}: ${fmt(grandTotal)}`,
      '',
      ...(branding.legalName ? [branding.legalName] : []),
      ...(branding.taxId ? [`${t.deals.quoteEmailTaxIdPrefix} ${branding.taxId}`] : []),
      ...((branding.addressLine1 || branding.postalCode || branding.city || branding.country)
        ? [[branding.addressLine1, branding.postalCode, branding.city, branding.country].filter(Boolean).join(', ')]
        : []),
      ...(branding.billingEmail ? [`${t.deals.quoteEmailBillingEmailPrefix} ${branding.billingEmail}`] : []),
      ...(branding.billingPhone ? [`${t.deals.quoteEmailBillingPhonePrefix} ${branding.billingPhone}`] : []),
      ...(branding.quoteFooter ? [branding.quoteFooter] : []),
      '',
      t.deals.quoteEmailSignOff,
    ].join('\n')
    const pdf = await generateQuotePdfAttachment()
    onComposeQuoteDraft({
      to: contactEmail ?? '',
      subject: t.deals.quoteEmailSubject.replace('{dealTitle}', dealTitle),
      body,
      attachments: [{
        name: pdf.fileName,
        mimeType: pdf.mimeType,
        size: pdf.size,
        dataBase64: pdf.dataBase64,
      }],
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <Select
            ariaLabel={`${t.common.add} ${t.products.title.toLowerCase()} ${t.deals.quote.toLowerCase()}`}
            value={productPick}
            onChange={(e) => {
              const id = e.target.value
              if (id) {
                addFromProduct(id)
                setProductPick('')
              }
            }}
            options={[
              { value: '', label: `+ ${t.deals.addItem}...` },
              ...products.map((p) => {
                const lp = localizedProduct(p, t)
                return { value: p.id, label: `${lp.name} - ${fmt(lp.price)}` }
              }),
            ]}
            listMaxHeightClass="max-h-56"
          />
        </div>
        <button
          type="button"
          onClick={addBlank}
          className="px-3 py-1.5 rounded-lg border border-fg/10 text-xs text-fg-muted hover:text-fg hover:bg-fg/4 transition-colors whitespace-nowrap"
        >
          + {t.deals.addItem}
        </button>
      </div>

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">{t.deals.quote}</caption>
            <thead>
              <tr className="text-fg-subtle border-b border-fg/6">
                <th scope="col" className="text-left pb-2 font-medium">{t.common.description}</th>
                <th scope="col" className="text-right pb-2 font-medium w-14">{t.common.total}</th>
                <th scope="col" className="text-right pb-2 font-medium w-24">{t.common.value}</th>
                <th scope="col" className="text-right pb-2 font-medium w-16">{t.deals.discount}%</th>
                <th scope="col" className="text-right pb-2 font-medium w-24">{t.common.total}</th>
                <th scope="col" className="w-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5 pr-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      placeholder={t.common.name}
                      aria-label={t.common.name}
                      title={t.common.name}
                      className="w-full bg-transparent border-b border-fg/10 text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50 py-0.5"
                    />
                    <textarea
                      value={item.description ?? ''}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder={t.deals.lineDescriptionPlaceholder}
                      className="w-full mt-1 bg-transparent border border-fg/10 rounded px-1.5 py-1 text-[11px] text-fg-muted placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50 min-h-[42px]"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                      aria-label={t.common.total}
                      title={t.common.total}
                      className="w-12 text-right bg-transparent border-b border-fg/10 text-fg focus:outline-none focus:border-accent-500/50 py-0.5"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                      aria-label={t.products.price}
                      title={t.products.price}
                      className="w-20 text-right bg-transparent border-b border-fg/10 text-fg focus:outline-none focus:border-accent-500/50 py-0.5"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discount}
                      onChange={(e) => updateItem(item.id, { discount: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      aria-label={t.deals.discount}
                      title={t.deals.discount}
                      className="w-14 text-right bg-transparent border-b border-fg/10 text-fg focus:outline-none focus:border-accent-500/50 py-0.5"
                    />
                  </td>
                  <td className="py-1.5 pl-1 text-right text-fg font-medium">{fmt(item.total)}</td>
                  <td className="py-1.5 pl-1">
                    <button type="button" onClick={() => removeItem(item.id)} className="text-fg-subtle hover:text-danger transition-colors">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <div className="border-t border-fg/6 pt-3 space-y-1 text-xs">
          <div className="flex justify-between text-fg-subtle">
            <span>{t.deals.subtotal}</span><span>{fmt(subtotal)}</span>
          </div>
          {lineDiscount > 0 && (
            <div className="flex justify-between text-warning">
              <span>{t.deals.discount} ({t.common.details})</span><span>-{fmt(lineDiscount)}</span>
            </div>
          )}
          {globalDiscountAmount > 0 && (
            <div className="flex justify-between text-warning">
              <span>{t.deals.discount} ({globalDiscountPercent}%)</span><span>-{fmt(globalDiscountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-fg font-bold text-sm pt-1 border-t border-fg/6">
            <span>{t.deals.taxableBase}</span><span>{fmt(baseTaxable)}</span>
          </div>
          <div className="flex justify-between text-fg-muted">
            <span>{t.deals.vatPercent} ({vatPercent}%)</span><span>{fmt(vatAmount)}</span>
          </div>
          {withholdingAmount > 0 && (
            <div className="flex justify-between text-fg-muted">
              <span>{t.deals.withholdingPercent} ({withholdingPercent}%)</span><span>-{fmt(withholdingAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-success font-semibold text-sm">
            <span>{t.common.total}</span><span>{fmt(grandTotal)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select
          ariaLabel={t.deals.documentType}
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as QuoteDocumentType)}
          options={[
            { value: 'quote', label: t.deals.documentTypeQuote },
            { value: 'invoice', label: t.deals.documentTypeInvoice },
            { value: 'proforma', label: t.deals.documentTypeProforma },
          ]}
          listMaxHeightClass="max-h-40"
        />
        <input
          type="text"
          value={quoteNumber}
          onChange={(e) => setQuoteNumber(e.target.value)}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
          aria-label={t.deals.quoteNumber}
          title={t.deals.quoteNumber}
          placeholder={t.deals.quoteNumber}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={vatPercent}
          onChange={(e) => setVatPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
          aria-label={t.deals.vatPercent}
          title={t.deals.vatPercent}
          placeholder={t.deals.vatPercent}
        />
        <input
          type="number"
          min={1}
          value={validityDays}
          onChange={(e) => setValidityDays(Math.max(1, Number(e.target.value)))}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
          aria-label={t.deals.validityDays}
          title={t.deals.validityDays}
          placeholder={t.deals.validityDays}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={clientTaxId}
          onChange={(e) => setClientTaxId(e.target.value)}
          placeholder={t.deals.clientTaxIdPlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
        <input
          type="text"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          placeholder={t.deals.contactPersonPlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
        <input
          type="text"
          value={clientAddress}
          onChange={(e) => setClientAddress(e.target.value)}
          placeholder={t.deals.clientAddressPlaceholder}
          className="sm:col-span-2 bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={globalDiscountPercent}
          onChange={(e) => setGlobalDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
          placeholder={t.deals.globalDiscountPlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={withholdingPercent}
          onChange={(e) => setWithholdingPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
          placeholder={t.deals.withholdingPercent}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
        <input
          type="number"
          min={0}
          value={paymentDays}
          onChange={(e) => setPaymentDays(Math.max(0, Number(e.target.value)))}
          placeholder={t.deals.paymentDaysPlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          placeholder={t.deals.paymentMethodPlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={t.deals.referencePlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
        <input
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder={t.deals.bankNamePlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
        <input
          type="text"
          value={bankIban}
          onChange={(e) => setBankIban(e.target.value)}
          placeholder={t.deals.ibanPlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
        <input
          type="text"
          value={accountHolder}
          onChange={(e) => setAccountHolder(e.target.value)}
          placeholder={t.deals.accountHolderPlaceholder}
          className="sm:col-span-2 bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg"
        />
      </div>
      <div className="grid grid-cols-1 gap-2">
        <textarea
          value={lateFeeClause}
          onChange={(e) => setLateFeeClause(e.target.value)}
          placeholder={t.deals.lateFeeClausePlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg min-h-[60px]"
        />
        <textarea
          value={acceptanceClause}
          onChange={(e) => setAcceptanceClause(e.target.value)}
          placeholder={t.deals.acceptanceClausePlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg min-h-[60px]"
        />
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder={t.deals.additionalNotesPlaceholder}
          className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg min-h-[60px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={exportPdf}
          className="px-4 py-1.5 rounded-lg border border-fg/10 hover:bg-fg/4 text-xs text-fg-muted font-medium transition-colors"
        >
          {t.common.export} PDF
        </button>
        <button
          type="button"
          onClick={sendQuoteByEmail}
          className="px-4 py-1.5 rounded-lg border border-accent-500/30 bg-accent-500/10 hover:bg-accent-500/20 text-xs text-accent-300 font-medium transition-colors"
        >
          {t.inbox.compose}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-xs text-fg font-medium transition-colors"
        >
          {saved ? `${t.deals.quoteBuilder} ✓` : t.deals.quoteBuilder}
        </button>
      </div>
    </div>
  )
}
