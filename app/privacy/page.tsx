import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '隐私说明',
  description: 'Bangmio 的数据来源、登录信息与 AI 助手隐私说明。'
}

const sections: Array<[string, string[]]> = [
  [
    '数据来源',
    [
      'Bangmio 是 Bangumi（bgm.tv）的第三方客户端，番剧、角色、人物与小组等资料主要来自 Bangumi API，部分封面与条目信息会经本站服务代理获取。',
      '豆瓣、Bilibili、萌娘百科等外部链接由第三方网站提供，打开这些链接后适用对方的隐私政策。'
    ]
  ],
  [
    '登录与本地存储',
    [
      '通过 Bangumi OAuth 登录时，授权由 Bangumi 官方页面完成；登录状态信息保存在你当前浏览器的本地存储中，用于保持登录和同步收藏。',
      '请不要在公共或他人设备上使用手动粘贴 Access Token 的方式登录；使用完毕后请退出登录，并妥善保管自己的 Token，不要分享给任何人。'
    ]
  ],
  [
    'AI 助手',
    [
      'AI 助手默认不会把当前页面内容发送给第三方；只有当你在对话中主动开启页面上下文时，才会把当前作品页的公开资料一并发送用于回答。',
      '请不要在 AI 对话中输入账号 Token、密码等敏感信息。'
    ]
  ],
  [
    '联系我们',
    ['如对以上说明有疑问，或想反馈数据与隐私相关问题，可以通过关于页面提供的渠道联系作者。']
  ]
]

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-base-content">隐私说明</h1>
      <p className="text-sm text-base-content/50 mb-8">
        这页说明 Bangmio 会用到哪些数据、它们来自哪里，以及使用时需要注意什么。
      </p>
      <div className="space-y-6 text-sm leading-relaxed text-base-content/80">
        {sections.map(([title, paragraphs]) => (
          <section key={title}>
            <h2 className="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-primary" />
              {title}
            </h2>
            {paragraphs.map(paragraph => (
              <p key={paragraph} className="mb-2">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm">
        <Link href="/about" className="text-primary hover:underline">
          ← 返回关于页面
        </Link>
      </p>
    </div>
  )
}
