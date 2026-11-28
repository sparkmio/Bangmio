// Failure counters are local to the isolate. Only the outcome of a completed
// upstream attempt is shared, never its response or credentials.
const COOLDOWN_MS = 30_000

export function createUpstreamCircuit() {
  const origins = new Map()
  return async function withUpstreamCircuit(url, attempt) {
    const key = new URL(url).origin
    let state = origins.get(key)
    if (!state) {
      state = { failures: 0, until: 0, probing: false }
      if (origins.size === 32) origins.delete(origins.keys().next().value)
      origins.set(key, state)
    }
    const now = Date.now()
    if (state.until > now || state.probing) {
      throw Object.assign(new Error('Upstream temporarily unavailable'), { name: 'CircuitOpenError' })
    }
    const probing = Boolean(state.until)
    if (probing) state.probing = true
    try {
      const result = await attempt()
      state.failures = 0
      state.until = 0
      return result
    } catch (error) {
      const status = error?.status ?? error?.response?.status
      if (status === 429 || status >= 500 || (status == null && error?.name !== 'AbortError')) {
        if (probing || ++state.failures >= 3) state.until = Date.now() + COOLDOWN_MS
      } else if (status != null) {
        state.failures = 0
        state.until = 0
      }
      throw error
    } finally {
      if (probing) state.probing = false
    }
  }
}

export const withUpstreamCircuit = createUpstreamCircuit()
