/** Single "Re: …" subject; strips stacked Re: prefixes (any casing). */
export function buildReplySubject(raw: string | undefined | null): string {
  let s = (raw ?? '').trim()
  while (/^re:\s*/i.test(s)) {
    s = s.replace(/^re:\s*/i, '').trim()
  }
  return s ? `Re: ${s}` : 'Re:'
}
