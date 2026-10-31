'use client'

const sections = [
  {
    id: 'data-sources',
    title: '数据来源',
    content: (
      <p>
        Bangmio 是 Bangumi（bgm.tv）的非官方第三方客户端。番剧、人物、角色、小组及讨论等内容主要来自{' '}
        <a href="https://bgm.tv" target="_blank" rel="noreferrer" className="link link-primary">
          Bangumi
        </a>{' '}
        API 或公开页面；部分扩展信息由相应第三方提供。数据版权及其准确性归原来源所有。
      </p>
    )
  },
  {
    id: 'privacy',
    title: '隐私说明',
    content: (
      <>
        <p>
          注册 Bangmio 账号时会处理邮箱、密码哈希和账号资料；绑定 Bangumi 后，Bangumi 用户 ID
          与加密后的授权凭证保存在服务端数据库中。Bangumi OAuth 会话通过 HttpOnly Cookie
          传递，Bangmio 账号会话令牌及账号资料保存在当前浏览器的 localStorage。
        </p>
        <p>
          主题、动效等界面偏好、AI 对话记录和讨论草稿会保存在当前浏览器的
          localStorage；清除浏览器站点数据可删除这些本地记录。
          你主动提交的收藏、评分、评论或讨论会发送到 Bangumi。
        </p>
        <p>
          Bangumi 请求由 Cloudflare Workers 代理和托管。使用 AI 助手时，你发送的问题会提交给智谱
          AI；只有启用“附带当前公开条目内容”后，才会同时发送相应的公开页面上下文，不会自动发送收藏盒。
        </p>
        <p>
          完整说明见{' '}
          <a href="/privacy" className="link link-primary">
            隐私说明
          </a>
          。
        </p>
      </>
    )
  },
  {
    id: 'contact',
    title: '联系方式',
    content: (
      <p>
        暂无独立联系方式（待补充）。目前可通过下方 GitHub 项目或作者 Bangumi
        主页了解项目与反馈问题。
      </p>
    )
  }
]

export default function AboutContent() {
  return (
    <main className="mx-auto max-w-3xl pb-8" aria-labelledby="about-title">
      <header className="pb-6">
        <p className="mb-2 text-xs font-semibold uppercase text-primary">BANGMIO</p>
        <h1 id="about-title" className="mb-3 text-3xl font-bold text-base-content">
          关于 Bangmio
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-base-content/70">
          Bangmio 是一个用于发现、浏览和记录番剧的 Bangumi 第三方客户端，基于 Next.js、React 与 Hono
          构建，部署在 Cloudflare Workers。
        </p>
        <a
          href="https://bangmio.site"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          在线体验：bangmio.site
        </a>
      </header>

      <div className="divide-y divide-base-300/50 border-y border-base-300/50">
        {sections.map(section => (
          <section key={section.id} className="py-5" aria-labelledby={`${section.id}-heading`}>
            <h2
              id={`${section.id}-heading`}
              className="mb-3 text-lg font-semibold text-base-content"
            >
              {section.title}
            </h2>
            <div className="space-y-3 text-sm leading-7 text-base-content/75">
              {section.content}
            </div>
          </section>
        ))}
      </div>

      <section className="py-5" aria-labelledby="about-links-heading">
        <h2 id="about-links-heading" className="mb-3 text-lg font-semibold text-base-content">
          项目与作者
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            GitHub：{' '}
            <a
              href="https://github.com/sparkmio/Bangmio"
              target="_blank"
              rel="noreferrer"
              className="link link-primary"
            >
              sparkmio/Bangmio
            </a>
          </li>
          <li>
            作者 Bangumi 主页：{' '}
            <a
              href="https://bgm.tv/user/acgpzh"
              target="_blank"
              rel="noreferrer"
              className="link link-primary"
            >
              acgpzh
            </a>
          </li>
        </ul>
      </section>
    </main>
  )
}
