import '@testing-library/jest-dom'
import * as axeMatchers from 'vitest-axe/matchers'
import { beforeAll, beforeEach, expect } from 'vitest'
import { useI18nStore } from '../src/i18n'

expect.extend(axeMatchers)

/** jsdom has no canvas 2D; Recharts and similar call `getContext('2d')` during import/render. */
beforeAll(() => {
  const stub2d = {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: () => {},
    createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    setTransform: () => {},
    resetTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    transform: () => {},
    rect: () => {},
    clip: () => {},
    fillText: () => {},
    measureText: () => ({ width: 0 }),
  } as unknown as CanvasRenderingContext2D

  HTMLCanvasElement.prototype.getContext = function (type: string) {
    if (type === '2d') return stub2d
    return null
  }

  /** jsdom logs "Not implemented" when the second arg is a pseudo-selector; axe may query `::before`. */
  const nativeGetComputedStyle = window.getComputedStyle.bind(window)
  window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
    if (pseudoElt) return nativeGetComputedStyle(elt)
    return nativeGetComputedStyle(elt, pseudoElt)
  }
})

beforeEach(() => {
  window.localStorage.clear()
  useI18nStore.setState({ language: 'en', languageMode: 'manual' })
})
