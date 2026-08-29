import { describe, expect, it } from 'vitest'
import { STORY_W, STORY_H, storyLabels } from './story-image.js'
import { workoutPostPayload, workoutPostSummary } from './feed.js'

describe('story-image', () => {
  it('uses Instagram story dimensions', () => {
    expect(STORY_W).toBe(1080)
    expect(STORY_H).toBe(1920)
  })

  it('builds label bundle from t()', () => {
    const labels = storyLabels(k => k)
    expect(labels.brand).toBe('openGym')
    expect(labels.duration).toBe('Duration')
  })
})

describe('feed', () => {
  it('packages workout for the server', () => {
    const payload = workoutPostPayload({
      id: 'w1',
      name: 'Push',
      d: '2026-01-01',
      vol: 5000,
      entries: [{ id: '0025', sets: [{ w: 60, r: 8, done: true }] }],
    }, 'kg')
    expect(payload.name).toBe('Push')
    expect(payload.entries[0].sets).toBe(1)
    expect(payload.entries[0].topW).toBe(60)
  })

  it('summarises a workout for the composer', () => {
    const s = workoutPostSummary({
      name: 'Legs',
      start: 0,
      end: 3600000,
      vol: 12000,
      entries: [{ sets: [{ done: true }, { done: true }] }],
    }, 'kg')
    expect(s.name).toBe('Legs')
    expect(s.sets).toBe(2)
  })
})
