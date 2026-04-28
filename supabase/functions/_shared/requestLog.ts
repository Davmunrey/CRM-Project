/**
 * Structured JSON logs for Edge Functions: `{ ts, request_id, function, level, msg, ...ctx }`
 */
export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id')?.trim() || crypto.randomUUID()
}

export function edgeLog(input: {
  function: string
  level: 'debug' | 'info' | 'warn' | 'error'
  msg: string
  request_id?: string
} & Record<string, unknown>): void {
  const { function: fn, level, msg, request_id, ...rest } = input
  const line = {
    ts: new Date().toISOString(),
    request_id: request_id ?? crypto.randomUUID(),
    function: fn,
    level,
    msg,
    ...rest,
  }
  console.log(JSON.stringify(line))
}
