import api from './index'

export const userAPI = {
  auth(token) { return api.post('/user/auth', { token }) },
  getMe() { return api.get('/user/me') },
  getOAuthUrl() { return api.get('/user/oauth-url') },
  oauthCallback(code) { return api.post('/user/oauth-callback', { code }) },
  getUser(username) { return api.get(`/user/${username}`) },
  getCharacters(username) {
    return api.get(`/user/${username}/characters`)
  },
  getPersons(username) {
    return api.get(`/user/${username}/persons`)
  },
  getIndexes(username) {
    return api.get(`/user/${username}/indexes`)
  },
  getFriends(username) { return api.get(`/user/${username}/friends`) },
  getGroups(username) { return api.get(`/user/${username}/groups`) },
  getTimeline(username) { return api.get(`/user/${username}/timeline`) },
  getYearlyStats(username) { return api.get(`/user/${username}/stats-yearly`) }
}

export const animeAPI = {
  search(params) { return api.get('/anime/search', { params }) },
  browse(params) { return api.get('/anime/browse', { params }) },
  getDetail(id) { return api.get(`/anime/${id}`) },
  getEpisodes(id, params) { return api.get(`/anime/${id}/episodes`, { params }) },
  getCharacters(id) { return api.get(`/anime/${id}/characters`) },
  getPersons(id) { return api.get(`/anime/${id}/persons`) },
  getRelations(id) { return api.get(`/anime/${id}/relations`) },
  getCalendar() { return api.get('/anime/calendar') },
  getTags() { return api.get('/anime/tags') },
  getCharacterDetail(id) { return api.get(`/anime/character/${id}`) },
  getCharacterSubjects(id) { return api.get(`/anime/character/${id}/subjects`) },
  getCharacterPersons(id) { return api.get(`/anime/character/${id}/persons`) },
  getPersonDetail(id) { return api.get(`/anime/person/${id}`) },
  getPersonSubjects(id) { return api.get(`/anime/person/${id}/subjects`) }
}

export const collectionAPI = {
  getList(params) { return api.get('/collection/list', { params }) },
  getOne(animeId) { return api.get(`/collection/${animeId}`) },
  save(animeId, body) { return api.post(`/collection/${animeId}`, body) },
  remove(animeId) { return api.delete(`/collection/${animeId}`) },
  getStats() { return api.get('/collection/stats') }
}

export const commentsAPI = {
  getCharacterComments(id) { return api.get(`/comments/character/${id}`) },
  getSubjectComments(id) { return api.get(`/comments/subject/${id}`) },
  getSubjectTopics(id) { return api.get(`/comments/subject/${id}/topics`) },
  getTopicDetail(topicId) { return api.get(`/comments/topic/${topicId}`) },
  getPersonComments(id) { return api.get(`/comments/person/${id}`) },
  postComment(subjectId, body) { return api.post(`/comments/subject/${subjectId}/comment`, body) },
  postReply(topicId, body) { return api.post(`/comments/topic/${topicId}/reply`, body) },
  postTalkbox(subjectId, body) { return api.post(`/comments/subject/${subjectId}/talkbox`, body) },
  postTopic(subjectId, body) { return api.post(`/comments/subject/${subjectId}/topic`, body) },
}

export const doubanAPI = {
  getRating(id) { return api.get(`/douban/${id}`) },
  getDetails(id, name) {
    if (name) {
      return api.get('/douban/by-name', { params: { name } })
    }
    return api.get(`/douban/${id}/details`)
  },
  getComments(id) {
    return api.get(`/douban/${id}/comments`)
  },
  getReviews(id) { return api.get(`/douban/${id}/reviews`) }
}

export const moegirlAPI = {
  search(q) { return api.get('/moegirl/search', { params: { q } }) },
}

export const groupAPI = {
  getList() {
    return api.get('/groups/')
  },
  getDetail(id) {
    return api.get(`/groups/${id}`)
  }
}
