import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import ExerciseSummaryPanel from './ExerciseSummaryPanel.jsx'

const chartCalls = vi.hoisted(() => [])
const bodyMapCalls = vi.hoisted(() => [])

vi.mock('./LineChart.jsx', () => ({
  default: props => {
    chartCalls.push(props)
    return React.createElement('div', { 'data-line-chart': true })
  },
}))
vi.mock('./BodyMap.jsx', () => ({
  default: props => {
    bodyMapCalls.push(props)
    return React.createElement('div', { 'data-body-map': true })
  },
}))
vi.mock('./Media.jsx', () => ({ default: () => React.createElement('div', { 'data-media': true }) }))
vi.mock('./Icon.jsx', () => ({ default: props => React.createElement('span', props) }))

const S = {
  unit: 'kg',
  body: 'male',
  exWeights: {},
  workouts: [{
    id: 'w1',
    d: '2026-08-24',
    start: Date.UTC(2026, 7, 24, 12),
    name: 'Legs',
    entries: [{
      id: '0025',
      sets: [{ phase: 'work', w: 30, r: 8, done: true }],
    }],
  }],
}

vi.mock('../store/useStore.js', () => ({
  useStore: selector => selector({ S }),
}))

let dom
let root
let container

function installDom() {
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  dom = parsed.window
  globalThis.window = dom
  globalThis.document = dom.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.navigator })
  for (const key of ['HTMLElement', 'Node', 'Element', 'Event']) globalThis[key] = dom[key]
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.getElementById('root')
  root = createRoot(container)
}

async function renderPanel(props = {}) {
  chartCalls.length = 0
  bodyMapCalls.length = 0
  await act(async () => {
    root.render(React.createElement(ExerciseSummaryPanel, { ex: EXIDX['0025'], ...props }))
  })
}

function summaryToggle() {
  return container.querySelector('[aria-label="Progress summary"]')
}

beforeEach(() => {
  installDom()
})

afterEach(async () => {
  await act(async () => { root.unmount() })
})

describe('ExerciseSummaryPanel', () => {
  it('renders body map and chart with full meta by default', async () => {
    await renderPanel()
    expect(container.querySelector('[data-testid="exercise-summary"]')).toBeTruthy()
    expect(bodyMapCalls.length).toBe(1)
    expect(chartCalls.length).toBe(1)
    expect(chartCalls[0].h).toBe(150)
    expect(container.textContent).toMatch(/30 kg|30/)
  })

  it('hides body map and uses shorter chart when compact', async () => {
    await renderPanel({ compact: true, showMedia: false, showMeta: false, showPrs: false })
    expect(bodyMapCalls.length).toBe(0)
    expect(chartCalls[0].h).toBe(80)
  })

  it('starts collapsed and expands on toggle when collapsible', async () => {
    await renderPanel({ collapsible: true, showMedia: false, showMeta: false, showPrs: false })
    const toggle = summaryToggle()
    expect(toggle).toBeTruthy()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(chartCalls.length).toBe(0)

    await act(async () => { toggle.click() })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(chartCalls.length).toBe(1)
  })
})
