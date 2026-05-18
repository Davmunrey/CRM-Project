import { useState } from 'react'
import { Download, Upload, FileSpreadsheet, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Modal'
import { PermissionGate } from '../../components/auth/PermissionGate'
import { CSVImport } from '../../components/import/CSVImport'
import { useTranslations } from '../../i18n'
import { useSettingsStore } from '../../store/settingsStore'
import { useContactsStore } from '../../store/contactsStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { useDealsStore } from '../../store/dealsStore'
import { useActivitiesStore } from '../../store/activitiesStore'
import { toast } from '../../store/toastStore'

export function DataSection() {
  const t = useTranslations()
  const { settings, resetToDefaults } = useSettingsStore()
  const contactsStore = useContactsStore()
  const companiesStore = useCompaniesStore()
  const dealsStore = useDealsStore()
  const activitiesStore = useActivitiesStore()

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showCSVImport, setShowCSVImport] = useState(false)

  const handleExportJSON = () => {
    const data = {
      contacts: contactsStore.contacts,
      companies: companiesStore.companies,
      deals: dealsStore.deals,
      activities: activitiesStore.activities,
      settings,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crm-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t.settings.exportData + ' ✓')
  }

  const handleImportJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as {
            contacts?: Parameters<typeof contactsStore.addContact>[0][]
            companies?: Parameters<typeof companiesStore.addCompany>[0][]
            deals?: Parameters<typeof dealsStore.addDeal>[0][]
            activities?: Parameters<typeof activitiesStore.addActivity>[0][]
          }
          if (data.contacts) {
            contactsStore.bulkDelete(contactsStore.contacts.map((c) => c.id))
            data.contacts.forEach((c) => contactsStore.addContact(c))
          }
          if (data.companies) {
            companiesStore.companies.forEach((c) => companiesStore.deleteCompany(c.id))
            data.companies.forEach((c) => companiesStore.addCompany(c))
          }
          if (data.deals) {
            dealsStore.deals.forEach((d) => dealsStore.deleteDeal(d.id))
            data.deals.forEach((d) => dealsStore.addDeal(d))
          }
          if (data.activities) {
            activitiesStore.activities.forEach((a) => activitiesStore.deleteActivity(a.id))
            data.activities.forEach((a) => activitiesStore.addActivity(a))
          }
          toast.success(t.settings.importData + ' ✓')
        } catch {
          toast.error(t.errors.generic)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleReset = () => {
    contactsStore.bulkDelete(contactsStore.contacts.map((c) => c.id))
    companiesStore.companies.forEach((c) => companiesStore.deleteCompany(c.id))
    dealsStore.deals.forEach((d) => dealsStore.deleteDeal(d.id))
    activitiesStore.activities.forEach((a) => activitiesStore.deleteActivity(a.id))
    resetToDefaults()
    toast.success(t.settings.resetData + ' ✓')
  }

  return (
    <>
      <section className="crm-surface-section p-6">
        <h2 className="text-base font-semibold text-fg mb-2">{t.settings.importExport}</h2>
        <p className="text-xs text-fg-subtle mb-4">{t.settings.exportData} / {t.settings.importData}</p>
        <div className="flex flex-wrap gap-3">
          <PermissionGate permission="contacts:export">
            <Button variant="secondary" leftIcon={<Download size={14} />} onClick={handleExportJSON}>
              {t.settings.exportData} JSON
            </Button>
          </PermissionGate>
          <PermissionGate permission="import:json">
            <Button variant="secondary" leftIcon={<Upload size={14} />} onClick={handleImportJSON}>
              {t.settings.importData} JSON
            </Button>
          </PermissionGate>
          <PermissionGate permission="import:csv">
            <Button variant="secondary" leftIcon={<FileSpreadsheet size={14} />} onClick={() => setShowCSVImport(true)}>
              {t.settings.importData} CSV
            </Button>
          </PermissionGate>
          <PermissionGate permission="settings:update">
            <Button variant="danger" leftIcon={<RotateCcw size={14} />} onClick={() => setShowResetConfirm(true)}>
              {t.settings.resetData}
            </Button>
          </PermissionGate>
        </div>
      </section>

      <CSVImport isOpen={showCSVImport} onClose={() => setShowCSVImport(false)} />

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title={t.settings.resetData}
        message={t.settings.resetConfirm}
        confirmLabel={t.common.confirm}
        danger
      />
    </>
  )
}
