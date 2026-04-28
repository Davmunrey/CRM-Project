export function extractTraceContext(req: Request): { traceparent?: string; tracestate?: string } {
  const traceparent = req.headers.get('traceparent') ?? undefined
  const tracestate = req.headers.get('tracestate') ?? undefined
  return { traceparent, tracestate }
}

export function withTraceLog<T>(
  req: Request,
  fn: (trace: { traceparent?: string; tracestate?: string }) => Promise<T>,
): Promise<T> {
  const trace = extractTraceContext(req)
  return fn(trace)
}
