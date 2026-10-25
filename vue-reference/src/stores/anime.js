import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collectionAPI } from '../api/endpoints'

export const useAnimeStore = defineStore('anime', () => {
  const collections = ref({})
  const stats = ref({ want: 0, watching: 0, completed: 0, on_hold: 0, dropped: 0, total: 0 })

  async function fetchCollection(animeId) {
    try {
      const res = await collectionAPI.getOne(animeId)
      collections.value[animeId] = res.data.data
      return res.data.data
    } catch {
      return null
    }
  }

  async function saveCollection(animeId, { status, rating, comment, episode } = {}) {
    const body = {}
    if (status !== undefined) body.status = status
    if (rating !== undefined) body.rating = rating
    if (comment !== undefined) body.comment = comment
    if (episode !== undefined) body.episode = episode

    const res = await collectionAPI.save(animeId, body)
    collections.value[animeId] = res.data.data
    await fetchStats()
    return res.data.data
  }

  async function removeCollection(animeId) {
    await collectionAPI.remove(animeId)
    collections.value[animeId] = null
    await fetchStats()
  }

  async function fetchStats() {
    try {
      const res = await collectionAPI.getStats()
      stats.value = res.data.data
    } catch {
      /* ignore */
    }
  }

  function getCollection(animeId) {
    return collections.value[animeId] || null
  }

  return {
    collections,
    stats,
    fetchCollection,
    saveCollection,
    removeCollection,
    fetchStats,
    getCollection
  }
})
