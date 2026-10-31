import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '隐私说明',
  description: 'Bangmio 对账号数据、本地存储、Bangumi 与第三方服务的说明。'
}

const sections: Array<[string, string[]]> = [
  [
    '处理的数据',
    [
      '注册 Bangmio 账号时，服务端处理邮箱、密码哈希和账号资料。绑定 Bangumi 后，服务端保存 Bangumi 用户 ID 与加密后的授权凭证；授权访问使用 HttpOnly Cookie。',
      '你的收藏、评分、评论和讨论等操作会按你的请求提交给 Bangumi。Bangmio 不会把这些内容自动发送给 AI 助手。'
    ]
  ],
  [
    '浏览器本地存储',
    [
      'Bangmio 账号会话令牌及账号资料保存在当前浏览器的 localStorage。主题、动效和玻璃效果偏好、AI 对话记录及讨论草稿也保存在 localStorage；这些数据留在该浏览器中，清除本站点数据可将其删除。'
    ]
  ],
  [
    '数据来源与服务提供方',
    [
      'Bangumi 是条目、用户公开资料、小组和讨论等主要数据来源。本站通过 Cloudflare Workers 托管并代理相关请求；Cloudflare 会按其服务运行需要处理网络请求元数据。',
      '使用 AI 助手时，你主动发送的问题会交由智谱 AI 处理。只有启用“附带当前公开条目内容”时，才会同时发送相应的公开页面上下文；账号凭证和收藏盒不会自动发送。',
      '页面中的其他外部链接和资源由对应第三方提供，打开后适用其自身的隐私说明。'
    ]
  ],
  [
    '账号安全与联系',
    [
      '请勿在公共设备保存登录状态，也不要向任何人分享账号凭证。当前暂无独立联系方式（待补充）；项目问题可通过 GitHub 仓库反馈。'
    ]
  ]
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl pb-8" aria-labelledby="privacy-title">
      <header className="pb-6">
        <h1 id="privacy-title" className="mb-2 text-3xl font-bold text-base-content">
          隐私说明
        </h1>
        <p className="text-sm leading-7 text-base-content/60">
          说明 Bangmio 使用的数据、浏览器存储位置以及涉及的第三方服务。
        </p>
      </header>
      <div className="divide-y divide-base-300/50 border-y border-base-300/50">
        {sections.map(([title, paragraphs]) => (
          <section key={title} className="py-5">
            <h2 className="mb-3 text-lg font-semibold text-base-content">{title}</h2>
            <div className="space-y-3 text-sm leading-7 text-base-content/75">
              {paragraphs.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-6 text-sm">
        <Link href="/about" className="text-primary hover:underline">
          ← 返回关于页面
        </Link>
      </p>
    </main>
  )
}
