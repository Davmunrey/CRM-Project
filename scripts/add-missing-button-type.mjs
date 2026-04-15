/**
 * Adds type="button" to native <button> opening tags in TSX that omit `type`
 * (avoids accidental form submit). Skips when type= is already present (submit, button, reset).
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

function walkTsx(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) walkTsx(p, out)
    else if (name.isFile() && p.endsWith('.tsx')) out.push(p)
  }
  return out
}

function patchContent(src) {
  let i = 0
  let out = ''
  while (i < src.length) {
    const start = src.indexOf('<button', i)
    if (start === -1) {
      out += src.slice(i)
      break
    }
    out += src.slice(i, start)
    const afterWord = start + 7
    if (afterWord < src.length && /[a-zA-Z0-9_-]/.test(src[afterWord])) {
      // e.g. <buttonGroup — not a button tag
      out += src.slice(start, start + 7)
      i = start + 7
      continue
    }
    const endTag = src.indexOf('>', start)
    if (endTag === -1) {
      out += src.slice(start)
      break
    }
    const inner = src.slice(start + 7, endTag)
    if (/^\s*type\s*=/m.test(inner)) {
      out += src.slice(start, endTag + 1)
    } else {
      out += '<button type="button"' + inner + '>'
    }
    i = endTag + 1
  }
  return out
}

const targets = [path.join(root, 'src', 'pages'), path.join(root, 'src', 'components')]
let changed = 0
for (const dir of targets) {
  for (const file of walkTsx(dir)) {
    const before = fs.readFileSync(file, 'utf8')
    const after = patchContent(before)
    if (after !== before) {
      fs.writeFileSync(file, after)
      changed++
      console.log('patched', path.relative(root, file))
    }
  }
}
console.log('files changed:', changed)
