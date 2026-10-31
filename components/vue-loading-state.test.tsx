import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { VueLoadingState } from './vue-loading-state'

it('shows a descriptive status alongside the spinner', () => {
  const markup = renderToStaticMarkup(
    <VueLoadingState loading loadingMessage="正在读取 Bangumi 本周放送数据…" />
  )

  expect(markup).toContain('role="status"')
  expect(markup).toContain('正在读取 Bangumi 本周放送数据…')
  expect(markup).toContain('aria-hidden="true"')
})
