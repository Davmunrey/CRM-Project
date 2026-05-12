import { Link } from 'react-router-dom'
import {
  Zap,
  Mail,
  Users,
  BarChart3,
  GitBranch,
  Shield,
  Globe,
  Inbox,
  ArrowRight,
  CheckCircle,
  Bot,
  Webhook,
} from 'lucide-react'
import { Logo } from '../components/brand/Logo'

const FEATURES = [
  {
    icon: Inbox,
    title: 'Unified Inbox',
    description: 'Gmail sync nativo. Lee, responde y rastrea emails directamente desde Velo sin cambiar de pestaña.',
  },
  {
    icon: GitBranch,
    title: 'Sequences automáticas',
    description: 'Cadencias multi-paso con lógica condicional. El CRM avanza solo cuando el lead responde.',
  },
  {
    icon: BarChart3,
    title: 'Pipeline & Forecast',
    description: 'Kanban drag-and-drop, timeline de pipeline y forecast en tiempo real para el equipo y managers.',
  },
  {
    icon: Bot,
    title: 'AI Orchestrator',
    description: 'Puntuación de leads, resúmenes de conversación y sugerencias de siguiente acción impulsadas por IA.',
  },
  {
    icon: Users,
    title: 'Multi-tenant & SCIM',
    description: 'Un workspace por organización con SSO, MFA, provisioning SCIM v2 y control de permisos por rol.',
  },
  {
    icon: Mail,
    title: 'SMTP propio',
    description: 'Trae tu propio servidor SMTP o usa Resend. Dominio propio, reputación propia, máxima entregabilidad.',
  },
  {
    icon: Webhook,
    title: 'Webhooks & API pública',
    description: 'Conecta Velo a tu stack: Zapier, Make, o directo vía API REST documentada con API keys por org.',
  },
  {
    icon: Shield,
    title: 'Seguridad enterprise',
    description: 'RLS por organización, audit log completo, 2FA obligatorio y exportación de datos en un clic.',
  },
  {
    icon: Globe,
    title: 'Multilingüe',
    description: 'Interfaz disponible en inglés, español, portugués, francés, alemán e italiano. Más en camino.',
  },
]

const STATS = [
  { value: '9', label: 'idiomas' },
  { value: '29', label: 'funciones edge' },
  { value: '∞', label: 'workspaces' },
  { value: '0', label: 'downtime objetivo' },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-navy-950 text-white overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-navy-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-brand-sm"
              style={{ backgroundColor: '#4f46e5' }}
            >
              <Logo variant="icon" theme="onAccent" size={18} />
            </div>
            <Logo variant="wordmark" theme="dark" size={20} />
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors duration-150">Funciones</a>
            <a href="#stack" className="hover:text-white transition-colors duration-150">Stack</a>
          </nav>

          <Link
            to="/login"
            className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 px-4 py-2 text-sm font-medium text-white transition-all duration-150"
          >
            Iniciar sesión
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-velo-500/30 bg-velo-500/10 px-4 py-1.5 text-xs font-medium text-velo-300 mb-8">
          <Zap className="w-3.5 h-3.5" />
          CRM outbound-native · Self-hosted · Open stack
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
          Cierra más deals.{' '}
          <span className="bg-gradient-to-r from-velo-400 to-brandAccent bg-clip-text text-transparent">
            Sin depender de nadie.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-white/60 mb-10 leading-relaxed">
          Velo es un CRM construido para equipos de ventas outbound que necesitan velocidad, control total sobre sus datos
          y una herramienta que no les falle cuando más importa.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-full bg-velo-600 hover:bg-velo-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-velo-900/40 hover:shadow-velo-800/50 transition-all duration-200 hover:scale-[1.02]"
          >
            Entrar al CRM
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/register"
            className="flex items-center gap-2 rounded-full border border-white/15 hover:border-white/25 bg-white/5 hover:bg-white/10 px-7 py-3.5 text-base font-medium text-white/80 hover:text-white transition-all duration-200"
          >
            Crear cuenta
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-white/5 bg-white/2">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold font-display text-white mb-1">{value}</p>
              <p className="text-sm text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Todo lo que tu equipo necesita
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Sin módulos de pago extra. Sin límites artificiales. Sin sorpresas.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-navy-950 hover:bg-navy-900/80 p-7 transition-colors duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-velo-600/15 flex items-center justify-center mb-4 group-hover:bg-velo-600/25 transition-colors duration-200">
                <Icon className="w-5 h-5 text-velo-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Self-host block */}
      <section id="stack" className="max-w-6xl mx-auto px-6 py-12 pb-24">
        <div className="rounded-2xl border border-velo-500/20 bg-gradient-to-br from-velo-900/30 via-navy-900/40 to-navy-900/20 p-10 sm:p-14 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-velo-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                Tu infra. Tus datos.{' '}
                <span className="text-velo-400">Siempre.</span>
              </h2>
              <p className="text-white/60 leading-relaxed mb-6">
                Velo está diseñado para correrse en tu propio servidor. Docker Compose, Postgres propio y un API
                Fastify que reemplaza cualquier BaaS. Sin lock-in, sin facturas sorpresa.
              </p>

              <ul className="space-y-3">
                {[
                  'Postgres + Fastify API — sin Supabase',
                  'Nginx para el frontend — sin Vercel',
                  'Socket.io para realtime',
                  'Docker Compose listo para producción',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                    <CheckCircle className="w-4 h-4 text-velo-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="font-mono text-sm bg-navy-950/60 rounded-xl border border-white/8 p-6 text-left">
              <p className="text-white/30 mb-3"># Deploy en 5 minutos</p>
              <p><span className="text-velo-400">$</span> <span className="text-white/80">git clone velo-crm</span></p>
              <p><span className="text-velo-400">$</span> <span className="text-white/80">cp .env.example .env</span></p>
              <p><span className="text-velo-400">$</span> <span className="text-white/80">docker compose up -d</span></p>
              <p className="mt-3 text-white/30"># CRM disponible en :80</p>
              <p className="text-emerald-400 mt-1">✓ Postgres, API y frontend levantados</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-white/5">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Listo para cerrar más deals
          </h2>
          <p className="text-white/50 mb-8">
            Entra a tu workspace o crea una cuenta nueva. Sin tarjeta. Sin demos de 45 minutos.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-velo-600 hover:bg-velo-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-velo-900/50 hover:shadow-velo-800/60 transition-all duration-200 hover:scale-[1.02]"
          >
            Entrar a Velo
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-navy-950">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#4f46e5' }}
            >
              <Logo variant="icon" theme="onAccent" size={13} />
            </div>
            <span className="text-sm font-semibold text-white/60">Velo</span>
          </div>
          <p className="text-xs text-white/25">CRM outbound-native · Self-hosted · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}
