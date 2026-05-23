import { Router } from 'express'
import {
  searchAnime, browseAnime, getAnimeDetail, getAnimeEpisodes,
  getAnimeCharacters, getAnimePersons, getAnimeRelations, getAnimeCalendar, getAnimeTags,
  getCharacterDetail, getCharacterSubjects, getCharacterPersons,
  getPersonDetail, getPersonSubjects
} from '../controllers/animeController.js'

const router = Router()

router.get('/search', searchAnime)
router.get('/browse', browseAnime)
router.get('/calendar', getAnimeCalendar)
router.get('/tags', getAnimeTags)
router.get('/character/:id', getCharacterDetail)
router.get('/character/:id/subjects', getCharacterSubjects)
router.get('/character/:id/persons', getCharacterPersons)
router.get('/person/:id', getPersonDetail)
router.get('/person/:id/subjects', getPersonSubjects)
router.get('/:id', getAnimeDetail)
router.get('/:id/episodes', getAnimeEpisodes)
router.get('/:id/characters', getAnimeCharacters)
router.get('/:id/persons', getAnimePersons)
router.get('/:id/relations', getAnimeRelations)

export default router
