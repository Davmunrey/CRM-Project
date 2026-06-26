interface SkeletonProps {
  className?: string
}

/** Generic block skeleton using the global `.skeleton` utility */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden />
}
