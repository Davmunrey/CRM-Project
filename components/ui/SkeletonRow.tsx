interface SkeletonRowProps {
  cols?: number
  rows?: number
}

const WIDTH_CLASSES = ['w-3/5', 'w-2/3', 'w-4/5'] as const

export function SkeletonRow({ cols = 5, rows = 8 }: SkeletonRowProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border-subtle">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className={`skeleton h-4 rounded ${WIDTH_CLASSES[(i + j) % WIDTH_CLASSES.length]}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
    </div>
  )
}
