import type { HTMLAttributes, ReactNode } from 'react'

export function Table({ className = '', children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm text-fg rounded-xl border border-border-subtle ${className}`} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <thead className={`contacts-table-head border-b border-border-subtle ${className}`}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <tbody className={className}>{children}</tbody>
}

export function TableRow({
  children,
  className = '',
  interactive,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={`
        border-b border-border-subtle last:border-0 min-h-row
        ${interactive ? 'cursor-pointer hover:bg-accent-600/[0.08] transition-colors' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableCell({
  children,
  className = '',
  header,
  ...props
}: HTMLAttributes<HTMLTableCellElement> & { header?: boolean }) {
  const Tag = header ? 'th' : 'td'
  return (
    <Tag
      className={`px-4 py-3 text-left ${header ? 'text-xs font-semibold text-fg-muted uppercase tracking-wide' : 'text-fg'} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

interface DataTableProps<T> {
  rows: T[]
  columns: { id: string; header: ReactNode; cell: (row: T) => ReactNode }[]
  getRowKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: ReactNode
}

export function DataTable<T>({ rows, columns, getRowKey, onRowClick, empty }: DataTableProps<T>) {
  if (!rows.length && empty) {
    return <div className="py-8 text-center text-fg-muted text-sm">{empty}</div>
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((c) => (
            <TableCell key={c.id} header>
              {c.header}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={getRowKey(row)} interactive={!!onRowClick} onClick={() => onRowClick?.(row)}>
            {columns.map((c) => (
              <TableCell key={c.id}>{c.cell(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
