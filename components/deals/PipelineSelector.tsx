import { useTranslations } from '../../i18n'
import { usePipelinesStore } from '../../store/pipelinesStore'
import type { Pipeline } from '../../types'

interface Props {
  onManage?: () => void
}

export function PipelineSelector({ onManage }: Props) {
  const t = useTranslations()
  const { pipelines, activePipelineId, setActivePipelineId } = usePipelinesStore()

  if (pipelines.length <= 1 && !onManage) return null

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {t.pipelines.pipeline}
      </label>
      <select
        value={activePipelineId ?? ''}
        onChange={(e) => setActivePipelineId(e.target.value || null)}
        className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-surface-1 text-fg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {pipelines.map((p: Pipeline) => (
          <option key={p.id} value={p.id}>
            {p.name}{p.isDefault ? ` (${t.pipelines.default})` : ''}
          </option>
        ))}
      </select>
      {onManage && (
        <button
          type="button"
          onClick={onManage}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
        >
          {t.pipelines.manage}
        </button>
      )}
    </div>
  )
}
