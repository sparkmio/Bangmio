import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))
vi.mock('./episode-list', () => ({ EpisodeList: () => <div>Episodes fixture</div> }))
vi.mock('./data-unavailable', () => ({ DataUnavailable: () => null }))
vi.mock('./collection-button', () => ({
  CollectionEditor: () => <div className="test-collection-editor">Collection fixture</div>
}))
vi.mock('./anime-card', () => ({ AnimeGrid: () => null }))
vi.mock('./rich-text', () => ({ RichText: () => <div>Summary fixture</div> }))

import { AnimeDetail } from './anime-detail'

let container: HTMLDivElement
let root: Root

const props = {
  subject: { id: 99, type: 2, name: 'Original title', name_cn: '中文标题', eps: 12 },
  relations: [],
  characters: [],
  persons: [],
  episodes: [],
  infobox: []
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe('anime detail collection placement', () => {
  it('renders the collection editor in the compact hero on overview', async () => {
    await act(async () => root.render(<AnimeDetail {...props} initialTab="overview" />))

    const hero = container.querySelector('.bm-detail-hero')!
    const editor = container.querySelector('.test-collection-editor')!
    expect(hero.contains(editor)).toBe(true)
    expect(container.querySelectorAll('.test-collection-editor')).toHaveLength(1)
  })

  it('omits the collection editor outside overview sections', async () => {
    await act(async () => root.render(<AnimeDetail {...props} initialTab="episodes" />))

    expect(container.querySelector('.test-collection-editor')).toBeNull()
    expect(container.textContent).toContain('Episodes fixture')
  })
})
