/**
 * Dev-only logging. Avoids noisy console output in production bundles and reduces
 * accidental leakage of diagnostic data in shipped builds.
 */
const enabled = import.meta.env.DEV

export const devConsole = {
  warn: (...args: unknown[]) => {
    if (enabled) console.warn(...args)
  },
  error: (...args: unknown[]) => {
    if (enabled) console.error(...args)
  },
}
