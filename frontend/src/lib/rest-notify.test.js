import { describe, expect, it } from 'vitest'
import { REST_NOTIF_TAG, notificationsSupported, restNotifBody, restNotifTitle } from './rest-notify.js'

describe('rest-notify', () => {
  it('uses a stable notification tag', () => {
    expect(REST_NOTIF_TAG).toBe('rest-timer')
  })

  it('reports whether notifications are supported', () => {
    expect(typeof notificationsSupported()).toBe('boolean')
  })

  it('localises the rest-over body', () => {
    expect(restNotifBody()).toBeTruthy()
  })

  it('uses openGym as notification title', () => {
    expect(restNotifTitle()).toBe('openGym')
  })
})
