import { describe, it, expect } from 'vitest'
import { parseGroupListHTML, parseGroupDetailHTML, parseGroupDiscoverHTML } from './groups.js'

const BASE = 'https://bgm.tv'

/**
 * groups.js 解析器测试（PROJECT_ISSUES 3.1：正则解析 HTML 迁移 linkedom）。
 * 使用本地 HTML fixture 验证 DOM 解析结果，不依赖上游网络。
 */

describe('parseGroupListHTML', () => {
  it('解析小组列表：名称/成员数/头像/绝对与相对链接', () => {
    const html = `
<!DOCTYPE html>
<html><head><title>小组列表</title></head>
<body>
<header><a href="/group/discover">发现</a></header>
<ul class="groupsList">
  <li>
    <a href="/group/bgm38"><img src="/img/icon/bgm38.jpg" alt="">Bangumi 新番组</a>
    <small>3800 位成员</small>
  </li>
  <li>
    <a href="/group/acg"><img src="//lain.bgm.tv/icon/acg.png" alt="">ACG 综合讨论</a>
    <small>5,600 成员</small>
  </li>
  <li><a href="https://bgm.tv/group/anime">动画</a> <small>4200 位成员</small></li>
  <li><a href="/group/12345">数字组</a></li>
  <li><a href="/group/icon.png">图片</a></li>
  <li><a href="/group/new_topic">新话题</a></li>
  <li><a href="/group/topic/99">某个话题</a></li>
</ul>
</body></html>`

    const groups = parseGroupListHTML(html, BASE)
    const ids = groups.map(g => g.id)
    expect(ids).toEqual(['bgm38', 'acg', 'anime'])

    const bgm38 = groups.find(g => g.id === 'bgm38')
    expect(bgm38).toMatchObject({
      id: 'bgm38',
      name: 'Bangumi 新番组',
      member_count: 3800,
      avatar: 'https://bgm.tv/img/icon/bgm38.jpg',
      url: 'https://bgm.tv/group/bgm38'
    })

    const acg = groups.find(g => g.id === 'acg')
    expect(acg).toMatchObject({
      id: 'acg',
      name: 'ACG 综合讨论',
      member_count: 5600,
      avatar: 'https://lain.bgm.tv/icon/acg.png'
    })

    const anime = groups.find(g => g.id === 'anime')
    expect(anime).toMatchObject({ id: 'anime', name: '动画', member_count: 4200 })
  })

  it('按 id 去重，且数量不超过 60', () => {
    const items = Array.from(
      { length: 70 },
      (_, i) => `<a href="/group/g${i}">组${i}</a> <span>${i + 1} 位成员</span>`
    )
    const html = `<ul>${items.join('\n')}</ul>`
    const groups = parseGroupListHTML(html, BASE)
    expect(groups).toHaveLength(60)
    expect(new Set(groups.map(g => g.id)).size).toBe(60)
  })

  it('HTML 实体被解码', () => {
    const html = `<a href="/group/a&amp;b">A&amp;B组</a> <span>9 位成员</span>`
    const groups = parseGroupListHTML(html, BASE)
    expect(groups[0]).toMatchObject({ id: 'a&b', name: 'A&B组', member_count: 9 })
  })
})

describe('parseGroupDetailHTML', () => {
  it('解析小组详情：名称/简介/成员数/头像/话题列表', () => {
    const html = `
<!DOCTYPE html>
<html><body>
<div class="header"><img src="/icon/xxx.jpg" alt=""></div>
<h1>Bangumi 新番组</h1>
<div class="group_desc">这里是小组简介，讨论新番。</div>
<div class="group_member">3800</div>
<p>小组共 <strong>3800</strong> 位成员</p>
<table class="topic_list">
  <tr>
    <td><a href="/group/topic/101">七月新番讨论帖</a></td>
    <td><a href="/user/sai">sai</a></td>
    <td class="posts">42</td>
    <td><small class="time">2025-7-1 12:00</small></td>
  </tr>
  <tr>
    <td><a href="/group/topic/102">十月新番展望</a></td>
    <td><a href="/user/admin">admin</a></td>
    <td class="posts">7</td>
    <td><small class="time">2025-8-2 10:30</small></td>
  </tr>
</table>
</body></html>`

    const detail = parseGroupDetailHTML(html, 'bgm38', BASE)
    expect(detail).toMatchObject({
      id: 'bgm38',
      name: 'Bangumi 新番组',
      description: '这里是小组简介，讨论新番。',
      member_count: 3800,
      avatar: 'https://bgm.tv/icon/xxx.jpg',
      url: 'https://bgm.tv/group/bgm38'
    })
    expect(detail.topics).toEqual([
      {
        id: '101',
        title: '七月新番讨论帖',
        author: 'sai',
        reply_count: 42,
        last_reply_time: '2025-7-1 12:00'
      },
      {
        id: '102',
        title: '十月新番展望',
        author: 'admin',
        reply_count: 7,
        last_reply_time: '2025-8-2 10:30'
      }
    ])
  })

  it('无 h1 时回退 id；无 .topic_list 时话题为空', () => {
    const html = `<div class="intro">没有标题的页面</div>`
    const detail = parseGroupDetailHTML(html, 'unknown', BASE)
    expect(detail.name).toBe('unknown')
    expect(detail.description).toBe('没有标题的页面')
    expect(detail.topics).toEqual([])
  })

  it('成员数从 class=group_member 元素回退解析', () => {
    const html = `<h1>小站</h1><div class="group_member">2,500</div>`
    const detail = parseGroupDetailHTML(html, 'x', BASE)
    expect(detail.member_count).toBe(2500)
  })

  it('话题表中无 topic_list 类时回退到含 /group/topic/ 链接的表格', () => {
    const html = `
<h1>小组</h1>
<table class="other">
  <tr><td><a href="/group/topic/77">旧版话题</a></td><td><a href="/user/u1">u1</a></td><td class="posts">3</td></tr>
</table>`
    const detail = parseGroupDetailHTML(html, 'x', BASE)
    expect(detail.topics).toHaveLength(1)
    expect(detail.topics[0]).toMatchObject({
      id: '77',
      title: '旧版话题',
      author: 'u1',
      reply_count: 3
    })
  })
})

describe('parseGroupDiscoverHTML', () => {
  it('解析所有小组的热门话题，并按回复数排序', () => {
    const html = `
<table class="topic_list">
  <tr><th>话题</th></tr>
  <tr>
    <td><a href="/group/topic/101" class="l">新番讨论</a> <small>(+9)</small></td>
    <td><a href="/group/anime">动画交流</a></td>
    <td><a href="/user/sai">sai</a></td>
    <td><small>2026-8-16 18:51</small></td>
  </tr>
  <tr>
    <td><a href="/group/topic/102" class="l">游戏闲聊</a> <small>(+42)</small></td>
    <td><a href="/group/game">游戏</a></td>
    <td><a href="/user/admin">admin</a></td>
    <td><small>2026-8-16 18:49</small></td>
  </tr>
</table>`

    expect(parseGroupDiscoverHTML(html, BASE)).toEqual([
      {
        id: '102',
        title: '游戏闲聊',
        group_id: 'game',
        group_name: '游戏',
        author: 'admin',
        reply_count: 42,
        last_reply_time: '2026-8-16 18:49',
        url: 'https://bgm.tv/group/topic/102'
      },
      {
        id: '101',
        title: '新番讨论',
        group_id: 'anime',
        group_name: '动画交流',
        author: 'sai',
        reply_count: 9,
        last_reply_time: '2026-8-16 18:51',
        url: 'https://bgm.tv/group/topic/101'
      }
    ])
  })

  it('没有话题表时返回空数组', () => {
    expect(parseGroupDiscoverHTML('<h1>小组</h1>', BASE)).toEqual([])
  })
})
