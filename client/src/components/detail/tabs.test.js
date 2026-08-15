/**
 * Detail.vue Tab 子组件冒烟测试
 * 环境：jsdom（vitest.config.js 中 environmentMatchGlobs 覆盖本目录）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../api/endpoints.js', () => ({
  moegirlAPI: {
    search: vi.fn(),
    getSummary: vi.fn()
  }
}))
import TabEpisodes from './TabEpisodes.vue'
import TabCharacters from './TabCharacters.vue'
import TabStaff from './TabStaff.vue'
import TabRelations from './TabRelations.vue'
import TabWiki from './TabWiki.vue'
import TabRating from './TabRating.vue'
import TabDouban from './TabDouban.vue'
import TabMoegirl from './TabMoegirl.vue'
import TabMusic from './TabMusic.vue'
import { moegirlAPI } from '../../api/endpoints.js'
import TabStreaming from './TabStreaming.vue'
import { vImagePlaceholder } from '../../directives/imagePlaceholder.js'

const routerLinkStub = {
  template: '<a class="router-link-stub"><slot /></a>',
  props: ['to']
}

const routerTestGlobal = {
  stubs: { 'router-link': routerLinkStub },
  directives: { 'image-placeholder': vImagePlaceholder }
}
describe('Detail Tab 子组件冒烟测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('TabEpisodes 渲染章节与空状态', () => {
    const w = mount(TabEpisodes, {
      props: {
        episodes: [
          { id: 1, sort: 1, name_cn: '第一话', airdate: '2024-01-01', duration: '24m' },
          { id: 2, sort: 2, name: 'ep2' }
        ]
      }
    })
    expect(w.text()).toContain('第一话')
    expect(w.text()).toContain('ep2')
    const empty = mount(TabEpisodes, { props: { episodes: [] } })
    expect(empty.text()).toContain('暂无章节信息')
  })

  it('TabCharacters 渲染角色列表与空状态', () => {
    const w = mount(TabCharacters, {
      props: { characters: [{ id: 1, name: '主角A', relation: '主角', images: {} }] },
      global: routerTestGlobal
    })
    expect(w.text()).toContain('主角A')
    expect(w.findAll('.router-link-stub')).toHaveLength(1)
    const empty = mount(TabCharacters, {
      props: { characters: [] },
      global: routerTestGlobal
    })
    expect(empty.text()).toContain('暂无角色信息')
  })

  it('TabStaff 渲染制作人员与 career 转换', () => {
    const w = mount(TabStaff, {
      props: {
        persons: [
          { id: 1, name: '某人', relation: '', career: ['seiyu'], images: {} },
          { id: 2, name: '导演', relation: '导演', career: [] }
        ]
      },
      global: routerTestGlobal
    })
    expect(w.text()).toContain('某人')
    expect(w.text()).toContain('声优')
    expect(w.text()).toContain('导演')
    const empty = mount(TabStaff, {
      props: { persons: [] },
      global: routerTestGlobal
    })
    expect(empty.text()).toContain('暂无制作人员信息')
  })

  it('TabRelations 过滤音乐条目(type=3)', () => {
    const w = mount(TabRelations, {
      props: {
        relations: [
          { id: 1, type: 2, name_cn: '关联动画' },
          { id: 2, type: 3, name_cn: '音乐CD' },
          { id: 3, type: 1, name_cn: '关联书籍' }
        ]
      },
      global: { stubs: { AnimeCard: { template: '<div class="anime-card-stub" />' } } }
    })
    expect(w.findAll('.anime-card-stub')).toHaveLength(2)
  })

  it('TabWiki 渲染 infobox 键值与数组值', () => {
    const w = mount(TabWiki, {
      props: {
        subjectId: 1,
        infobox: [
          { key: '导演', value: '某人' },
          { key: '别名', value: [{ v: '别名A' }, { v: '别名B' }] }
        ]
      }
    })
    expect(w.text()).toContain('导演')
    expect(w.text()).toContain('别名A, 别名B')
    expect(w.text()).toContain('在 Bangumi 查看完整 Wiki')
  })

  it('TabRating 渲染 Bangumi 评分与豆瓣/B站降级文案', () => {
    const w = mount(TabRating, {
      props: {
        subjectId: 1,
        bgmRating: { score: 8.5, total: 1000 },
        doubanDetails: null,
        doubanLoading: false,
        bilibiliDetails: null,
        bilibiliLoading: false
      }
    })
    expect(w.text()).toContain('8.5')
    expect(w.text()).toContain('1000人评')
    expect(w.text()).toContain('豆瓣评分暂不可用')
    expect(w.text()).toContain('B站评分暂不可用')
  })

  it('TabRating 渲染豆瓣与B站数据', () => {
    const w = mount(TabRating, {
      props: {
        subjectId: 1,
        bgmRating: { score: 7, total: 10 },
        doubanDetails: { rate: '9.1', url: 'https://douban.com/x' },
        bilibiliDetails: { score: 9.5, score_count: 200, url: 'https://bilibili.com/x' }
      }
    })
    expect(w.text()).toContain('9.1')
    expect(w.text()).toContain('9.5')
    expect(w.text()).toContain('(200人)')
  })

  it('TabDouban 渲染结构化卡片与空状态搜索链接', () => {
    const w = mount(TabDouban, {
      props: {
        details: {
          rate: '8.9',
          title: '条目名',
          url: 'https://movie.douban.com/subject/1/',
          release_year: '2023',
          types: ['动画'],
          episodes_count: '12'
        },
        loading: false,
        summary: { title: '条目名', intro: '一段简介' },
        comments: [
          { user: '短评用户', rating: 50, time: '2026-08-15', content: '短评正文', useful: 12 }
        ],
        reviews: [
          {
            user: '长评用户',
            rating: 40,
            time: '2026-08-14',
            title: '长评标题',
            content: '长评正文',
            useful: 8
          }
        ],
        searchName: '条目名'
      }
    })
    expect(w.text()).toContain('8.9')
    expect(w.text()).toContain('★★★★')
    expect(w.text()).toContain('2023 年')
    expect(w.text()).toContain('一段简介')
    expect(w.text()).toContain('短评')
    expect(w.text()).toContain('短评用户')
    expect(w.text()).toContain('短评正文')
    expect(w.text()).toContain('长评')
    expect(w.text()).toContain('长评标题')
    expect(w.text()).toContain('长评正文')
    const empty = mount(TabDouban, { props: { searchName: '测试名' } })
    expect(empty.text()).toContain('未找到豆瓣条目')
    expect(empty.find('a').attributes('href')).toContain(encodeURIComponent('测试名'))
  })

  it('TabMoegirl 优先展示 API 摘要，不等待 HTML iframe', async () => {
    moegirlAPI.search.mockResolvedValue({
      data: { data: { results: [{ title: '测试词条' }] } }
    })
    moegirlAPI.getSummary.mockResolvedValue({
      data: {
        data: {
          title: '测试词条',
          extract: '来自 MediaWiki API 的词条导言',
          url: 'https://zh.moegirl.org.cn/%E6%B5%8B%E8%AF%95%E8%AF%8D%E6%9D%A1'
        }
      }
    })

    const w = mount(TabMoegirl, {
      props: { subjectId: 1, names: ['测试番剧'], active: false }
    })
    await w.setProps({ active: true })
    await flushPromises()

    expect(moegirlAPI.search).toHaveBeenCalledWith('测试番剧')
    expect(moegirlAPI.getSummary).toHaveBeenCalledWith('测试词条')
    expect(w.text()).toContain('来自 MediaWiki API 的词条导言')
    expect(w.find('iframe').exists()).toBe(false)
  })

  it('TabMusic 按关系分组渲染音乐条目', () => {
    const w = mount(TabMusic, {
      props: {
        searchName: '番名',
        relations: [
          { id: 1, type: 3, relation_type: 1, name: 'OP' },
          { id: 2, type: 3, relation_type: 2, name: 'ED' },
          { id: 3, type: 2, name: '不是音乐' }
        ]
      },
      global: { stubs: { MusicCard: { template: '<div class="music-card-stub" />' } } }
    })
    expect(w.text()).toContain('片头曲')
    expect(w.text()).toContain('片尾曲')
    expect(w.findAll('.music-card-stub')).toHaveLength(2)
  })

  it('TabStreaming 渲染 B 站直达或搜索链接', () => {
    const withDetail = mount(TabStreaming, {
      props: {
        title: '番名',
        bilibiliDetails: { url: 'https://bilibili.com/bangumi/x', title: 'B站标题' }
      }
    })
    expect(withDetail.text()).toContain('前往 B 站观看')
    const without = mount(TabStreaming, { props: { title: '番名', bilibiliDetails: null } })
    expect(without.text()).toContain('在 B 站搜索')
    expect(without.text()).toContain('girigirilove')
  })
})
