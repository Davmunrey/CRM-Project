// Ambient declarations for packages that ship their own types once installed.
// These stubs allow `tsc --noEmit` to pass before `npm install` has been run.
// They are replaced by the real type definitions after installation.

declare module 'prom-client' {
  export class Registry {
    metrics(): Promise<string>
    readonly contentType: string
  }
  export function collectDefaultMetrics(opts?: { register?: Registry }): void
  export class Counter<T extends string = string> {
    constructor(opts: { name: string; help: string; labelNames?: readonly T[]; registers?: Registry[] })
    inc(labels?: Partial<Record<T, string | number>>, value?: number): void
  }
  export class Gauge<T extends string = string> {
    constructor(opts: { name: string; help: string; labelNames?: readonly T[]; registers?: Registry[] })
    inc(labels?: Partial<Record<T, string | number>>, value?: number): void
    dec(labels?: Partial<Record<T, string | number>>, value?: number): void
    set(labels: Partial<Record<T, string | number>>, value: number): void
  }
  export class Histogram<T extends string = string> {
    constructor(opts: { name: string; help: string; labelNames?: readonly T[]; buckets?: number[]; registers?: Registry[] })
    observe(labels: Partial<Record<T, string | number>>, value: number): void
    startTimer(labels?: Partial<Record<T, string | number>>): (endLabels?: Partial<Record<T, string | number>>) => number
  }
}

declare module '@socket.io/redis-adapter' {
  import type { Redis } from 'ioredis'
  import type { Adapter } from 'socket.io-adapter'
  export function createAdapter(
    pubClient: Redis,
    subClient: Redis,
    opts?: Record<string, unknown>,
  ): (nsp: unknown) => Adapter
}
