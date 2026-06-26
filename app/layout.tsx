import type { Metadata } from 'next'
import { Hanken_Grotesk } from 'next/font/google'
import './globals.css'

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Propel — Outbound-native CRM',
  description: 'AI-native CRM for outbound sales teams. Contacts, deals, sequences, and AI assistant.',
  icons: { icon: '/brand/logo-dark.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${hanken.variable}`}>
      <body className="min-h-screen bg-propel-ink font-sans text-fg antialiased">{children}</body>
    </html>
  )
}
