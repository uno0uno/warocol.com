import { describe, expect, it } from 'vitest'
import { createLatestRequestTracker } from './latestRequestTracker'

describe('createLatestRequestTracker', () => {
  it('prevents an older search response from replacing the latest results', () => {
    const tracker = createLatestRequestTracker()
    const olderRequest = tracker.next()
    const latestRequest = tracker.next()
    let result = ''

    if (tracker.isLatest(latestRequest)) result = 'latest'
    if (tracker.isLatest(olderRequest)) result = 'older'

    expect(result).toBe('latest')
    expect(tracker.isLatest(olderRequest)).toBe(false)
  })
})
