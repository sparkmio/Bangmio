import { afterEach, expect, it, vi } from 'vitest'
import { createUpstreamCircuit } from './upstreamCircuit.js'

afterEach(() => vi.useRealTimers())

it('skips a failing host until cooldown and allows it to recover independently', async () => {
  vi.useFakeTimers()
  const circuit = createUpstreamCircuit()
  const attempt = vi.fn().mockRejectedValue(Object.assign(new Error('unavailable'), { status: 503 }))
  const mirror = 'https://api.bgm.lat'
  for (let count = 0; count < 3; count++) await expect(circuit(mirror, attempt)).rejects.toThrow()
  await expect(circuit(mirror, attempt)).rejects.toMatchObject({ name: 'CircuitOpenError' })
  expect(attempt).toHaveBeenCalledTimes(3)
  await expect(circuit('https://api.bgm.tv', async () => 'healthy')).resolves.toBe('healthy')
  vi.advanceTimersByTime(30_001)
  attempt.mockResolvedValue('recovered')
  await expect(circuit(mirror, attempt)).resolves.toBe('recovered')
})
