/**
 * Tracks the latest scheduled async request.
 *
 * A request becomes stale as soon as a newer search is scheduled, including
 * while the newer search is still waiting for its debounce delay.
 */
export function createLatestRequestTracker() {
  let latestRequestId = 0

  return {
    next() {
      latestRequestId += 1
      return latestRequestId
    },
    isLatest(requestId: number) {
      return requestId === latestRequestId
    },
  }
}
