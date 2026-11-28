import { DurableObject } from 'cloudflare:workers'
import nextWorker from './.open-next/worker.js'
import { serveCachedAnime } from './server/src/utils/animePageCache.js'

export class RateLimitCounter extends DurableObject {
  async consume(windowMs, max) {
    const storage = this.ctx.storage
    const now = Date.now()
    return storage.transaction(async txn => {
      const previous = await txn.get('window')
      const state = previous?.resetTime > now ? previous : { count: 0, resetTime: now + windowMs }
      if (state.count >= max) return { allowed: false, resetTime: state.resetTime }
      state.count++
      await txn.put('window', state)
      return { allowed: true, resetTime: state.resetTime }
    })
  }
}

export default {
  fetch(request, env, ctx) {
    return serveCachedAnime(request, ctx, () => nextWorker.fetch(request, env, ctx))
  }
}
