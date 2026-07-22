import api from './index'

export const userAPI = {
  auth(token, config = {}) {
    return api.post('/user/auth', { token }, config)
  },
  getMe(config = {}) {
    return api.get('/user/me', config)
  },
  getOAuthUrl(config = {}) {
    return api.get('/user/oauth-url', config)
  },
  oauthCallback(code, config = {}) {
    return api.post('/user/oauth-callback', { code }, config)
  },
  getUser(username, config = {}) {
    return api.get(`/user/${username}`, config)
  },
  getCharacters(username, config = {}) {
    return api.get(`/user/${username}/characters`, config)
  },
  getPersons(username, config = {}) {
    return api.get(`/user/${username}/persons`, config)
  },
  getIndexes(username, config = {}) {
    return api.get(`/user/${username}/indexes`, config)
  },
  getFriends(username, config = {}) {
    return api.get(`/user/${username}/friends`, config)
  },
  getGroups(username, config = {}) {
    return api.get(`/user/${username}/groups`, config)
  },
  getTimeline(username, config = {}) {
    return api.get(`/user/${username}/timeline`, config)
  },
  getYearlyStats(username, config = {}) {
    return api.get(`/user/${username}/stats-yearly`, config)
  }
}

export const animeAPI = {
  search(params, config = {}) {
    return api.get('/anime/search', { params, ...config })
  },
  browse(params, config = {}) {
    return api.get('/anime/browse', { params, ...config })
  },
  getDetail(id, config = {}) {
    return api.get(`/anime/${id}`, config)
  },
  getEpisodes(id, params, config = {}) {
    return api.get(`/anime/${id}/episodes`, { params, ...config })
  },
  getCharacters(id, config = {}) {
    return api.get(`/anime/${id}/characters`, config)
  },
  getPersons(id, config = {}) {
    return api.get(`/anime/${id}/persons`, config)
  },
  getRelations(id, config = {}) {
    return api.get(`/anime/${id}/relations`, config)
  },
  getCalendar(config = {}) {
    return api.get('/anime/calendar', config)
  },
  getTags(config = {}) {
    return api.get('/anime/tags', config)
  },
  getCharacterDetail(id, config = {}) {
    return api.get(`/anime/character/${id}`, config)
  },
  getCharacterSubjects(id, config = {}) {
    return api.get(`/anime/character/${id}/subjects`, config)
  },
  getCharacterPersons(id, config = {}) {
    return api.get(`/anime/character/${id}/persons`, config)
  },
  getPersonDetail(id, config = {}) {
    return api.get(`/anime/person/${id}`, config)
  },
  getPersonSubjects(id, config = {}) {
    return api.get(`/anime/person/${id}/subjects`, config)
  }
}

export const collectionAPI = {
  getList(params, config = {}) {
    return api.get('/collection/list', { params, ...config })
  },
  getOne(animeId, config = {}) {
    return api.get(`/collection/${animeId}`, config)
  },
  save(animeId, body, config = {}) {
    return api.post(`/collection/${animeId}`, body, config)
  },
  remove(animeId, config = {}) {
    return api.delete(`/collection/${animeId}`, config)
  },
  getStats(config = {}) {
    return api.get('/collection/stats', config)
  }
}

export const commentsAPI = {
  getCharacterComments(id, config = {}) {
    return api.get(`/comments/character/${id}`, config)
  },
  getSubjectComments(id, config = {}) {
    return api.get(`/comments/subject/${id}`, config)
  },
  getSubjectTopics(id, config = {}) {
    return api.get(`/comments/subject/${id}/topics`, config)
  },
  getTopicDetail(topicId, config = {}) {
    return api.get(`/comments/topic/${topicId}`, config)
  },
  getPersonComments(id, config = {}) {
    return api.get(`/comments/person/${id}`, config)
  },
  postComment(subjectId, body, config = {}) {
    return api.post(`/comments/subject/${subjectId}/comment`, body, config)
  },
  postReply(topicId, body, config = {}) {
    return api.post(`/comments/topic/${topicId}/reply`, body, config)
  },
  postTalkbox(subjectId, body, config = {}) {
    return api.post(`/comments/subject/${subjectId}/talkbox`, body, config)
  },
  postTopic(subjectId, body, config = {}) {
    return api.post(`/comments/subject/${subjectId}/topic`, body, config)
  }
}

export const doubanAPI = {
  getRating(id, config = {}) {
    return api.get(`/douban/${id}`, config)
  },
  getDetails(id, name, config = {}) {
    if (name) {
      return api.get('/douban/by-name', { params: { name }, ...config })
    }
    return api.get(`/douban/${id}/details`, config)
  },
  getSummary(id, config = {}) {
    return api.get(`/douban/${id}/summary`, config)
  },
  getComments(id, config = {}) {
    return api.get(`/douban/${id}/comments`, config)
  },
  getReviews(id, config = {}) {
    return api.get(`/douban/${id}/reviews`, config)
  }
}

export const bilibiliAPI = {
  getDetails(id, name, config = {}) {
    if (name) {
      return api.get('/bilibili/by-name', { params: { name }, ...config })
    }
    return api.get(`/bilibili/${id}`, config)
  }
}

export const moegirlAPI = {
  search(q, config = {}) {
    return api.get('/moegirl/search', { params: { q }, ...config })
  },
  getSummary(name, config = {}) {
    return api.get(`/moegirl/${encodeURIComponent(name)}/summary`, config)
  }
}

export const groupAPI = {
  getList(config = {}) {
    return api.get('/groups/', config)
  },
  search(keyword, config = {}) {
    return api.get('/groups/search', { params: { keyword }, ...config })
  },
  getDetail(id, config = {}) {
    return api.get(`/groups/${id}`, config)
  }
}
