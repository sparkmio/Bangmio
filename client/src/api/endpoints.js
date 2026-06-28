import api from './index'

export const userAPI = {
  auth(token) { return api.post('/user/auth', { token }) },
  getMe() { return api.get('/user/me') },
  getOAuthUrl() { return api.get('/user/oauth-url') },
  oauthCallback(code) { return api.post('/user/oauth-callback', { code }) },
  getUser(username) { return api.get(`/user/${username}`) }
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
  getDetails(id) { return api.get(`/douban/${id}/details`) },
}

export const moegirlAPI = {
  search(q) { return api.get('/moegirl/search', { params: { q } }) },
}
