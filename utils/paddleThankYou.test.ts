import assert from 'node:assert/strict'
import test from 'node:test'

import {
  paddleThankYouPhaseFromStatus,
  PADDLE_THANK_YOU_MAX_ATTEMPTS,
} from './paddleThankYou.ts'

test('thank-you phase is ready when WARO access is full', () => {
  assert.equal(
    paddleThankYouPhaseFromStatus({ waro_ready: true, access_level: 'full' }, 1),
    'ready',
  )
  assert.equal(
    paddleThankYouPhaseFromStatus({ waro_ready: false, access_level: 'full_with_warning' }, 1),
    'ready',
  )
})

test('thank-you phase stays activating until timeout', () => {
  assert.equal(
    paddleThankYouPhaseFromStatus({ waro_ready: false, access_level: 'starter' }, 3),
    'activating',
  )
  assert.equal(
    paddleThankYouPhaseFromStatus({ waro_ready: false }, PADDLE_THANK_YOU_MAX_ATTEMPTS),
    'timeout',
  )
})
