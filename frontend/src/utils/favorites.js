import { ElMessage } from 'element-plus'

const STORAGE_KEY = 'bangmio_favorites'

// 获取所有收藏
export function getFavorites() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Failed to get favorites:', error)
    return []
  }
}

// 添加收藏
export function addFavorite(anime) {
  try {
    const favorites = getFavorites()
    const exists = favorites.find(item => item.id === anime.id)
    if (!exists) {
      favorites.push({
        id: anime.id,
        name: anime.name,
        name_cn: anime.name_cn || anime.name,
        image: anime.image,
        desc: anime.description || anime.desc || '暂无描述',
        type: anime.type || '未知类型',
        score: anime.rating || anime.score || 0
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
      ElMessage.success('已添加到收藏')
      return true
    } else {
      ElMessage.warning('已在收藏中')
      return false
    }
  } catch (error) {
    console.error('Failed to add favorite:', error)
    ElMessage.error('添加收藏失败')
    return false
  }
}

// 移除收藏
export function removeFavorite(id) {
  try {
    const favorites = getFavorites()
    const newFavorites = favorites.filter(item => item.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites))
    ElMessage.success('已移除收藏')
    return true
  } catch (error) {
    console.error('Failed to remove favorite:', error)
    ElMessage.error('移除收藏失败')
    return false
  }
}

// 检查是否已收藏
export function isFavorite(id) {
  const favorites = getFavorites()
  return favorites.some(item => item.id === id)
}