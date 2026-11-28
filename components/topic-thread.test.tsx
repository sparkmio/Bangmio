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
vi.mock('./discussion-composer', () => ({ DiscussionComposer: () => null }))
vi.mock('./rich-text', () => ({ RichText: () => null }))
vi.mock('./reply-action', () => ({ ReplyAction: () => null }))

import { TopicThread } from './topic-thread'

let container: HTMLDivElement
let root: Root

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

describe('topic reply counts', () => {
  it('distinguishes the reported total from the number of replies loaded', async () => {
    await act(async () =>
      root.render(
        <TopicThread
          topic={{ title: 'Fixture topic', reply_count: 21 }}
          replies={Array.from({ length: 20 }, (_, index) => ({ id: index + 1, content: 'reply' }))}
          backHref="/groups"
          backLabel="返回小组"
        />
      )
    )

    expect(container.querySelector('#reply-heading')?.textContent).toBe(
      '回复（共 21 条，已加载 20 条）'
    )
  })
})

it('includes nested replies on the last page and preserves the return query', async () => {
  const replies = Array.from({ length: 30 }, (_, index) => ({ id: index + 1, content: 'reply' }))
  await act(async () =>
    root.render(
      <TopicThread
        topic={{ title: 'Fixture topic', reply_count: 31 }}
        replies={[
          ...replies.slice(0, 29),
          { ...replies[29], replies: [{ id: 31, content: 'nested' }] }
        ]}
        backHref="/groups"
        backLabel="返回小组"
        page="2"
        pagePath="/topic/42?from=group"
      />
    )
  )
  expect(
    [...container.querySelectorAll('.discussion-replies article small')].map(el => el.textContent)
  ).toContain('#31')
  expect(container.querySelector('nav[aria-label="回复分页"] a')?.getAttribute('href')).toBe(
    '/topic/42?from=group&page=1#reply-heading'
  )
})
