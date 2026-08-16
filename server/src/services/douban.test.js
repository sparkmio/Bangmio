import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getDoubanAbstract,
  getDoubanComments,
  getDoubanReviews,
  getDoubanSummary,
  searchDouban
} from './douban.js'

function jsonResponse(data, status = 200, contentType = 'application/json; charset=utf-8') {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': contentType } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('豆瓣移动端公开数据服务', () => {
  it('搜索仅保留 movie/tv 条目并转换评分字段', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        subjects: {
          items: [
            {
              target_type: 'tv',
              target: {
                id: '36093351',
                title: '葬送的芙莉莲',
                year: '2023',
                cover_url: 'https://img.example/frieren.jpg',
                rating: { value: 9.4, star_count: 4.5 }
              }
            },
            { target_type: 'book', target: { id: '1', title: '同名图书' } }
          ]
        }
      })
    )
    vi.stubGlobal('fetch', fetch)

    await expect(searchDouban('葬送的芙莉莲')).resolves.toEqual([
      {
        id: '36093351',
        title: '葬送的芙莉莲',
        year: '2023',
        rate: '9.4',
        star: 9,
        cover: 'https://img.example/frieren.jpg',
        type: 'tv'
      }
    ])
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/search?q=%E8%91%AC%E9%80%81%E7%9A%84%E8%8A%99%E8%8E%89%E8%8E%B2'),
      expect.objectContaining({ redirect: 'follow' })
    )
  })

  it('详情与摘要从 movie/tv 接口构建兼容字段', async () => {
    const payload = {
      id: '36093351',
      title: '葬送的芙莉莲',
      year: '2023',
      rating: { value: 9.4, star_count: 4.5 },
      intro: '  精灵魔法使踏上旅途。\n ',
      directors: [{ name: '斋藤圭一郎' }],
      actors: [{ name: '种崎敦美' }],
      genres: ['动画', '奇幻'],
      countries: ['日本'],
      durations: ['25分钟'],
      episodes_count: 28
    }
    const fetch = vi.fn().mockImplementation(async () => jsonResponse(payload))
    vi.stubGlobal('fetch', fetch)

    await expect(getDoubanAbstract('36093351')).resolves.toMatchObject({
      id: '36093351',
      rate: '9.4',
      star: 9,
      episodes_count: 28,
      directors: ['斋藤圭一郎'],
      intro: '精灵魔法使踏上旅途。'
    })
    await expect(getDoubanSummary('36093351')).resolves.toMatchObject({
      title: '葬送的芙莉莲',
      intro: '精灵魔法使踏上旅途。',
      keyInfo: {
        导演: '斋藤圭一郎',
        主演: '种崎敦美',
        类型: '动画 / 奇幻',
        '制片国家/地区': '日本',
        首播: '2023',
        单集片长: '25分钟'
      }
    })
  })

  it('完整映射短评与长评，不截断长评摘要', async () => {
    const longAbstract = '长评正文'.repeat(300)
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          interests: [
            {
              comment: '短评正文',
              create_time: '2026-08-16 12:00:00',
              rating: { star_count: 4 },
              vote_count: 12,
              user: { name: '短评用户' }
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          reviews: [
            {
              title: '长评标题',
              abstract: longAbstract,
              create_time: '2026-08-16 13:00:00',
              rating: { star_count: 5 },
              useful_count: 99,
              url: 'https://movie.douban.com/review/1/',
              user: { name: '长评用户' }
            }
          ]
        })
      )
    vi.stubGlobal('fetch', fetch)

    await expect(getDoubanComments('1')).resolves.toEqual([
      { user: '短评用户', rating: 40, time: '2026-08-16 12:00:00', content: '短评正文', useful: 12 }
    ])
    const reviews = await getDoubanReviews('1')
    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toMatchObject({
      user: '长评用户',
      rating: 50,
      useful: 99,
      url: 'https://movie.douban.com/review/1/'
    })
    expect(reviews[0].content).toHaveLength(longAbstract.length)
  })

  it('上游返回验证页、非 JSON 或请求异常时静默降级', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('<html>安全验证</html>', { status: 403 }))
      .mockResolvedValueOnce(
        new Response('<html>安全验证</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        })
      )
      .mockRejectedValueOnce(new Error('network error'))
    vi.stubGlobal('fetch', fetch)

    await expect(searchDouban('测试')).resolves.toEqual([])
    await expect(getDoubanComments('1')).resolves.toEqual([])
    await expect(getDoubanReviews('1')).resolves.toEqual([])
  })
})
