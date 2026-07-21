import { Hono } from 'hono'
import {
  searchAnime,
  browseAnime,
  getAnimeDetail,
  getAnimeEpisodes,
  getAnimeCharacters,
  getAnimePersons,
  getAnimeRelations,
  getAnimeCalendar,
  getAnimeTags,
  getCharacterDetail,
  getCharacterSubjects,
  getCharacterPersons,
  getPersonDetail,
  getPersonSubjects
} from '../controllers/animeController.js'

const app = new Hono()

app.get('/search', searchAnime)
app.get('/browse', browseAnime)
app.get('/calendar', getAnimeCalendar)
app.get('/tags', getAnimeTags)
app.get('/character/:id', getCharacterDetail)
app.get('/character/:id/subjects', getCharacterSubjects)
app.get('/character/:id/persons', getCharacterPersons)
app.get('/person/:id', getPersonDetail)
app.get('/person/:id/subjects', getPersonSubjects)
app.get('/:id', getAnimeDetail)
app.get('/:id/episodes', getAnimeEpisodes)
app.get('/:id/characters', getAnimeCharacters)
app.get('/:id/persons', getAnimePersons)
app.get('/:id/relations', getAnimeRelations)

export default app
