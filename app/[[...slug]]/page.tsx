'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { PropelLanding } from '@/components/marketing/PropelLanding'

const ClientApp = dynamic(() => import('@/components/ClientApp'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-propel-ink text-propel-cream">
      Loading…
    </div>
  ),
})

export default function CatchAllPage() {
  const params = useParams<{ slug?: string[] }>()
  const slug = params?.slug
  if (!slug || slug.length === 0) {
    return <PropelLanding />
  }
  return <ClientApp />
}
