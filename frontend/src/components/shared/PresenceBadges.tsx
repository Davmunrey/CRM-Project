type PresenceMember = { userId: string; name: string }

export function PresenceBadges({ users }: { users: PresenceMember[] }) {
  if (!users.length) return null
  const visible = users.slice(0, 3)
  const extra = users.length - visible.length
  return (
    <div className="inline-flex items-center gap-1.5">
      {visible.map((u) => (
        <span
          key={u.userId}
          className="inline-flex h-6 items-center rounded-full border border-fg/10 bg-surface-2 px-2 text-xs text-fg-muted"
          title={u.name}
        >
          {u.name}
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-flex h-6 items-center rounded-full border border-fg/10 bg-surface-2 px-2 text-xs text-fg-subtle">
          +{extra}
        </span>
      )}
    </div>
  )
}
