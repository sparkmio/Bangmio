'use client'

import Link from 'next/link'

const originalFeatures = [
  ['OAuth 登录', '一键登录或手动粘贴 Access Token'],
  ['收藏管理', '想看/在看/看过/搁置/弃番，支持评分和短评'],
  ['番剧/游戏/书籍/音乐详情', '评分分布、收藏统计、制作人员、角色、相关条目'],
  ['吐槽箱', '角色页嵌入式展示，番剧/人物页独立子页面'],
  ['讨论版', '番剧讨论帖列表 + 帖子详情'],
  ['人物/角色详情', '完整信息展示、参与作品、声优/关联人物、吐槽箱']
]
const specialFeatures = [
  ['豆瓣评分', '一站式查看多平台信息，不用多头跑'],
  ['相关音乐', '一键跳转该番剧/游戏有关的音乐，不用到处找'],
  ['萌娘百科', '链接萌娘百科，查看更全的番剧简介'],
  ['在线观看', '链接第三方番剧在线观看网站，一键跳转在线观看']
]

export default function AboutContent() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-base-content">Bangmio</h1>
      <p className="text-sm text-base-content/50 mb-2">
        Bangumi (bgm.tv) 第三方客户端。支持 OAuth
        登录、动画浏览与搜索、收藏管理、吐槽箱与讨论版查看。
      </p>
      <a
        href="https://bangmio.site"
        target="_blank"
        rel="noreferrer"
        className="text-sm text-primary hover:underline mb-8 block"
      >
        在线体验：https://bangmio.site
      </a>
      <div className="space-y-6 text-sm leading-relaxed text-base-content/80">
        <section>
          <h2 className="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-primary" />
            关于
          </h2>
          <p className="mb-2">
            <em>半个作者的碎碎念(还有半个是AI)</em>
          </p>
          <p className="mb-3">
            <strong>这是一个高中生好玩做的 VibeCoding 项目</strong>，主要是用 DeepSeek V4 Pro 和
            MiMo-V2.5-Pro 做的，用了快 2亿 tokens，要不是 <strong>Deepseek</strong>{' '}
            便宜根本负担不起......
          </p>
          <p>
            本项目使用了{' '}
            <a href="https://bgm.tv" target="_blank" rel="noreferrer" className="link link-primary">
              Bangumi
            </a>{' '}
            的 API，前端使用 Next.js App Router 复刻原 Vue 3 + Vite 版本，后端继续通过 Cloudflare
            边缘节点代理 Bangumi 数据。
          </p>
        </section>
        <div className="border-t border-base-300/30" />
        <section>
          <h2 className="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-secondary" />
            原版功能（均为 Bangumi 原版提供）
          </h2>
          <ul className="space-y-1.5 ml-1">
            {originalFeatures.map(([title, text]) => (
              <li className="flex items-start gap-2" key={title}>
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>{title}</strong> — {text}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="border-t border-base-300/30" />
        <section>
          <h2 className="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-accent" />
            特色功能（自己做的新功能）
          </h2>
          <ul className="space-y-1.5 ml-1">
            {specialFeatures.map(([title, text]) => (
              <li className="flex items-start gap-2" key={title}>
                <span className="text-primary mt-0.5">•</span>
                <span>
                  <strong>{title}</strong> — {text}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="border-t border-base-300/30" />
        <section>
          <h2 className="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-info" />
            技术栈
          </h2>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="text-base-content/50">层</th>
                  <th className="text-base-content/50">技术</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>前端</td>
                  <td>Next.js + React + TailwindCSS + DaisyUI</td>
                </tr>
                <tr>
                  <td>后端</td>
                  <td>Hono（Cloudflare Workers）</td>
                </tr>
                <tr>
                  <td>API</td>
                  <td>代理 Bangumi API v0 + 网页抓取</td>
                </tr>
                <tr>
                  <td>部署</td>
                  <td>Cloudflare Workers / OpenNext</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <div className="border-t border-base-300/30" />
        <section>
          <h2 className="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-warning" />
            相关链接
          </h2>
          <div className="space-y-2">
            <a
              href="https://bangmio.site"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <span>🌐</span>网站：https://bangmio.site
            </a>
            <a
              href="https://github.com/sparkmio/Bangmio"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <span>⌘</span>GitHub：sparkmio/Bangmio
            </a>
            <a
              href="https://bgm.tv/user/acgpzh"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <span>◎</span>作者 Bangumi 主页：acgpzh
            </a>
          </div>
        </section>
      </div>
      <Link href="/" className="inline-block mt-8 text-sm text-primary hover-underline-wipe">
        ← 返回首页
      </Link>
    </div>
  )
}
