import type { Metadata } from 'next'
import { Hanken_Grotesk, Schibsted_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const hanken = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-hanken',
  display: 'swap',
})

const schibsted = Schibsted_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Propel — Outbound-native CRM',
  description: 'AI-native CRM for outbound sales teams. Contacts, deals, sequences, and AI assistant.',
  icons: { icon: '/brand/logo-dark.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${hanken.variable} ${schibsted.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-propel-ink font-sans text-fg antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
