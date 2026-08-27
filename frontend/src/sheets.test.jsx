import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXIDX } from './lib/exercises.js'
import { ExerciseDetail, ExConfig } from './sheets.jsx'

const chartCalls = vi.hoisted(() => [])
const bodyMapCalls = vi.hoisted(() => [])

vi.mock('./components/LineChart.jsx', () => ({
  default: props => {
    chartCalls.push(props)
    return React.createElement('div', { 'data-line-chart': true, 'data-points': props.points?.length || 0 })
  },
}))
vi.mock('./components/BodyMap.jsx', () => ({
  default: props => {
    bodyMapCalls.push(props)
    return React.createElement('div', { 'data-body-map': true })
  },
}))
vi.mock('./components/Media.jsx', () => ({
  default: () => React.createElement('div', { 'data-media': true }),
  Thumb: () => React.createElement('div'),
}))
vi.mock('./components/Icon.jsx', () => ({ default: props => React.createElement('span', props) }))
vi.mock('./components/Stepper.jsx', () => ({ default: () => React.createElement('div') }))
vi.mock('./store/useUI.js', () => ({ useUI: { getState: () => ({ toast: () => {}, openSheet: () => {} }) } }))

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

vi.mock('./store/useStore.js', () => ({
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

async function renderDetail(ex = EXIDX['0025']) {
  chartCalls.length = 0
  bodyMapCalls.length = 0
  await act(async () => {
    root.render(React.createElement(ExerciseDetail, { ex, close: () => {} }))
  })
}

async function renderConfig(ex = EXIDX['0025'], props = {}) {
  chartCalls.length = 0
  bodyMapCalls.length = 0
  await act(async () => {
    root.render(React.createElement(ExConfig, {
      ex,
      existing: { sets: 3, reps: 8, weight: 30 },
      onSave: () => {},
      close: () => {},
      ...props,
    }))
  })
}

function text() {
  return container.textContent || ''
}

function clickButton(label) {
  const btn = [...container.querySelectorAll('button')].find(el => (el.textContent || '').includes(label))
  expect(btn).toBeTruthy()
  act(() => { btn.click() })
}

beforeEach(() => {
  installDom()
})

afterEach(async () => {
  await act(async () => { root.unmount() })
})

describe('ExerciseDetail tabs', () => {
  it('renders summary with body map and chart by default', async () => {
    await renderDetail()
    expect(text()).toContain('Summary')
    expect(bodyMapCalls.length).toBe(1)
    expect(chartCalls.length).toBe(1)
    expect(chartCalls[0].points.length).toBeGreaterThan(0)
  })

  it('switches to history and instructions tabs', async () => {
    await renderDetail()
    clickButton('History')
    expect(text()).toMatch(/Aug|24/)
    expect(chartCalls.length).toBe(1)
    clickButton('Instructions')
    expect(text()).toMatch(/How to|Estimated 1RM/)
  })

  it('shows local classifications when estimates exist', async () => {
    await renderDetail()
    clickButton('Classifications')
    expect(text()).toMatch(/#1|Your rank|Among all logged exercises/)
  })
})

describe('ExConfig tabs', () => {
  it('opens on Plan tab with config fields and Summary shows body map', async () => {
    await renderConfig()
    expect(text()).toMatch(/Plan|Save|Sets/)
    expect(bodyMapCalls.length).toBe(0)
    clickButton('Summary')
    expect(bodyMapCalls.length).toBe(1)
    expect(chartCalls.length).toBe(1)
  })
})
