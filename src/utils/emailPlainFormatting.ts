/** Escape text before inline HTML substitutions. */
export function escapeHtmlForBody(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function lineToHtmlInline(escapedLine: string): string {
  let s = escapedLine
  s = s.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:4px" />',
  )
  s = s.replace(
    /\[([^\]]*)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2" style="color:inherit;text-decoration:underline">$1</a>',
  )
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/~~(.+?)~~/g, '<del>$1</del>')
  s = s.replace(/\+\+(.+?)\+\+/g, '<u>$1</u>')
  s = s.replace(/\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
  return s
}

/**
 * Plain composer body → HTML for providers.
 * Supports: **bold**, *italic*, ~~strike~~, ++underline++, [label](url), - bullets, 1. ordered, > quotes; newlines.
 */
export function formatPlainToHtml(plain: string): string {
  const lines = plain.split('\n')
  const parts: string[] = []
  let i = 0
  while (i < lines.length) {
    const raw = lines[i]
    if (/^>\s?/.test(raw)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s?/, ''))
        i += 1
      }
      const inner = quoteLines
        .map((l) => lineToHtmlInline(escapeHtmlForBody(l)))
        .join('<br/>')
      parts.push(
        `<blockquote style="margin:0.35em 0;padding-left:0.75em;border-left:3px solid rgba(120,120,140,0.45)">${inner}</blockquote>`,
      )
      continue
    }
    if (/^-\s+/.test(raw)) {
      const items: string[] = []
      while (i < lines.length && /^-\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^-\s+/, ''))
        i += 1
      }
      parts.push(
        `<ul style="margin:0.35em 0;padding-left:1.25em">${items
          .map((it) => `<li>${lineToHtmlInline(escapeHtmlForBody(it))}</li>`)
          .join('')}</ul>`,
      )
      continue
    }
    if (/^\d+\.\s+/.test(raw)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\d+\.\s+/, ''))
        i += 1
      }
      parts.push(
        `<ol style="margin:0.35em 0;padding-left:1.25em">${items
          .map((it) => `<li>${lineToHtmlInline(escapeHtmlForBody(it))}</li>`)
          .join('')}</ol>`,
      )
      continue
    }
    parts.push(lineToHtmlInline(escapeHtmlForBody(raw)) || '<br/>')
    i += 1
  }
  return parts.join('<br/>')
}

export type BodyEditResult = { body: string; selectionStart: number; selectionEnd: number }

function focusTextarea(
  el: HTMLTextAreaElement | null,
  start: number,
  end: number,
) {
  if (!el) return
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start, end)
  })
}

export function wrapSelectionMarkers(
  body: string,
  start: number,
  end: number,
  open: string,
  close: string,
  emptyPlaceholder: string,
): BodyEditResult {
  const sel = body.slice(start, end)
  const wrapped = sel ? `${open}${sel}${close}` : `${open}${emptyPlaceholder}${close}`
  const next = body.slice(0, start) + wrapped + body.slice(end)
  if (sel) {
    const caret = start + wrapped.length
    return { body: next, selectionStart: caret, selectionEnd: caret }
  }
  const innerStart = start + open.length
  const innerEnd = innerStart + emptyPlaceholder.length
  return { body: next, selectionStart: innerStart, selectionEnd: innerEnd }
}

export function prefixLinesInSelection(
  body: string,
  start: number,
  end: number,
  prefix: string,
  skipIfHasPrefix: string | RegExp,
): BodyEditResult {
  const chunk = body.slice(start, end)
  const shouldPrefix = (line: string) =>
    typeof skipIfHasPrefix === 'string' ? !line.startsWith(skipIfHasPrefix) : !skipIfHasPrefix.test(line)

  if (chunk) {
    const lines = chunk.split('\n').map((l) => (shouldPrefix(l) ? `${prefix}${l}` : l))
    const rep = lines.join('\n')
    const next = body.slice(0, start) + rep + body.slice(end)
    const caret = start + rep.length
    return { body: next, selectionStart: caret, selectionEnd: caret }
  }
  const ins = prefix
  const next = body.slice(0, start) + ins + body.slice(end)
  const caret = start + ins.length
  return { body: next, selectionStart: caret, selectionEnd: caret }
}

export function stripLinePrefixInSelection(
  body: string,
  start: number,
  end: number,
  pattern: RegExp,
): BodyEditResult {
  const chunk = body.slice(start, end)
  const lines = chunk.split('\n').map((l) => l.replace(pattern, ''))
  const rep = lines.join('\n')
  const next = body.slice(0, start) + rep + body.slice(end)
  const caret = start + rep.length
  return { body: next, selectionStart: caret, selectionEnd: caret }
}

export function indentSelection(body: string, start: number, end: number): BodyEditResult {
  const chunk = body.slice(start, end)
  const lines = chunk.split('\n')
  const rep = lines.map((l) => (l.length ? `  ${l}` : l)).join('\n')
  const next = body.slice(0, start) + rep + body.slice(end)
  const caret = start + rep.length
  return { body: next, selectionStart: caret, selectionEnd: caret }
}

export function outdentSelection(body: string, start: number, end: number): BodyEditResult {
  const chunk = body.slice(start, end)
  const lines = chunk.split('\n').map((l) => {
    if (l.startsWith('  ')) return l.slice(2)
    if (l.startsWith('\t')) return l.slice(1)
    return l
  })
  const rep = lines.join('\n')
  const next = body.slice(0, start) + rep + body.slice(end)
  const caret = start + rep.length
  return { body: next, selectionStart: caret, selectionEnd: caret }
}

/** Remove common lightweight markup in the selection (best-effort). */
export function clearFormattingInSelection(body: string, start: number, end: number): BodyEditResult {
  let chunk = body.slice(start, end)
  const stripRules: Array<[RegExp, string]> = [
    [/\*\*(.+?)\*\*/g, '$1'],
    [/~~(.+?)~~/g, '$1'],
    [/\+\+(.+?)\+\+/g, '$1'],
    [/\*(?!\*)([^*]+)\*(?!\*)/g, '$1'],
    [/\[([^\]]*)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '$1'],
    [/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '$1'],
  ]
  for (const [re, rep] of stripRules) {
    chunk = chunk.replace(re, rep)
  }
  chunk = chunk
    .split('\n')
    .map((l) =>
      l
        .replace(/^>\s?/, '')
        .replace(/^-\s+/, '')
        .replace(/^\d+\.\s+/, ''),
    )
    .join('\n')
  const next = body.slice(0, start) + chunk + body.slice(end)
  const caret = start + chunk.length
  return { body: next, selectionStart: caret, selectionEnd: caret }
}

export function applyEditToTextarea(
  el: HTMLTextAreaElement | null,
  edit: BodyEditResult,
  setBody: (v: string) => void,
) {
  setBody(edit.body)
  focusTextarea(el, edit.selectionStart, edit.selectionEnd)
}

/** Line range `[start, end)` for the lines that contain `from` through `to` (inclusive). */
export function expandSelectionToLineRange(body: string, from: number, to: number): [number, number] {
  const a = Math.min(from, to)
  const b = Math.max(from, to)
  const lineStart = body.lastIndexOf('\n', a - 1) + 1
  const nextNl = body.indexOf('\n', Math.max(a, b - 1))
  const lineEnd = nextNl === -1 ? body.length : nextNl
  return [lineStart, lineEnd]
}

export function numberLinesInSelection(body: string, start: number, end: number): BodyEditResult {
  const chunk = body.slice(start, end)
  if (!chunk) {
    const ins = '1. '
    const next = body.slice(0, start) + ins + body.slice(end)
    const pos = start + ins.length
    return { body: next, selectionStart: pos, selectionEnd: pos }
  }
  const lines = chunk.split('\n')
  const rep = lines
    .map((l, i) => {
      const stripped = l.replace(/^\d+\.\s+/, '')
      return `${i + 1}. ${stripped}`
    })
    .join('\n')
  const next = body.slice(0, start) + rep + body.slice(end)
  const caret = start + rep.length
  return { body: next, selectionStart: caret, selectionEnd: caret }
}
