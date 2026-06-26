import { isDev } from './env'

export const devConsole = {
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args)
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args)
  },
}
